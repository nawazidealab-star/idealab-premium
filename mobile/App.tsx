import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  api,
  AppUser,
  Client,
  CURRENCIES,
  CurrencyCode,
  DEFAULT_API_BASE_URL,
  Dashboard,
  getDefaultCurrency,
  Invoice,
  Lead,
  login,
  logout,
  Project,
  setDefaultCurrency,
  Task,
} from './src/api';

type Tab = 'Home' | 'Leads' | 'Clients' | 'Projects' | 'Tasks' | 'Invoices';
const tabs: Tab[] = ['Home', 'Leads', 'Clients', 'Projects', 'Tasks', 'Invoices'];

const money = (value = 0, currency = 'USD') => {
  try { return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value || 0)); }
  catch { return `${currency} ${Number(value || 0).toLocaleString()}`; }
};
const when = (value?: string | null) => value ? new Date(value).toLocaleDateString() : '—';
const text = (value: unknown) => value === null || value === undefined ? '' : String(value);

export default function App() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>('Home');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  useEffect(() => {
    Promise.all([api.me().catch(() => null), getDefaultCurrency()])
      .then(([me, saved]) => { if (me) setUser(me.user); setCurrency(saved); })
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <Centered dark><ActivityIndicator size="large" color="#ef3b3b" /><Text style={styles.muted}>Opening IDEA LAB…</Text></Centered>;
  if (!user) return <Login onDone={setUser} />;

  const doLogout = async () => { await logout(); setUser(null); setTab('Home'); };
  const changeCurrency = async (code: CurrencyCode) => { await setDefaultCurrency(code); setCurrency(code); };

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View><Text style={styles.kicker}>IDEA LAB / MOBILE</Text><Text style={styles.title}>{tab}</Text></View>
        <Image source={{ uri: `${DEFAULT_API_BASE_URL}/idealab-logo.jpg` }} style={styles.headerLogo} />
      </View>
      <View style={styles.body}><Screen tab={tab} user={user} currency={currency} onCurrency={changeCurrency} onLogout={doLogout} /></View>
      <View style={styles.tabs}>
        {tabs.map(item => <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'Home' ? '⌂' : item.slice(0, 2)}</Text><Text style={[styles.tabLabel, tab === item && styles.tabTextActive]}>{item}</Text></Pressable>)}
      </View>
    </SafeAreaView>
  );
}

function Login({ onDone }: { onDone: (user: AppUser) => void }) {
  const [email, setEmail] = useState('nawazidealab@gmail.com');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => { setBusy(true); setError(''); try { onDone(await login(email, password)); } catch (err) { setError(err instanceof Error ? err.message : 'Unable to sign in'); } finally { setBusy(false); } };
  return <SafeAreaView style={styles.login}><StatusBar style="light"/><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.loginInner}>
    <Image source={{ uri: `${DEFAULT_API_BASE_URL}/idealab-logo.jpg` }} style={styles.logoImage}/>
    <Text style={styles.loginTitle}>IDEA LAB Admin</Text><Text style={styles.loginSub}>Secure access to your live CRM.</Text>
    <Text style={styles.fieldLabel}>Email</Text><TextInput autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} style={styles.input}/>
    <Text style={styles.fieldLabel}>Password</Text><TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#6f7480" style={styles.input}/>
    {!!error && <Text style={styles.error}>{error}</Text>}
    <Pressable disabled={busy} onPress={submit} style={[styles.primary, busy && styles.disabled]}>{busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.primaryText}>Sign in</Text>}</Pressable>
  </KeyboardAvoidingView></SafeAreaView>;
}

function Screen({ tab, user, currency, onCurrency, onLogout }: { tab:Tab; user:AppUser; currency:CurrencyCode; onCurrency:(c:CurrencyCode)=>Promise<void>; onLogout:()=>Promise<void> }) {
  if (tab === 'Home') return <Home user={user} currency={currency} onCurrency={onCurrency} onLogout={onLogout}/>;
  if (tab === 'Leads') return <Leads currency={currency}/>;
  if (tab === 'Clients') return <Clients/>;
  if (tab === 'Projects') return <Projects currency={currency}/>;
  if (tab === 'Tasks') return <Tasks/>;
  return <Invoices currency={currency}/>;
}

function Home({ user, currency, onCurrency, onLogout }: { user:AppUser; currency:CurrencyCode; onCurrency:(c:CurrencyCode)=>Promise<void>; onLogout:()=>Promise<void> }) {
  const [data,setData]=useState<Dashboard|null>(null); const [error,setError]=useState(''); const [refreshing,setRefreshing]=useState(false);
  const load=useCallback(async()=>{try{setData(await api.dashboard());setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load dashboard')}},[]);
  useEffect(()=>{void load()},[load]);
  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async()=>{setRefreshing(true);await load();setRefreshing(false)}}/>} contentContainerStyle={styles.scroll}>
    <View style={styles.hero}><Text style={styles.kickerRed}>COMMAND CENTER</Text><Text style={styles.heroTitle}>Welcome, {user.name.split(' ')[0]}.</Text><Text style={styles.heroSub}>Live IDEA LAB operations from Cloudflare D1.</Text></View>
    {!!error && <Text style={styles.error}>{error}</Text>}
    {data && <View style={styles.stats}><Stat label="Leads" value={String(data.leads)}/><Stat label="Clients" value={String(data.clients)}/><Stat label="Projects" value={String(data.projects)}/><Stat label="Revenue" value={money(data.revenue)}/></View>}
    <View style={styles.panel}><Text style={styles.panelTitle}>Default currency</Text><Text style={styles.panelHint}>Used automatically when you create new leads, projects and invoices.</Text><View style={styles.chips}>{CURRENCIES.map(c=><Pressable key={c} onPress={()=>void onCurrency(c)} style={[styles.chip,currency===c&&styles.chipActive]}><Text style={[styles.chipText,currency===c&&styles.chipTextActive]}>{c}</Text></Pressable>)}</View></View>
    <Pressable style={styles.logout} onPress={()=>void onLogout()}><Text style={styles.logoutText}>Sign out</Text></Pressable>
  </ScrollView>;
}

function Stat({label,value}:{label:string;value:string}){return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>}

type Field = { key:string; label:string; type?:'text'|'number'|'date'|'datetime'; required?:boolean; options?:Array<{label:string;value:string}>; wide?:boolean };
function EntityModal({visible,title,fields,initial,onClose,onSave}:{visible:boolean;title:string;fields:Field[];initial:Record<string,string>;onClose:()=>void;onSave:(v:Record<string,string>)=>Promise<void>}){
  const [form,setForm]=useState(initial); const [saving,setSaving]=useState(false); const [error,setError]=useState('');
  useEffect(()=>{if(visible){setForm(initial);setError('')}},[visible,initial]);
  const save=async()=>{for(const f of fields){if(f.required&&!form[f.key]?.trim()){setError(`${f.label} is required`);return}}setSaving(true);setError('');try{await onSave(form);onClose()}catch(e){setError(e instanceof Error?e.message:'Unable to save')}finally{setSaving(false)}};
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}><View style={styles.modalBackdrop}><KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={styles.modalCard}><View style={styles.modalHead}><Text style={styles.modalTitle}>{title}</Text><Pressable onPress={onClose}><Text style={styles.close}>✕</Text></Pressable></View><ScrollView contentContainerStyle={styles.form}>
    {fields.map(f=><View key={f.key}><Text style={styles.fieldLabel}>{f.label}</Text>{f.options?<View style={styles.optionGrid}>{f.options.map(o=><Pressable key={o.value} onPress={()=>setForm({...form,[f.key]:o.value})} style={[styles.option,form[f.key]===o.value&&styles.optionActive]}><Text style={[styles.optionText,form[f.key]===o.value&&styles.optionTextActive]}>{o.label}</Text></Pressable>)}</View>:<TextInput value={form[f.key]||''} onChangeText={v=>setForm({...form,[f.key]:v})} keyboardType={f.type==='number'?'decimal-pad':'default'} style={styles.input}/>}</View>)}
    {!!error&&<Text style={styles.error}>{error}</Text>}<Pressable disabled={saving} onPress={save} style={[styles.primary,saving&&styles.disabled]}>{saving?<ActivityIndicator color="#fff"/>:<Text style={styles.primaryText}>Save</Text>}</Pressable>
  </ScrollView></KeyboardAvoidingView></View></Modal>
}

function ListShell<T extends {id:number}>({rows,loading,error,refreshing,onRefresh,onAdd,render}:{rows:T[];loading:boolean;error:string;refreshing:boolean;onRefresh:()=>Promise<void>;onAdd:()=>void;render:(x:T)=>React.ReactNode}){
  if(loading)return <Centered><ActivityIndicator color="#ef3b3b"/></Centered>;
  return <View style={{flex:1}}><View style={styles.listToolbar}><Pressable onPress={onAdd} style={styles.addBtn}><Text style={styles.addBtnText}>＋ Add new</Text></Pressable></View>{!!error&&<Text style={[styles.error,{marginHorizontal:14}]}>{error}</Text>}<FlatList data={rows} keyExtractor={x=>String(x.id)} renderItem={({item})=><>{render(item)}</>} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={()=>void onRefresh()}/>} ListEmptyComponent={<Text style={styles.muted}>No records yet.</Text>}/></View>
}
function Card({title,meta,detail,onEdit}:{title:string;meta:string;detail:string;onEdit:()=>void}){return <Pressable onPress={onEdit} style={styles.card}><View style={{flex:1}}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardMeta}>{meta}</Text><Text style={styles.cardDetail}>{detail}</Text></View><Text style={styles.edit}>Edit</Text></Pressable>}
function useList<T>(loader:()=>Promise<{results:T[]}>){const[rows,setRows]=useState<T[]>([]);const[loading,setLoading]=useState(true);const[refreshing,setRefreshing]=useState(false);const[error,setError]=useState('');const load=useCallback(async()=>{try{setRows((await loader()).results||[]);setError('')}catch(e){setError(e instanceof Error?e.message:'Unable to load')}finally{setLoading(false)}},[loader]);useEffect(()=>{void load()},[load]);const refresh=async()=>{setRefreshing(true);await load();setRefreshing(false)};return{rows,loading,refreshing,error,load,refresh}}
const statusOpts=(values:string[])=>values.map(v=>({label:v.replaceAll('_',' '),value:v}));
const currencyOpts=CURRENCIES.map(c=>({label:c,value:c}));

function Leads({currency}:{currency:CurrencyCode}){const data=useList<Lead>(api.leads);const[editing,setEditing]=useState<Lead|null>(null);const[open,setOpen]=useState(false);const fields:Field[]=[{key:'name',label:'Name',required:true},{key:'company',label:'Company'},{key:'email',label:'Email'},{key:'phone',label:'Phone'},{key:'service',label:'Service'},{key:'source',label:'Source'},{key:'status',label:'Status',options:statusOpts(['new','contacted','qualified','proposal','warm','follow_up','won','lost'])},{key:'value',label:'Value',type:'number'},{key:'currency',label:'Currency',options:currencyOpts},{key:'next_action',label:'Next action'},{key:'notes',label:'Notes'}];const initial=useMemo(()=>editing?{name:text(editing.name),company:text(editing.company),email:text(editing.email),phone:text(editing.phone),service:text(editing.service),source:text(editing.source),status:text(editing.status),value:text(editing.value),currency:text(editing.currency||currency),next_action:text(editing.next_action),notes:text(editing.notes)}:{name:'',company:'',email:'',phone:'',service:'',source:'',status:'new',value:'',currency,next_action:'',notes:''},[editing,currency]);const save=async(f:Record<string,string>)=>{const p={...f,value:Number(f.value||0)};editing?await api.updateLead(editing.id,p):await api.createLead(p);await data.load()};return <><ListShell {...data} onRefresh={data.refresh} onAdd={()=>{setEditing(null);setOpen(true)}} render={r=><Card title={r.name} meta={[r.company,r.service,r.status].filter(Boolean).join(' · ')} detail={`${r.currency||currency} ${r.value||0} · ${r.next_action||r.email||r.phone||'No next action'}`} onEdit={()=>{setEditing(r);setOpen(true)}}/>}/><EntityModal visible={open} title={editing?'Edit lead':'Add lead'} fields={fields} initial={initial} onClose={()=>setOpen(false)} onSave={save}/></>}

function Clients(){const data=useList<Client>(api.clients);const[editing,setEditing]=useState<Client|null>(null);const[open,setOpen]=useState(false);const fields:Field[]=[{key:'name',label:'Name',required:true},{key:'company',label:'Company'},{key:'email',label:'Email'},{key:'phone',label:'Phone'},{key:'country',label:'Country'},{key:'status',label:'Status',options:statusOpts(['active','paused','inactive'])},{key:'notes',label:'Notes'}];const initial=useMemo(()=>editing?{name:text(editing.name),company:text(editing.company),email:text(editing.email),phone:text(editing.phone),country:text(editing.country),status:text(editing.status),notes:text(editing.notes)}:{name:'',company:'',email:'',phone:'',country:'',status:'active',notes:''},[editing]);const save=async(f:Record<string,string>)=>{editing?await api.updateClient(editing.id,f):await api.createClient(f);await data.load()};return <><ListShell {...data} onRefresh={data.refresh} onAdd={()=>{setEditing(null);setOpen(true)}} render={r=><Card title={r.name} meta={[r.company,r.status].filter(Boolean).join(' · ')} detail={r.email||r.phone||r.country||'No contact details'} onEdit={()=>{setEditing(r);setOpen(true)}}/>}/><EntityModal visible={open} title={editing?'Edit client':'Add client'} fields={fields} initial={initial} onClose={()=>setOpen(false)} onSave={save}/></>}

function Projects({currency}:{currency:CurrencyCode}){const data=useList<Project>(api.projects);const[clients,setClients]=useState<Client[]>([]);const[editing,setEditing]=useState<Project|null>(null);const[open,setOpen]=useState(false);useEffect(()=>{api.clients().then(r=>setClients(r.results||[])).catch(()=>undefined)},[]);const fields:Field[]=[{key:'client_id',label:'Client',required:true,options:clients.map(c=>({label:c.name,value:String(c.id)}))},{key:'name',label:'Project name',required:true},{key:'type',label:'Type'},{key:'status',label:'Status',options:statusOpts(['planned','active','blocked','review','done','cancelled'])},{key:'start_date',label:'Start date'},{key:'due_date',label:'Due date'},{key:'progress',label:'Progress %',type:'number'},{key:'budget',label:'Budget',type:'number'},{key:'currency',label:'Currency',options:currencyOpts}];const initial=useMemo(()=>editing?{client_id:text(editing.client_id),name:text(editing.name),type:text(editing.type),status:text(editing.status),start_date:text(editing.start_date),due_date:text(editing.due_date),progress:text(editing.progress),budget:text(editing.budget),currency:text(editing.currency||currency)}:{client_id:'',name:'',type:'',status:'planned',start_date:'',due_date:'',progress:'0',budget:'',currency},[editing,currency]);const save=async(f:Record<string,string>)=>{const p={...f,client_id:Number(f.client_id),progress:Number(f.progress||0),budget:Number(f.budget||0)};editing?await api.updateProject(editing.id,p):await api.createProject(p);await data.load()};return <><ListShell {...data} onRefresh={data.refresh} onAdd={()=>{setEditing(null);setOpen(true)}} render={r=><Card title={r.name} meta={[r.client_name,r.status].filter(Boolean).join(' · ')} detail={`${r.progress||0}% · ${money(r.budget||0,r.currency||currency)} · due ${when(r.due_date)}`} onEdit={()=>{setEditing(r);setOpen(true)}}/>}/><EntityModal visible={open} title={editing?'Edit project':'Add project'} fields={fields} initial={initial} onClose={()=>setOpen(false)} onSave={save}/></>}

function Tasks(){const data=useList<Task>(api.tasks);const[projects,setProjects]=useState<Project[]>([]);const[clients,setClients]=useState<Client[]>([]);const[users,setUsers]=useState<AppUser[]>([]);const[editing,setEditing]=useState<Task|null>(null);const[open,setOpen]=useState(false);useEffect(()=>{Promise.all([api.projects(),api.clients(),api.users()]).then(([p,c,u])=>{setProjects(p.results||[]);setClients(c.results||[]);setUsers(u.results||[])}).catch(()=>undefined)},[]);const fields:Field[]=[{key:'title',label:'Task',required:true},{key:'project_id',label:'Project',options:[{label:'None',value:''},...projects.map(p=>({label:p.name,value:String(p.id)}))]},{key:'client_id',label:'Client',options:[{label:'None',value:''},...clients.map(c=>({label:c.name,value:String(c.id)}))]},{key:'assigned_user_id',label:'Assignee',options:[{label:'Unassigned',value:''},...users.map(u=>({label:u.name,value:String(u.id)}))]},{key:'priority',label:'Priority',options:statusOpts(['low','medium','high','urgent'])},{key:'status',label:'Status',options:statusOpts(['todo','in_progress','review','done','cancelled'])},{key:'due_at',label:'Due'}];const initial=useMemo(()=>editing?{title:text(editing.title),project_id:text(editing.project_id),client_id:text(editing.client_id),assigned_user_id:text(editing.assigned_user_id),priority:text(editing.priority),status:text(editing.status),due_at:text(editing.due_at)}:{title:'',project_id:'',client_id:'',assigned_user_id:'',priority:'medium',status:'todo',due_at:''},[editing]);const save=async(f:Record<string,string>)=>{const p={...f,project_id:f.project_id?Number(f.project_id):null,client_id:f.client_id?Number(f.client_id):null,assigned_user_id:f.assigned_user_id?Number(f.assigned_user_id):null};editing?await api.updateTask(editing.id,p):await api.createTask(p);await data.load()};return <><ListShell {...data} onRefresh={data.refresh} onAdd={()=>{setEditing(null);setOpen(true)}} render={r=><Card title={r.title} meta={`${r.priority} · ${r.status}`} detail={[r.project_name,r.client_name,r.assignee_name,`due ${when(r.due_at)}`].filter(Boolean).join(' · ')} onEdit={()=>{setEditing(r);setOpen(true)}}/>}/><EntityModal visible={open} title={editing?'Edit task':'Add task'} fields={fields} initial={initial} onClose={()=>setOpen(false)} onSave={save}/></>}

function Invoices({currency}:{currency:CurrencyCode}){const data=useList<Invoice>(api.invoices);const[clients,setClients]=useState<Client[]>([]);const[editing,setEditing]=useState<Invoice|null>(null);const[open,setOpen]=useState(false);useEffect(()=>{api.clients().then(r=>setClients(r.results||[])).catch(()=>undefined)},[]);const fields:Field[]=[{key:'client_id',label:'Client',required:true,options:clients.map(c=>({label:c.name,value:String(c.id)}))},{key:'invoice_no',label:'Invoice number',required:true},{key:'status',label:'Status',options:statusOpts(['draft','sent','due','paid','void'])},{key:'amount',label:'Amount',type:'number'},{key:'currency',label:'Currency',options:currencyOpts},{key:'due_date',label:'Due date'},{key:'notes',label:'Notes'}];const initial=useMemo(()=>editing?{client_id:text(editing.client_id),invoice_no:text(editing.invoice_no),status:text(editing.status),amount:text(editing.amount),currency:text(editing.currency||currency),due_date:text(editing.due_date),notes:text(editing.notes)}:{client_id:'',invoice_no:`INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,status:'draft',amount:'',currency,due_date:'',notes:''},[editing,currency]);const save=async(f:Record<string,string>)=>{const p={...f,client_id:Number(f.client_id),amount:Number(f.amount||0)};editing?await api.updateInvoice(editing.id,p):await api.createInvoice(p);await data.load()};return <><ListShell {...data} onRefresh={data.refresh} onAdd={()=>{setEditing(null);setOpen(true)}} render={r=><Card title={r.invoice_no} meta={[r.client_name,r.status].filter(Boolean).join(' · ')} detail={`${money(r.amount,r.currency)} · due ${when(r.due_date)}`} onEdit={()=>{setEditing(r);setOpen(true)}}/>}/><EntityModal visible={open} title={editing?'Edit invoice':'Create invoice'} fields={fields} initial={initial} onClose={()=>setOpen(false)} onSave={save}/></>}

function Centered({children,dark=false}:{children:React.ReactNode;dark?:boolean}){return <SafeAreaView style={[styles.center,dark&&{backgroundColor:'#0b0d11'}]}>{children}</SafeAreaView>}

const styles=StyleSheet.create({
  app:{flex:1,backgroundColor:'#0b0d11'},header:{paddingHorizontal:18,paddingTop:12,paddingBottom:14,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#20242c'},kicker:{color:'#7f8794',fontSize:10,fontWeight:'800',letterSpacing:1.5},title:{color:'#fff',fontSize:28,fontWeight:'800',marginTop:3},headerLogo:{width:42,height:42,borderRadius:12,backgroundColor:'#fff'},body:{flex:1,backgroundColor:'#f5f6f8'},tabs:{height:72,backgroundColor:'#0b0d11',borderTopWidth:1,borderTopColor:'#20242c',flexDirection:'row',paddingBottom:6},tab:{flex:1,alignItems:'center',justifyContent:'center',gap:3},tabActive:{backgroundColor:'#151820'},tabText:{color:'#747b87',fontSize:12,fontWeight:'800'},tabTextActive:{color:'#ff5759'},tabLabel:{color:'#747b87',fontSize:8,fontWeight:'700'},
  login:{flex:1,backgroundColor:'#0b0d11'},loginInner:{flex:1,justifyContent:'center',padding:24},logoImage:{width:76,height:76,borderRadius:20,marginBottom:22,backgroundColor:'#fff'},loginTitle:{color:'#fff',fontSize:32,fontWeight:'900'},loginSub:{color:'#9399a3',fontSize:15,lineHeight:22,marginTop:8,marginBottom:24},fieldLabel:{color:'#c7cbd2',fontSize:12,fontWeight:'800',marginBottom:6,marginTop:6},input:{minHeight:52,borderWidth:1,borderColor:'#2a2f38',backgroundColor:'#14171c',borderRadius:13,paddingHorizontal:14,color:'#fff',fontSize:16,marginBottom:12},primary:{minHeight:52,borderRadius:13,backgroundColor:'#ef3b3b',alignItems:'center',justifyContent:'center',marginTop:8},disabled:{opacity:.65},primaryText:{color:'#fff',fontWeight:'900',fontSize:16},error:{color:'#c52f35',backgroundColor:'#fff0f0',padding:12,borderRadius:10,marginVertical:8},
  center:{flex:1,backgroundColor:'#f5f6f8',alignItems:'center',justifyContent:'center',gap:12},muted:{color:'#7d838c',textAlign:'center'},scroll:{padding:16,gap:16},hero:{backgroundColor:'#111318',borderRadius:20,padding:20},kickerRed:{color:'#ff5558',fontSize:10,fontWeight:'900',letterSpacing:1.6},heroTitle:{color:'#fff',fontSize:27,fontWeight:'900',marginTop:8},heroSub:{color:'#9097a2',fontSize:14,lineHeight:21,marginTop:8},stats:{flexDirection:'row',flexWrap:'wrap',gap:10},stat:{width:'48%',backgroundColor:'#fff',borderWidth:1,borderColor:'#e6e8ec',borderRadius:16,padding:16},statLabel:{color:'#777e89',fontSize:12,fontWeight:'700'},statValue:{color:'#15171c',fontSize:21,fontWeight:'900',marginTop:8},panel:{backgroundColor:'#fff',borderRadius:16,padding:16,borderWidth:1,borderColor:'#e5e7eb'},panelTitle:{fontSize:17,fontWeight:'900',color:'#17191e'},panelHint:{fontSize:12,color:'#777e89',lineHeight:18,marginTop:4,marginBottom:12},chips:{flexDirection:'row',flexWrap:'wrap',gap:7},chip:{paddingVertical:8,paddingHorizontal:11,borderRadius:10,backgroundColor:'#eef0f3'},chipActive:{backgroundColor:'#ef3b3b'},chipText:{fontSize:11,fontWeight:'800',color:'#555b66'},chipTextActive:{color:'#fff'},logout:{borderWidth:1,borderColor:'#dddfe3',borderRadius:13,padding:15,alignItems:'center',backgroundColor:'#fff'},logoutText:{color:'#b42d32',fontWeight:'800'},
  listToolbar:{padding:12,backgroundColor:'#f5f6f8'},addBtn:{backgroundColor:'#ef3b3b',padding:13,borderRadius:12,alignItems:'center'},addBtnText:{color:'#fff',fontWeight:'900'},list:{padding:12,gap:10,paddingBottom:30},card:{backgroundColor:'#fff',borderRadius:15,padding:15,borderWidth:1,borderColor:'#e5e7eb',flexDirection:'row',gap:12,alignItems:'center'},cardTitle:{fontSize:16,fontWeight:'900',color:'#191b20'},cardMeta:{fontSize:12,color:'#696f79',marginTop:4},cardDetail:{fontSize:12,color:'#8a9099',marginTop:6,lineHeight:18},edit:{color:'#ef3b3b',fontWeight:'900',fontSize:12},
  modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.6)',justifyContent:'flex-end'},modalCard:{maxHeight:'92%',backgroundColor:'#0f1116',borderTopLeftRadius:24,borderTopRightRadius:24,paddingBottom:24},modalHead:{padding:18,flexDirection:'row',justifyContent:'space-between',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#252a33'},modalTitle:{color:'#fff',fontSize:21,fontWeight:'900'},close:{color:'#aeb4be',fontSize:22},form:{padding:18,paddingBottom:40},optionGrid:{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:12},option:{paddingVertical:9,paddingHorizontal:11,borderRadius:9,borderWidth:1,borderColor:'#303641',backgroundColor:'#171a20'},optionActive:{backgroundColor:'#ef3b3b',borderColor:'#ef3b3b'},optionText:{color:'#aeb4be',fontSize:11,fontWeight:'800',textTransform:'capitalize'},optionTextActive:{color:'#fff'},
});
