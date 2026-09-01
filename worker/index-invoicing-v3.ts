import core from './index-workflow-v2';

interface Env {
  DB: D1Database;
  SUPER_ADMIN_EMAIL: string;
  ADMIN_PASSWORD_SALT: string;
  ADMIN_PASSWORD_HASH: string;
  ALLOWED_ORIGINS?: string;
}

type Role = 'super_admin' | 'admin' | 'sales' | 'project_manager' | 'finance' | 'content';
type Identity = { id:number; name:string; email:string; role:Role; active:number };

type InvoiceItemInput = {
  service_id?: number | null;
  description?: string;
  quantity?: number;
  unit_price?: number;
};

type InvoicePayload = {
  client_id?: number;
  invoice_no?: string;
  status?: string;
  currency?: string;
  due_date?: string | null;
  notes?: string | null;
  discount_type?: 'none' | 'percent' | 'fixed';
  discount_value?: number;
  items?: InvoiceItemInput[];
};

const SESSION_COOKIE = 'idealab_admin_session';
const BILLING_ROLES = new Set<Role>(['super_admin','admin','finance']);
const INVOICE_STATUSES = new Set(['draft','sent','due','paid','void']);
let schemaReady = false;

function json(data:unknown,status=200){
  return new Response(JSON.stringify(data),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store, max-age=0',
    'x-content-type-options':'nosniff',
    'x-frame-options':'DENY',
    'referrer-policy':'no-referrer',
  }});
}

function cookieValue(req:Request,name:string){
  const raw=req.headers.get('cookie')||'';
  for(const part of raw.split(';')){
    const [key,...rest]=part.trim().split('=');
    if(key===name)return decodeURIComponent(rest.join('='));
  }
  return null;
}

function bytesToHex(bytes:Uint8Array){return Array.from(bytes,v=>v.toString(16).padStart(2,'0')).join('')}
async function sha256Hex(value:string){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return bytesToHex(new Uint8Array(digest))}

async function identity(req:Request,env:Env):Promise<Identity>{
  const token=cookieValue(req,SESSION_COOKIE);
  if(!token)throw new Error('auth');
  const sessionHash=await sha256Hex(token);
  const row=await env.DB.prepare(`SELECT u.id,u.name,u.email,u.role,u.active,s.expires_at
    FROM admin_sessions s JOIN users u ON u.id=s.user_id
    WHERE s.session_hash=? LIMIT 1`).bind(sessionHash).first<any>();
  if(!row||!row.active||Number(row.expires_at)<=Math.floor(Date.now()/1000))throw new Error('auth');
  return {id:Number(row.id),name:String(row.name),email:String(row.email),role:row.role as Role,active:Number(row.active)};
}

function requireWriteOrigin(req:Request){
  const url=new URL(req.url);
  const origin=req.headers.get('origin');
  if(!origin||origin!==url.origin)throw new Error('origin');
  if(req.headers.get('x-requested-with')!=='idealab-admin')throw new Error('csrf');
  if(!(req.headers.get('content-type')||'').toLowerCase().startsWith('application/json'))throw new Error('json');
}

async function ensureSchema(env:Env){
  if(schemaReady)return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    unit_price REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    service_id INTEGER,
    description TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY(service_id) REFERENCES services(id)
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_services_active ON services(active)').run();

  const info=await env.DB.prepare('PRAGMA table_info(invoices)').all<{name:string}>();
  const columns=new Set((info.results||[]).map(r=>String(r.name)));
  if(!columns.has('subtotal'))await env.DB.prepare('ALTER TABLE invoices ADD COLUMN subtotal REAL NOT NULL DEFAULT 0').run();
  if(!columns.has('discount_type'))await env.DB.prepare("ALTER TABLE invoices ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'none'").run();
  if(!columns.has('discount_value'))await env.DB.prepare('ALTER TABLE invoices ADD COLUMN discount_value REAL NOT NULL DEFAULT 0').run();
  if(!columns.has('discount_amount'))await env.DB.prepare('ALTER TABLE invoices ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0').run();
  schemaReady=true;
}

function text(value:unknown,max=5000){
  if(value===null||value===undefined)return null;
  const v=String(value).trim();
  if(v.length>max)throw new Error('validation');
  return v||null;
}
function positive(value:unknown,allowZero=false){
  const n=Number(value);
  if(!Number.isFinite(n)||(allowZero?n<0:n<=0))throw new Error('validation');
  return n;
}
function currency(value:unknown){
  const v=String(value||'USD').trim().toUpperCase();
  if(!/^[A-Z]{3}$/.test(v))throw new Error('validation');
  return v;
}

async function audit(env:Env,user:Identity,action:string,entityType:string,entityId?:number,detail?:string){
  try{await env.DB.prepare('INSERT INTO activities(entity_type,entity_id,action,detail,user_id) VALUES(?,?,?,?,?)').bind(entityType,entityId??null,action,detail?.slice(0,1000)??null,user.id).run()}catch{/* non-blocking */}
}

async function handleServices(req:Request,env:Env,user:Identity){
  if(!BILLING_ROLES.has(user.role))return json({error:'Finance access required'},403);
  const parts=new URL(req.url).pathname.split('/').filter(Boolean);
  if(req.method==='GET'){
    return json(await env.DB.prepare('SELECT id,name,description,unit_price,currency,active,created_at,updated_at FROM services ORDER BY active DESC,name ASC').all());
  }
  try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}
  let body:any;try{body=await req.json()}catch{return json({error:'Invalid JSON'},400)}
  if(req.method==='POST'){
    const name=text(body.name,140); if(!name)return json({error:'Service name is required'},400);
    let price:number;try{price=positive(body.unit_price,true)}catch{return json({error:'Price must be 0 or more'},400)}
    const code=currency(body.currency);
    const result=await env.DB.prepare('INSERT INTO services(name,description,unit_price,currency,active) VALUES(?,?,?,?,?)')
      .bind(name,text(body.description,2000),price,code,body.active===false?0:1).run();
    const id=Number(result.meta.last_row_id); await audit(env,user,'service.created','service',id,name);
    return json({ok:true,id},201);
  }
  if(req.method==='PATCH'&&parts[2]){
    const id=Number(parts[2]); if(!Number.isInteger(id)||id<=0)return json({error:'Invalid service'},400);
    const current=await env.DB.prepare('SELECT * FROM services WHERE id=?').bind(id).first<any>(); if(!current)return json({error:'Service not found'},404);
    const name=body.name===undefined?current.name:text(body.name,140); if(!name)return json({error:'Service name is required'},400);
    let price=Number(current.unit_price); if(body.unit_price!==undefined){try{price=positive(body.unit_price,true)}catch{return json({error:'Price must be 0 or more'},400)}}
    const code=body.currency===undefined?String(current.currency):currency(body.currency);
    const active=body.active===undefined?Number(current.active):(body.active?1:0);
    await env.DB.prepare('UPDATE services SET name=?,description=?,unit_price=?,currency=?,active=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .bind(name,body.description===undefined?current.description:text(body.description,2000),price,code,active,id).run();
    await audit(env,user,'service.updated','service',id,String(name));
    return json({ok:true});
  }
  return json({error:'Method not allowed'},405);
}

function normalizeInvoice(body:InvoicePayload){
  const clientId=Number(body.client_id);
  if(!Number.isInteger(clientId)||clientId<=0)throw new Error('client');
  const invoiceNo=text(body.invoice_no,80); if(!invoiceNo)throw new Error('invoice');
  const status=String(body.status||'draft'); if(!INVOICE_STATUSES.has(status))throw new Error('status');
  const code=currency(body.currency);
  const rawItems=Array.isArray(body.items)?body.items:[];
  if(!rawItems.length||rawItems.length>50)throw new Error('items');
  const items=rawItems.map((raw,index)=>{
    const description=text(raw.description,500); if(!description)throw new Error('item-description');
    const quantity=positive(raw.quantity??1);
    const unitPrice=positive(raw.unit_price??0,true);
    return {service_id:raw.service_id?Number(raw.service_id):null,description,quantity,unit_price:unitPrice,line_total:Math.round(quantity*unitPrice*100)/100,sort_order:index};
  });
  const subtotal=Math.round(items.reduce((sum,item)=>sum+item.line_total,0)*100)/100;
  const discountType=(body.discount_type||'none') as 'none'|'percent'|'fixed';
  if(!['none','percent','fixed'].includes(discountType))throw new Error('discount');
  let discountValue=Number(body.discount_value||0); if(!Number.isFinite(discountValue)||discountValue<0)throw new Error('discount');
  if(discountType==='percent'&&discountValue>100)throw new Error('discount');
  let discountAmount=discountType==='percent'?subtotal*(discountValue/100):discountType==='fixed'?discountValue:0;
  discountAmount=Math.min(subtotal,Math.max(0,discountAmount));
  discountAmount=Math.round(discountAmount*100)/100;
  const total=Math.round(Math.max(0,subtotal-discountAmount)*100)/100;
  return {clientId,invoiceNo,status,code,dueDate:text(body.due_date,40),notes:text(body.notes,5000),items,subtotal,discountType,discountValue,discountAmount,total};
}

async function handleInvoiceBuilder(req:Request,env:Env,user:Identity){
  if(!BILLING_ROLES.has(user.role))return json({error:'Finance access required'},403);
  try{requireWriteOrigin(req)}catch{return json({error:'Invalid request'},403)}
  let body:InvoicePayload;try{body=await req.json() as InvoicePayload}catch{return json({error:'Invalid JSON'},400)}
  let invoice;try{invoice=normalizeInvoice(body)}catch(error){
    const key=error instanceof Error?error.message:'validation';
    const messages:Record<string,string>={client:'Select a client',invoice:'Invoice number is required',status:'Invalid invoice status',items:'Add at least one service or line item (maximum 50)',discount:'Invalid discount',currency:'Invalid currency','item-description':'Each line needs a description'};
    return json({error:messages[key]||'Check the invoice details'},400);
  }
  const parts=new URL(req.url).pathname.split('/').filter(Boolean);
  const paidAt=invoice.status==='paid'?new Date().toISOString():null;
  if(req.method==='POST'){
    try{
      const result=await env.DB.prepare(`INSERT INTO invoices(client_id,invoice_no,status,amount,currency,due_date,paid_at,notes,subtotal,discount_type,discount_value,discount_amount)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`).bind(invoice.clientId,invoice.invoiceNo,invoice.status,invoice.total,invoice.code,invoice.dueDate,paidAt,invoice.notes,invoice.subtotal,invoice.discountType,invoice.discountValue,invoice.discountAmount).run();
      const id=Number(result.meta.last_row_id);
      await env.DB.batch(invoice.items.map(item=>env.DB.prepare('INSERT INTO invoice_items(invoice_id,service_id,description,quantity,unit_price,line_total,sort_order) VALUES(?,?,?,?,?,?,?)')
        .bind(id,item.service_id,item.description,item.quantity,item.unit_price,item.line_total,item.sort_order)));
      await audit(env,user,'invoice.created','invoice',id,`${invoice.invoiceNo} / ${invoice.code} ${invoice.total}`);
      return json({ok:true,id,total:invoice.total},201);
    }catch(error){
      const message=error instanceof Error?error.message:'';
      return json({error:message.toLowerCase().includes('unique')?'Invoice number already exists':'Unable to save invoice'},message.toLowerCase().includes('unique')?409:500);
    }
  }
  if(req.method==='PATCH'&&parts[2]){
    const id=Number(parts[2]); if(!Number.isInteger(id)||id<=0)return json({error:'Invalid invoice'},400);
    const existing=await env.DB.prepare('SELECT id,paid_at FROM invoices WHERE id=?').bind(id).first<any>(); if(!existing)return json({error:'Invoice not found'},404);
    const nextPaidAt=invoice.status==='paid'?(existing.paid_at||paidAt):null;
    try{
      await env.DB.prepare(`UPDATE invoices SET client_id=?,invoice_no=?,status=?,amount=?,currency=?,due_date=?,paid_at=?,notes=?,subtotal=?,discount_type=?,discount_value=?,discount_amount=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
        .bind(invoice.clientId,invoice.invoiceNo,invoice.status,invoice.total,invoice.code,invoice.dueDate,nextPaidAt,invoice.notes,invoice.subtotal,invoice.discountType,invoice.discountValue,invoice.discountAmount,id).run();
      await env.DB.prepare('DELETE FROM invoice_items WHERE invoice_id=?').bind(id).run();
      await env.DB.batch(invoice.items.map(item=>env.DB.prepare('INSERT INTO invoice_items(invoice_id,service_id,description,quantity,unit_price,line_total,sort_order) VALUES(?,?,?,?,?,?,?)')
        .bind(id,item.service_id,item.description,item.quantity,item.unit_price,item.line_total,item.sort_order)));
      await audit(env,user,'invoice.updated','invoice',id,`${invoice.invoiceNo} / ${invoice.code} ${invoice.total}`);
      return json({ok:true,id,total:invoice.total});
    }catch(error){
      const message=error instanceof Error?error.message:'';
      return json({error:message.toLowerCase().includes('unique')?'Invoice number already exists':'Unable to update invoice'},message.toLowerCase().includes('unique')?409:500);
    }
  }
  return json({error:'Method not allowed'},405);
}

async function handleInvoiceDetail(req:Request,env:Env,user:Identity,id:number){
  if(!BILLING_ROLES.has(user.role))return json({error:'Finance access required'},403);
  const invoice=await env.DB.prepare(`SELECT i.*,c.name client_name,c.company client_company,c.email client_email,c.phone client_phone,c.country client_country
    FROM invoices i LEFT JOIN clients c ON c.id=i.client_id WHERE i.id=? LIMIT 1`).bind(id).first<any>();
  if(!invoice)return json({error:'Invoice not found'},404);
  const items=await env.DB.prepare('SELECT id,invoice_id,service_id,description,quantity,unit_price,line_total,sort_order FROM invoice_items WHERE invoice_id=? ORDER BY sort_order,id').bind(id).all();
  if(!(items.results||[]).length){
    items.results=[{id:0,invoice_id:id,service_id:null,description:'Professional services',quantity:1,unit_price:Number(invoice.amount||0),line_total:Number(invoice.amount||0),sort_order:0}] as any;
    if(!Number(invoice.subtotal))invoice.subtotal=Number(invoice.amount||0);
  }
  return json({invoice,items:items.results||[]});
}

export default {
  async fetch(req:Request,env:Env):Promise<Response>{
    const url=new URL(req.url);
    const path=url.pathname;
    const billingPath=path==='/api/services'||path.startsWith('/api/services/')||path.startsWith('/api/invoices/');
    if(billingPath||path==='/api/invoices')await ensureSchema(env);

    if(path==='/api/services'||path.startsWith('/api/services/')){
      let user:Identity;try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
      return handleServices(req,env,user);
    }

    const detailMatch=/^\/api\/invoices\/(\d+)\/detail$/.exec(path);
    if(detailMatch&&req.method==='GET'){
      let user:Identity;try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
      return handleInvoiceDetail(req,env,user,Number(detailMatch[1]));
    }

    if((req.method==='POST'&&path==='/api/invoices')||(req.method==='PATCH'&&/^\/api\/invoices\/\d+$/.test(path))){
      let hasItems=false;
      try{const body=await req.clone().json() as any;hasItems=Array.isArray(body?.items)}catch{/* let legacy handler decide */}
      if(hasItems){
        let user:Identity;try{user=await identity(req,env)}catch{return json({error:'Sign in required'},401)}
        return handleInvoiceBuilder(req,env,user);
      }
    }

    return core.fetch(req,env);
  }
} satisfies ExportedHandler<Env>;
