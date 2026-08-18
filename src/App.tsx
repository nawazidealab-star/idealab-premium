import React from 'react';
import { motion } from 'framer-motion';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Code2,
  Globe2,
  LayoutDashboard,
  Mail,
  Menu,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X
} from 'lucide-react';

type Service = {
  slug: string;
  icon: React.ReactNode;
  title: string;
  short: string;
  intro: string;
  features: string[];
  outcomes: string[];
};

const services: Service[] = [
  {
    slug: 'web-development',
    icon: <Code2 size={28} />,
    title: 'Web Development',
    short: 'Premium responsive websites engineered for speed, clarity, credibility and conversion.',
    intro: 'We design and build modern websites that make your business look established, communicate value quickly and guide visitors toward enquiry or booking.',
    features: ['Responsive UI/UX', 'Landing pages', 'Conversion-focused layouts', 'Performance optimisation', 'Cloudflare-ready deployment', 'Custom integrations'],
    outcomes: ['Stronger first impression', 'Clearer customer journey', 'More qualified enquiries']
  },
  {
    slug: 'crm-systems',
    icon: <LayoutDashboard size={28} />,
    title: 'CRM Systems',
    short: 'Custom CRM platforms for leads, customers, follow-ups, workflows, projects and operations.',
    intro: 'We build practical CRM systems around your actual sales and service process instead of forcing your business into a generic template.',
    features: ['Lead pipelines', 'Client records', 'Follow-up workflows', 'Role-based access', 'Dashboards and reporting', 'Custom business logic'],
    outcomes: ['Fewer missed leads', 'Better visibility', 'More organised follow-up']
  },
  {
    slug: 'social-media',
    icon: <Camera size={28} />,
    title: 'Social Media',
    short: 'Branded content systems, short-form creative and campaigns designed around business goals.',
    intro: 'We turn your existing photos, footage, offers and expertise into a consistent content system built to create attention, trust and action.',
    features: ['Reels and short-form video', 'Branded social posts', 'Content direction', 'Campaign concepts', 'Captions and CTAs', 'Cross-platform content'],
    outcomes: ['More consistent presence', 'Stronger brand perception', 'Content tied to business goals']
  },
  {
    slug: 'automation',
    icon: <Workflow size={28} />,
    title: 'Automation',
    short: 'Connected workflows, reminders and smart handoffs that reduce repetitive admin work.',
    intro: 'We connect the repetitive parts of your workflow so your team spends less time copying data, chasing tasks and manually coordinating routine steps.',
    features: ['Lead routing', 'Follow-up reminders', 'Status-based actions', 'Notifications', 'Workflow triggers', 'System integrations'],
    outcomes: ['Less manual work', 'Faster response times', 'More consistent processes']
  },
  {
    slug: 'conversion-growth',
    icon: <Target size={28} />,
    title: 'Conversion Growth',
    short: 'Landing pages, enquiry journeys and stronger calls-to-action built to move prospects forward.',
    intro: 'We improve the path between attention and action by simplifying offers, reducing friction and making the next step obvious.',
    features: ['Offer positioning', 'Landing-page journeys', 'Lead capture flows', 'Booking funnels', 'CTA optimisation', 'Follow-up structure'],
    outcomes: ['Clearer offers', 'Higher-intent enquiries', 'Less friction before conversion']
  },
  {
    slug: 'digital-strategy',
    icon: <Globe2 size={28} />,
    title: 'Digital Strategy',
    short: 'A joined-up approach across web, CRM, content and follow-up instead of disconnected tools.',
    intro: 'We map the full digital journey from first impression to enquiry, follow-up and retention, then identify what should be improved first.',
    features: ['Digital audits', 'Customer journey mapping', 'Technology planning', 'CRM strategy', 'Content planning', 'Growth roadmaps'],
    outcomes: ['Clear priorities', 'Better-connected systems', 'Less wasted effort']
  }
];

const projects = [
  {
    title: 'Dental Clinic Growth System',
    category: 'CRM + Website',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
    description: 'Treatment-focused pages, lead capture, follow-up stages and appointment-oriented workflows.'
  },
  {
    title: 'Restaurant Customer Platform',
    category: 'CRM + Retention',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    description: 'Customer profiles, reservations, VIP tracking, feedback and repeat-customer campaign structure.'
  },
  {
    title: 'Creative Studio Digital Experience',
    category: 'Website + Social',
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
    description: 'A premium web and content direction for studios, photographers, printers, galleries and artists.'
  },
  {
    title: 'Property Lead Funnel',
    category: 'Lead Generation',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    description: 'Seller enquiry capture, appraisal calls-to-action, lead qualification and follow-up workflow.'
  }
];

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [pathname]);
  return null;
}

function Header() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const nav = [
    ['/', 'Home'],
    ['/services', 'Services'],
    ['/work', 'Work'],
    ['/about', 'About'],
    ['/contact', 'Contact']
  ];

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="IDEA LAB home">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
        </Link>
        <nav className="desktop-nav">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
        </nav>
        <Link className="nav-cta desktop-only" to="/contact">
          Start a Project <ArrowRight size={16} />
        </Link>
        <button className="mobile-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle navigation">
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>

      {mobileOpen && (
        <motion.div className="mobile-menu" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          {nav.map(([to, label]) => (
            <Link key={to} to={to} onClick={() => setMobileOpen(false)}>{label}</Link>
          ))}
          <Link to="/contact" onClick={() => setMobileOpen(false)}>Start a Project</Link>
        </motion.div>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-brand">
        <img src="/idealab-logo.jpg" alt="IDEA LAB" />
        <p>Websites, CRM systems, social content and automation designed to help businesses operate and grow more effectively.</p>
      </div>
      <div className="footer-links">
        <div>
          <strong>Services</strong>
          <Link to="/services/web-development">Web Development</Link>
          <Link to="/services/crm-systems">CRM Systems</Link>
          <Link to="/services/social-media">Social Media</Link>
          <Link to="/services/automation">Automation</Link>
        </div>
        <div>
          <strong>IDEA LAB</strong>
          <Link to="/about">About</Link>
          <Link to="/work">Work</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 IDEA LAB. All rights reserved.</span>
        <span>Digital systems built for growth.</span>
      </div>
    </footer>
  );
}

function HomePage() {
  return (
    <>
      <section className="hero section-dark">
        <div className="hero-glow hero-glow-one" />
        <div className="hero-glow hero-glow-two" />
        <motion.div className="hero-copy" initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7 }}>
          <div className="eyebrow"><Sparkles size={16} /> Digital systems built for growth</div>
          <h1>We build systems.<span>You get results.</span></h1>
          <p>Premium websites, CRM systems, social media and automation — designed as one connected digital growth system.</p>
          <div className="hero-actions">
            <Link className="primary-btn" to="/services">Explore Services <ArrowRight size={18} /></Link>
            <Link className="secondary-btn" to="/contact">Start a Conversation</Link>
          </div>
          <div className="hero-trust">
            <div className="mini-avatar-group"><span>IL</span><span>CRM</span><span>WEB</span></div>
            <div><strong>Built for ambitious service businesses</strong><small>Healthcare · Hospitality · Creative · Property · Professional Services</small></div>
          </div>
        </motion.div>

        <motion.div className="hero-visual" initial={{ opacity: 0, scale: .94, x: 30 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: .85 }}>
          <div className="browser-card">
            <div className="browser-top"><div className="browser-dots"><span /><span /><span /></div><span>IDEA LAB digital experience</span></div>
            <div className="browser-content">
              <div className="browser-badge">Digital Growth Systems</div>
              <h3>Built to look better.<br />Built to work smarter.</h3>
              <p>High-end customer experiences backed by practical business systems.</p>
              <div className="browser-metrics">
                <div><strong>Web</strong><span>Fast</span></div>
                <div><strong>CRM</strong><span>Custom</span></div>
                <div><strong>Build</strong><span>Secure</span></div>
              </div>
            </div>
          </div>
          <motion.div className="floating-dashboard" animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <div className="float-title"><BarChart3 size={18} /> Connected growth</div>
            <div className="chart-bars">{[45,62,52,78,66,91,100].map((h,i)=><span key={i} style={{height:`${h}%`}} />)}</div>
          </motion.div>
        </motion.div>
      </section>

      <section className="stats-strip">
        <div><strong>CRM</strong><span>Lead & customer management</span></div>
        <div><strong>WEB</strong><span>Premium responsive development</span></div>
        <div><strong>SOCIAL</strong><span>Content that supports growth</span></div>
        <div><strong>AUTOMATE</strong><span>Smarter business workflows</span></div>
      </section>

      <section className="section light-section">
        <div className="section-heading"><span>WHAT WE DO</span><h2>One partner. Connected digital solutions.</h2><p>Each service now has its own dedicated page with deeper information about what we build and why it matters.</p></div>
        <div className="service-grid">
          {services.map((service,index)=>(
            <motion.article key={service.slug} className="service-card" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.06}} whileHover={{y:-6}}>
              <div className="service-icon">{service.icon}</div>
              <h3>{service.title}</h3><p>{service.short}</p>
              <Link to={`/services/${service.slug}`}>Explore service <ArrowRight size={15}/></Link>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="section work-section">
        <div className="section-heading left-heading"><span>SOLUTIONS IN ACTION</span><h2>Built around real business needs.</h2><p>See how IDEA LAB approaches different industries and digital challenges.</p></div>
        <ProjectGrid />
        <div className="hero-actions"><Link className="primary-btn" to="/work">View Work <ArrowRight size={17}/></Link></div>
      </section>

      <AboutBlock />
      <CallToAction />
    </>
  );
}

function ServicesPage() {
  return (
    <>
      <PageHero kicker="OUR SERVICES" title="Specialists where digital growth connects." text="Choose a service to explore exactly what IDEA LAB can build for your business." />
      <section className="section light-section">
        <div className="service-grid">
          {services.map((service,index)=>(
            <motion.article key={service.slug} className="service-card" initial={{opacity:0,y:24}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.06}} whileHover={{y:-6}}>
              <div className="service-icon">{service.icon}</div><h3>{service.title}</h3><p>{service.short}</p>
              <Link to={`/services/${service.slug}`}>View full service <ArrowRight size={15}/></Link>
            </motion.article>
          ))}
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function ServicePage({ service }: { service: Service }) {
  return (
    <>
      <PageHero kicker="IDEA LAB SERVICE" title={service.title} text={service.intro} />
      <section className="section light-section">
        <div className="section-heading left-heading"><span>WHAT'S INCLUDED</span><h2>A focused system, not a generic package.</h2><p>{service.short}</p></div>
        <div className="service-grid">
          {service.features.map((feature,index)=>(
            <motion.article key={feature} className="service-card" initial={{opacity:0,y:20}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.05}}>
              <div className="service-icon"><CheckCircle2 size={25}/></div><h3>{feature}</h3><p>Designed around your workflow, customer journey and business priorities.</p>
            </motion.article>
          ))}
        </div>
      </section>
      <section className="section about-section">
        <div className="about-copy"><span className="section-kicker">BUSINESS IMPACT</span><h2>What this should improve.</h2><p>Every build starts with a business problem, then the technology is shaped around solving it.</p>
          <div className="check-list">{service.outcomes.map(item=><div key={item}><CheckCircle2 size={19}/><span>{item}</span></div>)}</div>
        </div>
        <div className="about-panel"><div className="about-panel-header"><ShieldCheck size={25}/><div><strong>Built professionally</strong><span>Responsive, secure and maintainable from the start</span></div></div><div className="about-panel-grid"><div><Search size={21}/><strong>Discovery</strong><span>Understand the workflow first</span></div><div><MonitorSmartphone size={21}/><strong>Design</strong><span>Build for real devices and users</span></div><div><Workflow size={21}/><strong>Connect</strong><span>Integrate the systems that matter</span></div><div><ShieldCheck size={21}/><strong>Protect</strong><span>Use secure modern architecture</span></div></div></div>
      </section>
      <CallToAction />
    </>
  );
}

function WorkPage() {
  return (
    <>
      <PageHero kicker="WORK & CAPABILITIES" title="Digital systems shaped around the business." text="From customer-facing websites to CRM workflows and campaign systems, IDEA LAB builds around the problem rather than a fixed template." />
      <section className="section work-section"><ProjectGrid /></section>
      <section className="section light-section">
        <div className="section-heading"><span>HOW WE WORK</span><h2>Strategy first. Build second.</h2><p>We define the customer journey, operational need and desired outcome before choosing the right technology.</p></div>
        <div className="service-grid">
          {['Discover the real problem','Design the right system','Build and test','Refine around real use','Launch securely','Improve over time'].map((item,i)=><article className="service-card" key={item}><div className="service-icon"><span>{String(i+1).padStart(2,'0')}</span></div><h3>{item}</h3><p>A structured process keeps the final build focused, usable and commercially relevant.</p></article>)}
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function AboutPage() {
  return (
    <>
      <PageHero kicker="ABOUT IDEA LAB" title="Built for businesses that want digital systems to actually work together." text="IDEA LAB brings together web development, CRM architecture, social content, automation and conversion strategy under one practical approach." />
      <AboutBlock />
      <section className="section light-section"><div className="section-heading"><span>OUR APPROACH</span><h2>Simple where it should be. Powerful where it matters.</h2><p>We avoid unnecessary complexity and focus on technology that makes the customer experience better and the business easier to manage.</p></div><div className="service-grid">{services.slice(0,3).map(s=><article className="service-card" key={s.slug}><div className="service-icon">{s.icon}</div><h3>{s.title}</h3><p>{s.short}</p><Link to={`/services/${s.slug}`}>Explore <ArrowRight size={15}/></Link></article>)}</div></section>
      <CallToAction />
    </>
  );
}

function ContactPage() {
  return (
    <>
      <PageHero kicker="START A PROJECT" title="Tell us what you want your business to do better." text="Website, CRM, social content, automation or a connected digital system — start with the business problem and we’ll shape the right solution around it." />
      <section className="section contact-section">
        <motion.div className="contact-panel" initial={{opacity:0,scale:.97}} whileInView={{opacity:1,scale:1}} viewport={{once:true}}>
          <div><span className="section-kicker red-kicker">CONTACT IDEA LAB</span><h2>Start with a simple conversation.</h2><p>Send us your current website, process, pain point or idea. We’ll review the situation and recommend a focused next step.</p><div className="contact-details"><a href="mailto:nawazidealab@gmail.com"><Mail size={18}/>nawazidealab@gmail.com</a></div></div>
          <div className="contact-form"><div className="full-field"><span className="section-kicker">READY WHEN YOU ARE</span><h3 style={{margin:'14px 0 10px',fontSize:'28px',color:'#fff'}}>Let’s talk about the opportunity.</h3><p style={{margin:'0 0 24px',color:'#9a9da5',lineHeight:1.7}}>Email IDEA LAB with a short description of your business and what you want to improve.</p><a className="primary-btn" href="mailto:nawazidealab@gmail.com?subject=IDEA%20LAB%20Project%20Enquiry">Email IDEA LAB <ArrowRight size={17}/></a></div></div>
        </motion.div>
      </section>
    </>
  );
}

function PageHero({ kicker, title, text }: { kicker: string; title: string; text: string }) {
  return (
    <section className="hero section-dark" style={{minHeight:'620px'}}>
      <div className="hero-glow hero-glow-one"/><div className="hero-glow hero-glow-two"/>
      <motion.div className="hero-copy" initial={{opacity:0,y:28}} animate={{opacity:1,y:0}} transition={{duration:.65}}>
        <div className="eyebrow"><Sparkles size={16}/> {kicker}</div><h1>{title}</h1><p>{text}</p><div className="hero-actions"><Link className="primary-btn" to="/contact">Start a Project <ArrowRight size={18}/></Link><Link className="secondary-btn" to="/work">Explore Work</Link></div>
      </motion.div>
      <motion.div className="hero-visual" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} transition={{duration:.8}}><div className="browser-card"><div className="browser-top"><div className="browser-dots"><span/><span/><span/></div><span>IDEA LAB</span></div><div className="browser-content"><div className="browser-badge">Built around your business</div><h3>Strategy.<br/>Design. Systems.</h3><p>One connected approach from customer experience to operational workflow.</p><div className="browser-metrics"><div><strong>Plan</strong><span>Clear</span></div><div><strong>Build</strong><span>Smart</span></div><div><strong>Grow</strong><span>Better</span></div></div></div></div></motion.div>
    </section>
  );
}

function ProjectGrid() {
  return <div className="project-grid">{projects.map((project,index)=><motion.article key={project.title} className="project-card" initial={{opacity:0,y:30}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:index*.08}}><div className="project-image-wrap"><img src={project.image} alt={project.title}/><div className="project-overlay"><span>{project.category}</span><ArrowRight/></div></div><div className="project-copy"><span>{project.category}</span><h3>{project.title}</h3><p>{project.description}</p></div></motion.article>)}</div>;
}

function AboutBlock() {
  return <section className="section about-section"><div className="about-copy"><span className="section-kicker">WHY IDEA LAB</span><h2>Technology should make growth simpler, not more complicated.</h2><p>IDEA LAB combines design, development, CRM architecture, social content and automation into practical systems built around how modern businesses attract and manage customers.</p><div className="check-list">{['Responsive websites built for modern devices','Custom CRM and lead management workflows','Conversion-focused landing and enquiry pages','Social content designed around business goals','Automation and follow-up infrastructure','Secure business systems and integrations'].map(item=><div key={item}><CheckCircle2 size={19}/><span>{item}</span></div>)}</div></div><div className="about-panel"><div className="about-panel-header"><ShieldCheck size={25}/><div><strong>Modern by design</strong><span>Performance, usability and security considered from the start</span></div></div><div className="about-panel-grid"><div><Search size={21}/><strong>Clear</strong><span>Focused user journeys and information hierarchy</span></div><div><MonitorSmartphone size={21}/><strong>Responsive</strong><span>Designed across desktop, tablet and mobile</span></div><div><Workflow size={21}/><strong>Connected</strong><span>Marketing and operations working together</span></div><div><ShieldCheck size={21}/><strong>Secure</strong><span>Modern architecture with protected business systems</span></div></div></div></section>;
}

function CallToAction() {
  return <section className="section contact-section"><motion.div className="contact-panel" initial={{opacity:0,scale:.97}} whileInView={{opacity:1,scale:1}} viewport={{once:true}}><div><span className="section-kicker red-kicker">START A PROJECT</span><h2>Ready to build something better?</h2><p>Tell us where your current process, website or marketing is falling short. We’ll help define a practical next step.</p><div className="contact-details"><a href="mailto:nawazidealab@gmail.com"><Mail size={18}/>nawazidealab@gmail.com</a></div></div><div className="contact-form"><div className="full-field"><span className="section-kicker">IDEA LAB</span><h3 style={{margin:'14px 0 10px',fontSize:'28px',color:'#fff'}}>Let’s make the next move useful.</h3><p style={{margin:'0 0 24px',color:'#9a9da5',lineHeight:1.7}}>Start with the business challenge. We’ll recommend the right digital solution.</p><Link className="primary-btn" to="/contact">Start a Project <ArrowRight size={17}/></Link></div></div></motion.div></section>;
}

function App() {
  return (
    <div className="site-shell">
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServicesPage />} />
          {services.map(service => <Route key={service.slug} path={`/services/${service.slug}`} element={<ServicePage service={service} />} />)}
          <Route path="/work" element={<WorkPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<HomePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
