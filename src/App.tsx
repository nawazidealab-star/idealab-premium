import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Routes, Route, Link, NavLink } from 'react-router-dom';
import {
  ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, CheckCircle2, ChevronRight,
  CircleDollarSign, Code2, Database, Gauge, Globe2, Instagram, LayoutDashboard, Mail,
  Menu, MessageCircle, PanelsTopLeft, Rocket, Search, Settings, ShieldCheck, Sparkles,
  Target, Users, Workflow, X, Zap, FileText, KanbanSquare, ReceiptText
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const works = [
  { title:'Dental Clinic Growth System', type:'CRM + Website', image:'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80' },
  { title:'Restaurant Brand & Booking Experience', type:'Web + Social', image:'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80' },
  { title:'Real Estate Lead Funnel', type:'CRM + Automation', image:'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80' },
  { title:'Creative Studio Portfolio', type:'Brand + Website', image:'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?auto=format&fit=crop&w=1200&q=80' },
  { title:'Aesthetic Clinic Campaign', type:'Social + Conversion', image:'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1200&q=80' },
  { title:'Premium Service Business Website', type:'Web + Conversion', image:'https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=1200&q=80' },
];

const services = [
  ['Premium Web Development','Fast, responsive websites with modern animation, conversion UX and analytics.',<Code2/>],
  ['Custom CRM Systems','Lead, client, pipeline, follow-up, task, invoice and reporting systems tailored to your workflow.',<Database/>],
  ['Social Media Growth','Campaign strategy, branded content systems, Reels, carousels, CTAs and lead capture.',<Instagram/>],
  ['Automation & Integrations','Connect forms, email, calendars and internal workflows to reduce manual work.',<Workflow/>],
  ['SEO & Conversion','Technical SEO, landing page optimisation, funnels and reporting focused on commercial outcomes.',<Target/>],
  ['AI-Ready Operations','Structured data, reusable workflows and systems designed to support AI-assisted operations.',<Sparkles/>],
];

const chartData = [
  {m:'Jan', v:22},{m:'Feb',v:28},{m:'Mar',v:25},{m:'Apr',v:42},{m:'May',v:38},{m:'Jun',v:58},{m:'Jul',v:54},{m:'Aug',v:76}
];

function Logo(){return <Link to="/" className="brand"><img src="/idealab-logo.jpg" alt="IDEA LAB"/><span>IDEA LAB</span></Link>}

function Navbar(){
  const [open,setOpen]=useState(false);
  return <>
    <header className="nav"><div className="container nav-inner"><Logo/>
      <nav className="nav-links"><a href="#services">Services</a><a href="#work">Work</a><a href="#testimonials">Testimonials</a><a href="#contact">Contact</a></nav>
      <div className="nav-actions"><a className="btn primary" href="#contact">Let's Talk <ArrowRight size={16}/></a><button className="btn mobile-menu" onClick={()=>setOpen(true)}><Menu/></button></div>
    </div></header>
    {open && <div style={{position:'fixed',inset:0,zIndex:100,background:'#0a0b0e',padding:20}}><div className="container"><div style={{display:'flex',justifyContent:'space-between'}}><Logo/><button className="btn" onClick={()=>setOpen(false)}><X/></button></div><div style={{display:'grid',gap:18,marginTop:50,fontSize:30}}>{['Services','Work','Testimonials','Contact'].map(x=><a onClick={()=>setOpen(false)} key={x} href={'#'+x.toLowerCase()}>{x}</a>)}</div></div></div>}
  </>
}

const reveal = { initial:{opacity:0,y:28}, whileInView:{opacity:1,y:0}, viewport:{once:true,margin:'-80px'}, transition:{duration:.65,ease:[.2,.8,.2,1] as any} };

function Home(){
  return <div><Navbar/>
    <section className="hero"><div className="container hero-grid">
      <motion.div {...reveal}>
        <div className="eyebrow">Digital systems that grow businesses</div>
        <h1 className="h1">We build systems.<br/>You get <span className="red">results.</span></h1>
        <p className="lead">Premium websites, CRM systems, social media and automation — designed as one connected growth engine.</p>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:28}}><a href="#work" className="btn primary">View Our Work <ArrowRight size={17}/></a><a href="#contact" className="btn">Book a Strategy Call</a></div>
        <div className="trust-row"><div className="avatars">{[1,2,3,4,5].map(i=><div className="avatar" key={i}/>)}</div><span>Built for ambitious service businesses</span></div>
      </motion.div>
      <motion.div {...reveal} transition={{duration:.8,delay:.1}} className="hero-card glass">
        <div className="browser"><div className="browser-top"><span className="dot red"/><span className="dot"/><span className="dot"/></div><div className="browser-main"><div className="side-mini"><div className="active"/><div/><div/><div/><div/></div><div className="dashboard-mini"><div className="mini-stats"><div className="mini-stat"><small>Leads</small><b>248</b></div><div className="mini-stat"><small>Clients</small><b>126</b></div><div className="mini-stat"><small>Projects</small><b>32</b></div></div><div className="mini-chart"/></div></div></div>
      </motion.div>
    </div></section>
    <div className="metrics"><div className="metric"><b>100%</b><span>Custom-built systems</span></div><div className="metric"><b>24/7</b><span>Online lead capture</span></div><div className="metric"><b>1</b><span>Connected business ecosystem</span></div><div className="metric"><b>∞</b><span>Room to scale</span></div></div>

    <section className="section" id="work"><div className="container"><motion.div {...reveal}><div className="eyebrow">Selected work</div><h2 className="h2">Portfolio built around business outcomes.</h2><p className="lead">A premium visual direction across clinics, restaurants, real estate, creative studios and service businesses.</p></motion.div><div className="grid cards-3" style={{marginTop:34}}>{works.map((w,i)=><motion.article {...reveal} transition={{duration:.55,delay:i*.04}} className="work-card glass" key={w.title}><div className="thumb"><img src={w.image} alt={w.title}/></div><div className="work-meta"><span>{w.type}</span><h3>{w.title}</h3><p>Strategy, UX, visual system and conversion flow.</p></div></motion.article>)}</div></div></section>

    <section className="section" id="services"><div className="container"><motion.div {...reveal} style={{textAlign:'center'}}><div className="eyebrow">What we do</div><h2 className="h2">Complete digital solutions.</h2><p className="lead" style={{margin:'0 auto'}}>Not isolated services. One connected system across website, CRM, social and operations.</p></motion.div><div className="grid cards-3" style={{marginTop:34}}>{services.map(([t,d,icon],i)=><motion.div {...reveal} transition={{duration:.55,delay:i*.04}} className="service-card glass" key={t as string}><div className="iconbox">{icon}</div><h3>{t}</h3><p>{d}</p><div style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#ff6666',marginTop:18}}>Explore capability <ChevronRight size={15}/></div></motion.div>)}</div></div></section>

    <section className="section" id="testimonials"><div className="container"><motion.div {...reveal}><div className="eyebrow">Testimonials</div><h2 className="h2">Proof should be real.</h2><p className="lead">The cards below are clearly marked demo placeholders. Replace them with verified client feedback before publishing.</p></motion.div><div className="grid cards-3" style={{marginTop:30}}>{[
      ['“The system is simple to use and keeps our enquiries organised.”','Sample testimonial — replace with verified client quote','Clinic CRM'],
      ['“The new site finally feels as premium as our business.”','Sample testimonial — replace with verified client quote','Website'],
      ['“Everything from content to follow-up now feels connected.”','Sample testimonial — replace with verified client quote','Growth System']
    ].map((t,i)=><motion.div {...reveal} transition={{duration:.55,delay:i*.05}} className="testimonial glass" key={i}><div className="stars">★★★★★</div><p>{t[0]}</p><div className="person"><div className="avatar"/><div><b>{t[1]}</b><br/><small>{t[2]}</small></div></div></motion.div>)}</div></div></section>

    <section className="section" id="contact"><div className="container"><motion.div {...reveal} className="cta glass"><div><div className="eyebrow">Start a project</div><h2 className="h2" style={{marginBottom:10}}>Tell us what you want to build.</h2><p className="lead" style={{margin:0}}>Website, CRM, social growth, automation or a complete digital growth system.</p></div><a className="btn primary" href="mailto:nawazidealab@gmail.com">Email IDEA LAB <Mail size={16}/></a></motion.div></div></section>

    <footer className="footer"><div className="container footer-grid"><div><Logo/><p style={{color:'#8f9299',lineHeight:1.7,maxWidth:420}}>Premium digital systems for businesses that want a stronger brand, cleaner operations and more organised growth.</p></div><div><h4>Services</h4><a href="#services">Web Development</a><a href="#services">CRM Systems</a><a href="#services">Social Media</a><a href="#services">Automation</a></div><div><h4>Company</h4><a href="#work">Work</a><a href="#testimonials">Testimonials</a><a href="#contact">Contact</a></div><div><h4>Contact</h4><a href="mailto:nawazidealab@gmail.com">nawazidealab@gmail.com</a><span style={{color:'#8f9299'}}>Pakistan · Remote worldwide</span></div></div><div className="container" style={{borderTop:'1px solid var(--line)',paddingTop:20,marginTop:30,color:'#74777f',fontSize:12}}>© 2026 IDEA LAB. All rights reserved.</div></footer>
  </div>
}

const portalNav = [
  ['/admin', 'Dashboard', <LayoutDashboard size={17}/>],
  ['/admin/leads', 'Leads', <Target size={17}/>],
  ['/admin/clients', 'Clients', <Users size={17}/>],
  ['/admin/projects', 'Projects', <BriefcaseBusiness size={17}/>],
  ['/admin/tasks', 'Tasks', <KanbanSquare size={17}/>],
  ['/admin/invoices', 'Invoices', <ReceiptText size={17}/>],
  ['/admin/content', 'Content Planner', <CalendarDays size={17}/>],
  ['/admin/reports', 'Reports', <BarChart3 size={17}/>],
  ['/admin/users', 'Team & Roles', <ShieldCheck size={17}/>],
  ['/admin/settings', 'Settings', <Settings size={17}/>],
];

const demoLeads = [
  {name:'Dental Avenue', company:'Dental Avenue', service:'Dental CRM', status:'Warm', value:'PKR 29,900', next:'Follow up tomorrow'},
  {name:'Bea', company:'Artsy Image Studios', service:'Social + Website', status:'Proposal sent', value:'£299+', next:'Await reply'},
  {name:'Kinz Owners', company:'Kinz London', service:'Restaurant CRM', status:'Referred', value:'£399+', next:'Follow up in 3 days'},
  {name:'Flux Framing', company:'Flux Framing', service:'Social Content', status:'New', value:'£299', next:'Sample offer'},
  {name:'Prism Imaging', company:'Prism Imaging', service:'Content + Enquiry', status:'New', value:'A$499', next:'Sample offer'},
];

function PortalLayout({title,children}:{title:string,children:React.ReactNode}){
  return <div className="portal-page"><aside className="portal-nav"><Logo/><nav>{portalNav.map(([to,label,icon])=><NavLink end={to==='/admin'} to={to as string} key={to as string}>{icon}{label}</NavLink>)}</nav></aside><main className="portal-content"><div className="topbar"><div><div className="kicker">IDEA LAB OPERATIONS</div><h1>{title}</h1></div><div style={{display:'flex',gap:10,alignItems:'center'}}><button className="btn portal-mobile-toggle" style={{color:'#111',borderColor:'#ddd'}}><Menu/></button><button className="btn" style={{color:'#111',borderColor:'#ddd',background:'white'}}><Search size={16}/> Search</button><div style={{width:38,height:38,borderRadius:12,background:'#111',color:'#fff',display:'grid',placeItems:'center'}}>AS</div></div></div>{children}</main></div>
}

function Dashboard(){return <PortalLayout title="Dashboard"><div className="portal-grid-cards">{[['Total Leads','248','+22%'],['Active Clients','42','+8%'],['Open Projects','16','+5%'],['Pipeline Value','$38,420','+17%']].map(x=><div className="portal-card" key={x[0]}><small>{x[0]}</small><b>{x[1]}</b><span style={{color:'#2d7a3a',fontSize:12}}>{x[2]} this month</span></div>)}</div><div className="portal-columns"><div className="panel"><h3>Lead activity</h3><div style={{height:280}}><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ff2d2d" stopOpacity={.25}/><stop offset="100%" stopColor="#ff2d2d" stopOpacity={0}/></linearGradient></defs><XAxis dataKey="m" axisLine={false} tickLine={false}/><Tooltip/><Area type="monotone" dataKey="v" stroke="#ff2d2d" strokeWidth={3} fill="url(#fill)"/></AreaChart></ResponsiveContainer></div></div><div className="panel"><h3>Recent activity</h3><div className="activity">{['New website enquiry received','Proposal sent to Artsy Image','Follow-up due for Dental Avenue','Invoice marked paid','New project created'].map((x,i)=><div className="activity-item" key={x}><div className="activity-dot"/><div><b style={{fontSize:13}}>{x}</b><br/><small>{i+1}h ago</small></div></div>)}</div></div></div><div className="panel" style={{marginTop:16}}><h3>Hot opportunities</h3><table className="table"><thead><tr><th>Lead</th><th>Company</th><th>Service</th><th>Status</th><th>Value</th><th>Next Action</th></tr></thead><tbody>{demoLeads.map(l=><tr key={l.company}><td>{l.name}</td><td>{l.company}</td><td>{l.service}</td><td><span className={'status '+(l.status==='Warm'?'hot':'')}>{l.status}</span></td><td>{l.value}</td><td>{l.next}</td></tr>)}</tbody></table></div></PortalLayout>}

function Leads(){const [q,setQ]=useState('');const rows=useMemo(()=>demoLeads.filter(x=>Object.values(x).join(' ').toLowerCase().includes(q.toLowerCase())),[q]);return <PortalLayout title="Leads"><div className="panel"><div style={{display:'flex',justifyContent:'space-between',gap:12,marginBottom:14,flexWrap:'wrap'}}><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search leads..." style={{padding:'11px 13px',border:'1px solid #ddd',borderRadius:10,minWidth:260}}/><button className="btn primary">+ Add Lead</button></div><table className="table"><thead><tr><th>Name</th><th>Company</th><th>Service</th><th>Status</th><th>Value</th><th>Next action</th></tr></thead><tbody>{rows.map(l=><tr key={l.company}><td>{l.name}</td><td>{l.company}</td><td>{l.service}</td><td><span className="status">{l.status}</span></td><td>{l.value}</td><td>{l.next}</td></tr>)}</tbody></table></div></PortalLayout>}


const teamRoles = [
  ['Super Admin','Full control, including team profiles and permissions. Keep this role to 1–2 trusted owners.'],
  ['Admin','Full operational access without the ability to create or change Super Admin accounts.'],
  ['Sales','Leads, pipeline, client contacts and follow-ups only. No invoices or settings.'],
  ['Project Manager','Clients, projects, tasks and content delivery. No financial controls.'],
  ['Finance','Invoices, payments and financial reporting only.'],
  ['Content','Content planner and client-facing content workflow only.'],
];

function TeamRoles(){return <PortalLayout title="Team & Roles"><div className="panel" style={{marginBottom:16}}><div className="eyebrow">SECURITY MODEL</div><h3 style={{fontSize:24,margin:'8px 0'}}>Internal staff profiles only</h3><p style={{color:'#666',lineHeight:1.7,maxWidth:850}}>Each person signs in through Cloudflare Access first, then the API checks their IDEA LAB role again before returning any data. No shared passwords, no public registration and no client accounts.</p><div style={{display:'flex',gap:10,flexWrap:'wrap',marginTop:16}}><span className="status hot">Recommended now: 3–5 profiles</span><span className="status">Free-tier friendly</span><span className="status">MFA through Cloudflare Access</span></div></div><div className="grid cards-3">{teamRoles.map(([role,desc])=><div className="portal-card" key={role}><div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'center'}}><b style={{fontSize:18,margin:0}}>{role}</b><ShieldCheck size={18}/></div><p style={{color:'#777',lineHeight:1.65}}>{desc}</p></div>)}</div></PortalLayout>}

function GenericPortal({title,items}:{title:string,items:string[]}){return <PortalLayout title={title}><div className="grid cards-3">{items.map((x,i)=><div className="portal-card" key={x}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><b style={{fontSize:18,margin:0}}>{x}</b><span className="status">Active</span></div><p style={{color:'#777',lineHeight:1.6}}>Professional module ready for API-backed data, permissions, filters, exports and activity history.</p><button className="btn" style={{color:'#111',borderColor:'#ddd',background:'white'}}>Open <ArrowRight size={14}/></button></div>)}</div></PortalLayout>}

function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/admin" element={<Dashboard/>}/><Route path="/admin/leads" element={<Leads/>}/><Route path="/admin/clients" element={<GenericPortal title="Clients" items={['Client Directory','Contacts & Notes','Contracts & Files']}/>}/><Route path="/admin/projects" element={<GenericPortal title="Projects" items={['Active Projects','Milestones','Deliverables']}/>}/><Route path="/admin/tasks" element={<GenericPortal title="Tasks" items={['My Tasks','Team Board','Deadlines']}/>}/><Route path="/admin/invoices" element={<GenericPortal title="Invoices" items={['Draft Invoices','Sent & Due','Payments']}/>}/><Route path="/admin/content" element={<GenericPortal title="Content Planner" items={['Calendar','Campaigns','Asset Library']}/>}/><Route path="/admin/reports" element={<GenericPortal title="Reports" items={['Sales Funnel','Revenue','Campaign Performance']}/>}/><Route path="/admin/users" element={<TeamRoles/>}/><Route path="/admin/settings" element={<GenericPortal title="Settings" items={['Security & Access','Integrations','Brand & Agency']}/>}/></Routes>}
export default App;
