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
  MessageSquare,
  MonitorSmartphone,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Workflow,
  X
} from 'lucide-react';
import { portfolioItems } from './data/portfolio';
import { logoFolioItems } from './data/logo-folio';

type Service = {
  slug: string;
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  short: string;
  hero: string;
  detail: string;
  deliverables: string[];
  outcomes: string[];
};

const services: Service[] = [
  {
    slug: 'web-development',
    title: 'Web Development',
    eyebrow: 'High-performance digital experiences',
    icon: <Code2 size={26} />,
    short: 'Premium responsive websites engineered for speed, credibility and conversion.',
    hero: 'Websites that look premium and move visitors toward action.',
    detail: 'We combine interface design, responsive development, content hierarchy and conversion thinking to create websites that feel established on every screen size.',
    deliverables: ['Responsive UI/UX', 'Service and landing pages', 'Conversion-focused calls to action', 'Performance optimisation', 'Cloudflare-ready deployment', 'Custom integrations'],
    outcomes: ['Stronger first impression', 'Clearer customer journey', 'Better mobile experience', 'More qualified enquiries']
  },
  {
    slug: 'crm-systems',
    title: 'CRM Systems',
    eyebrow: 'Custom business operations',
    icon: <LayoutDashboard size={26} />,
    short: 'Custom CRM platforms for leads, customers, follow-ups, workflows and operations.',
    hero: 'A CRM shaped around the way your business actually works.',
    detail: 'Instead of forcing your team into a generic template, we map your real sales and service process and build a practical system around it.',
    deliverables: ['Lead pipelines', 'Customer records', 'Follow-up workflows', 'Role-based access', 'Dashboards and reporting', 'Custom business logic'],
    outcomes: ['Fewer missed leads', 'Clear ownership', 'More organised follow-up', 'Better visibility across the business']
  },
  {
    slug: 'social-media',
    title: 'Social Media',
    eyebrow: 'Content with commercial purpose',
    icon: <Camera size={26} />,
    short: 'Branded social content and short-form creative designed around real business goals.',
    hero: 'Social content that builds attention, trust and a reason to act.',
    detail: 'We turn your existing footage, photos, offers and expertise into a consistent visual system instead of posting disconnected content for the sake of activity.',
    deliverables: ['Short-form video concepts', 'Reels editing', 'Branded social posts', 'Content direction', 'Campaign concepts', 'Captions and calls to action'],
    outcomes: ['More consistent presence', 'Stronger brand perception', 'Clearer campaign messages', 'Content connected to business goals']
  },
  {
    slug: 'automation',
    title: 'Automation',
    eyebrow: 'Less repetitive admin',
    icon: <Workflow size={26} />,
    short: 'Connected workflows, reminders and smart handoffs that reduce repetitive work.',
    hero: 'Automate the repetitive steps without making the business complicated.',
    detail: 'We connect the parts of your workflow that should happen automatically, so your team can focus on conversations, delivery and decisions that need a human.',
    deliverables: ['Lead routing', 'Follow-up reminders', 'Status-based actions', 'Notifications', 'Workflow triggers', 'System integrations'],
    outcomes: ['Less manual work', 'Faster response times', 'More consistent processes', 'Fewer tasks falling through gaps']
  },
  {
    slug: 'conversion-growth',
    title: 'Conversion Growth',
    eyebrow: 'Turn attention into action',
    icon: <Target size={26} />,
    short: 'Landing pages, enquiry journeys and calls to action built to move prospects forward.',
    hero: 'Make the next step obvious for the right customer.',
    detail: 'We improve the path between interest and action by simplifying offers, reducing friction and designing a focused journey around one valuable outcome.',
    deliverables: ['Offer positioning', 'Landing-page journeys', 'Lead capture flows', 'Booking funnels', 'CTA optimisation', 'Follow-up structure'],
    outcomes: ['Clearer offers', 'Higher-intent enquiries', 'Less friction', 'Better handoff into follow-up']
  },
  {
    slug: 'digital-strategy',
    title: 'Digital Strategy',
    eyebrow: 'Know what to build first',
    icon: <Globe2 size={26} />,
    short: 'A joined-up approach across web, CRM, content and follow-up instead of disconnected tools.',
    hero: 'A clear digital roadmap before you spend time building the wrong things.',
    detail: 'We look at the complete journey from first impression to enquiry, follow-up and retention, then identify what should be fixed, connected or built first.',
    deliverables: ['Digital audits', 'Customer journey mapping', 'Technology planning', 'CRM strategy', 'Content planning', 'Growth roadmaps'],
    outcomes: ['Clear priorities', 'Better-connected systems', 'Less wasted effort', 'A practical sequence of next actions']
  }
];

const experienceCards = [
  ['Clear communication', 'Projects stay focused around decisions, priorities and useful next steps instead of technical noise.'],
  ['Built around the business', 'The workflow comes first. Technology is shaped around how the team and customer actually need to use it.'],
  ['Design with a purpose', 'Visual polish matters, but every page, component and workflow should have a clear job to do.']
];

function SEO({ title, description }: { title: string; description: string }) {
  React.useEffect(() => {
    document.title = `${title} | IDEA LAB`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description);
  }, [title, description]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

function Header() {
  const [open, setOpen] = React.useState(false);
  const location = useLocation();
  React.useEffect(() => setOpen(false), [location.pathname]);
  const links = [['/', 'Home'], ['/services', 'Services'], ['/work', 'Work'], ['/about', 'About'], ['/testimonials', 'Testimonials'], ['/contact', 'Contact']];

  return <>
    <header className="topbar">
      <Link className="brand" to="/"><img src="/idealab-logo.jpg" alt="IDEA LAB" /><span className="brand-wordmark">IDEA LAB</span></Link>
      <nav className="desktop-nav">{links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>)}</nav>
      <Link className="nav-cta desktop-only" to="/contact">Start a Project <ArrowRight size={16} /></Link>
      <button className="mobile-toggle" onClick={() => setOpen(v => !v)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
    </header>
    {open && <nav className="mobile-menu">{links.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}<Link className="mobile-menu-cta" to="/contact">Start a Project <ArrowRight size={15} /></Link></nav>}
  </>;
}

function Footer() {
  return <footer>
    <div className="footer-brand"><div className="footer-logo-row"><img src="/idealab-logo.jpg" alt="IDEA LAB" /><strong>IDEA LAB</strong></div><p>Premium websites, CRM systems, social content and automation for modern service businesses.</p></div>
    <div className="footer-links"><div><strong>Services</strong><Link to="/services/web-development">Web Development</Link><Link to="/services/crm-systems">CRM Systems</Link><Link to="/services/social-media">Social Media</Link><Link to="/services/automation">Automation</Link></div><div><strong>IDEA LAB</strong><Link to="/about">About</Link><Link to="/work">Work</Link><Link to="/testimonials">Testimonials</Link><Link to="/contact">Contact</Link></div></div>
    <div className="footer-bottom"><span>© 2026 IDEA LAB. All rights reserved.</span><span>Digital systems built for growth.</span></div>
  </footer>;
}

function HomePage() {
  return <>
    <SEO title="Digital Systems That Grow Businesses" description="IDEA LAB builds premium websites, CRM systems, social content and automation for service businesses." />
    <section className="home-hero">
      <div className="hero-grid-pattern" /><div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
      <div className="home-hero-copy">
        <div className="eyebrow"><Sparkles size={15} /> Digital systems built for growth</div>
        <h1>Better digital experiences.<span>Smarter business systems.</span></h1>
        <p>IDEA LAB connects premium web design, custom CRM, social content and automation so your customer journey and internal workflow work together.</p>
        <div className="hero-actions"><Link className="primary-btn" to="/contact">Start a Project <ArrowRight size={17} /></Link><Link className="secondary-btn" to="/work">Explore Our Work</Link></div>
        <div className="home-proof-row"><div><strong>Web</strong><span>Responsive & conversion-focused</span></div><div><strong>CRM</strong><span>Built around your workflow</span></div><div><strong>Growth</strong><span>Content + follow-up connected</span></div></div>
      </div>
      <div className="home-hero-visual"><SystemVisual /></div>
    </section>
    <section className="industry-strip"><span>Healthcare</span><span>Hospitality</span><span>Creative</span><span>Property</span><span>Professional Services</span></section>
    <section className="section section-light"><SectionHeading eyebrow="CORE CAPABILITIES" title="Build the parts that actually move the business." text="Start with one problem or connect multiple services into a complete digital system." /><ServiceGrid /></section>
    <section className="section home-process-section"><div className="split-heading"><div><span className="section-kicker">HOW WE THINK</span><h2>Start with the business problem. Then choose the technology.</h2></div><p>Good digital work is not about adding more software. It is about removing friction between your customer, your team and the next important action.</p></div><ProcessGrid /></section>
    <section className="section section-white"><SectionHeading eyebrow="SELECTED WORK" title="Web experiences built around different customer journeys." text="A selection of website work across property, healthcare and professional services." align="left" /><PortfolioGrid /><div className="section-action"><Link className="primary-btn" to="/work">View All Work <ArrowRight size={16} /></Link></div></section>
    <ClientExperience compact />
    <CallToAction />
  </>;
}

function ServicesPage() {
  return <><SEO title="Services" description="Explore IDEA LAB web development, CRM, social media, automation, conversion and digital strategy services." /><PageHero eyebrow="SERVICES" title="Specialist services designed to work together." text="Use one capability to solve a focused problem or combine them into a connected customer and operations system." visual="services" /><section className="section section-light"><SectionHeading eyebrow="CAPABILITIES" title="Choose the problem you want to solve first." text="Each service has a dedicated page with its own deliverables and business outcomes." /><ServiceGrid /></section><section className="section connected-section"><div className="connected-copy"><span className="section-kicker">CONNECTED SYSTEMS</span><h2>Traffic matters more when the follow-up system is ready.</h2><p>Website, CRM, content and automation can work as one journey instead of separate activities.</p><Link className="text-link" to="/services/digital-strategy">Explore digital strategy <ArrowRight size={15} /></Link></div><ConnectedVisual /></section><CallToAction /></>;
}

function ServicePage({ service }: { service: Service }) {
  return <><SEO title={service.title} description={service.short} /><PageHero eyebrow={service.eyebrow} title={service.hero} text={service.detail} visual={service.slug} /><section className="section section-light"><SectionHeading eyebrow="WHAT WE CAN BUILD" title={`A focused ${service.title.toLowerCase()} system around your priorities.`} text={service.short} align="left" /><div className="deliverable-grid">{service.deliverables.map((item, i) => <FeatureTile key={item} number={i + 1} title={item} />)}</div></section><section className="section outcome-section"><div className="outcome-panel"><div><span className="section-kicker">EXPECTED IMPACT</span><h2>What this service is designed to improve.</h2></div><div className="outcome-list">{service.outcomes.map(item => <div key={item}><CheckCircle2 size={19} /><span>{item}</span></div>)}</div></div></section><CallToAction /></>;
}

function WorkPage() {
  return <><SEO title="Work" description="Explore IDEA LAB web development and logo design work." /><PageHero eyebrow="WORK" title="Digital and brand work shaped around the business." text="Explore selected website builds and logo identity work created across property, healthcare, fashion and service businesses." visual="work" />
    <section className="section section-white">
      <SectionHeading eyebrow="WEB WORK" title="Web experiences built around the customer journey." text="Selected responsive website work across property, healthcare and professional services." align="left" />
      <PortfolioGrid />
    </section>
    <section className="section section-light">
      <SectionHeading eyebrow="LOGO FOLIO" title="Brand marks built to give each business its own visual identity." text="A collection of logo and identity work across fashion, healthcare, property and professional brands." align="left" />
      <LogoFolioGrid />
    </section>
    <section className="section work-method-section"><div className="split-heading"><div><span className="section-kicker">OUR METHOD</span><h2>Strategy first. Build second.</h2></div><p>We define the problem, user journey and operating process before deciding what the website, CRM or automation needs to do.</p></div><ProcessGrid /></section><CallToAction />
  </>;
}

function AboutPage() {
  return <><SEO title="About" description="Learn how IDEA LAB combines design, development, CRM and automation." /><PageHero eyebrow="ABOUT IDEA LAB" title="Technology should make the business simpler, not heavier." text="We start with the customer journey and internal workflow, then build the right digital system around them." visual="about" /><section className="section about-story-section"><div className="about-story-copy"><span className="section-kicker">OUR APPROACH</span><h2>Design, technology and operations belong in the same conversation.</h2><p>A beautiful website can still lose leads. A powerful CRM can still be difficult to use. Social content can still create attention without creating action.</p><p>We focus on clarity, usability, responsive design, practical workflows and secure architecture rather than complexity for its own sake.</p></div><div className="principles-panel"><div><Search size={22} /><strong>Understand first</strong><span>Map the real problem before suggesting a build.</span></div><div><MonitorSmartphone size={22} /><strong>Design for real use</strong><span>Desktop, mobile, customer and staff journeys all matter.</span></div><div><Workflow size={22} /><strong>Connect the workflow</strong><span>Reduce gaps between marketing, leads and follow-up.</span></div><div><ShieldCheck size={22} /><strong>Build responsibly</strong><span>Security and maintainability are part of the design.</span></div></div></section><ClientExperience compact={false} /><CallToAction /></>;
}

function TestimonialsPage() {
  return <><SEO title="Client Experience" description="Learn about the IDEA LAB client experience and project process." /><PageHero eyebrow="CLIENT EXPERIENCE" title="Good work starts with a good working relationship." text="We keep projects focused, understandable and tied to the business goal from the first conversation through implementation." visual="testimonials" /><ClientExperience compact={false} /><section className="section section-light"><SectionHeading eyebrow="HOW PROJECTS RUN" title="Clear expectations at every stage." text="The focus stays on what is being solved, what is being built and what happens next." /><ProcessGrid /></section><CallToAction /></>;
}

function ContactPage() {
  return <><SEO title="Contact" description="Contact IDEA LAB about a website, CRM, social content or automation project." /><PageHero eyebrow="START A PROJECT" title="Tell us what you want the business to do better." text="You do not need a technical specification. Start with the problem, current process or opportunity." visual="contact" /><section className="section contact-page-section"><div className="contact-info-card"><span className="section-kicker">DIRECT CONTACT</span><h2>Start with a simple email.</h2><p>Share your business, current website or process, and the result you want to improve.</p><a className="contact-email" href="mailto:nawazidealab@gmail.com?subject=IDEA%20LAB%20Project%20Enquiry"><Mail size={20} /><span><small>Email IDEA LAB</small><strong>nawazidealab@gmail.com</strong></span><ArrowRight size={18} /></a></div><div className="brief-card"><span className="section-kicker">A USEFUL FIRST MESSAGE</span><h3>Include these four things.</h3><div className="brief-list"><Brief number="01" title="Your business" text="What you sell and who you serve." /><Brief number="02" title="The current problem" text="What is slow, confusing, manual or underperforming." /><Brief number="03" title="The desired result" text="What you want the customer or team to do better." /><Brief number="04" title="Useful links" text="Website, social profiles or current system if relevant." /></div></div></section></>;
}

function PageHero({ eyebrow, title, text, visual }: { eyebrow: string; title: string; text: string; visual: string }) {
  return <section className="page-hero"><div className="hero-grid-pattern" /><div className="page-hero-copy"><div className="eyebrow"><Sparkles size={15} /> {eyebrow}</div><h1>{title}</h1><p>{text}</p><div className="hero-actions"><Link className="primary-btn" to="/contact">Start a Project <ArrowRight size={17} /></Link><Link className="secondary-btn" to="/work">Explore Work</Link></div></div><div className="page-hero-visual"><HeroVisual type={visual} /></div></section>;
}

function HeroVisual({ type }: { type: string }) {
  const service = services.find(s => s.slug === type);
  const icon = service?.icon ?? (type === 'contact' ? <Mail size={26} /> : type === 'testimonials' ? <MessageSquare size={26} /> : type === 'about' ? <Workflow size={26} /> : <Target size={26} />);
  const title = service?.title ?? (type === 'contact' ? 'Start simply' : type === 'testimonials' ? 'Client experience' : type === 'about' ? 'IDEA LAB approach' : 'Solution thinking');
  const heading = service?.outcomes[0] ?? (type === 'contact' ? 'Bring the problem. We can shape the solution.' : type === 'testimonials' ? 'Clear, practical and collaborative.' : 'Different businesses need different journeys.');
  const text = service?.short ?? 'The right system depends on the customer journey, business model and workflow.';
  const features = service?.deliverables.slice(0, 3) ?? ['Clear scope', 'Responsive design', 'Practical implementation'];
  return <div className="visual-panel"><div className="visual-panel-icon">{icon}</div><span>{title}</span><h3>{heading}</h3><p>{text}</p><div className="visual-feature-list">{features.map(item => <div key={item}><CheckCircle2 size={15} />{item}</div>)}</div></div>;
}

function SystemVisual() {
  return <><div className="system-window"><div className="system-window-top"><div><span /><span /><span /></div><small>IDEA LAB / growth system</small></div><div className="system-dashboard"><div className="system-sidebar"><div className="mini-logo">IL</div><span className="system-nav-active" /><span /><span /><span /><span /></div><div className="system-main"><div className="system-heading"><div><small>Growth overview</small><strong>Connected systems</strong></div><div className="system-avatar">IL</div></div><div className="system-stats"><div><small>Website</small><strong>Fast</strong></div><div><small>CRM</small><strong>Custom</strong></div><div><small>Content</small><strong>Focused</strong></div></div><div className="system-chart" /><div className="system-list"><span /><span /><span /></div></div></div></div><div className="floating-card"><BarChart3 size={19} /><div><small>One connected approach</small><strong>Design → leads → follow-up</strong></div></div></>;
}

function SectionHeading({ eyebrow, title, text, align = 'center' }: { eyebrow: string; title: string; text: string; align?: 'left' | 'center' }) {
  return <div className={`section-heading ${align === 'left' ? 'section-heading-left' : ''}`}><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>;
}

function ServiceGrid() {
  return <div className="service-grid">{services.map((service, i) => <motion.article className="service-card" key={service.slug} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .04 }}><div className="service-icon">{service.icon}</div><span className="card-eyebrow">{service.eyebrow}</span><h3>{service.title}</h3><p>{service.short}</p><Link to={`/services/${service.slug}`}>Explore {service.title} <ArrowRight size={15} /></Link></motion.article>)}</div>;
}

function PortfolioGrid() {
  return <div className="solution-grid">{portfolioItems.map((item, i) => <motion.article className="solution-card" key={item.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .04 }}><div className="solution-image"><img src={item.image} alt={item.title} /><div className="solution-category">{item.category}</div></div><div className="solution-copy"><h3>{item.title}</h3><p>{item.description}</p></div></motion.article>)}</div>;
}

function LogoFolioGrid() {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 230px), 1fr))', gap: '16px' }}>
    {logoFolioItems.map((item, i) => <motion.article key={item.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * .035 }} style={{ overflow: 'hidden', border: '1px solid #dedfe2', borderRadius: '20px', background: '#fff', boxShadow: '0 14px 36px rgba(0,0,0,.04)' }}>
      <div style={{ aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', padding: '20px', overflow: 'hidden', background: '#f7f7f5' }}>
        <img src={item.image} alt={`${item.title} logo`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div style={{ padding: '17px 18px 20px' }}>
        <span style={{ color: '#ef2b2d', fontSize: '9px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase' }}>{item.tag}</span>
        <h3 style={{ margin: '7px 0 0', color: '#121318', fontSize: '17px' }}>{item.title}</h3>
      </div>
    </motion.article>)}
  </div>;
}

function ProcessGrid() {
  const rows = [['Discover', 'Understand the business and customer first.'], ['Design', 'Shape the journey around the most important actions.'], ['Build', 'Develop a responsive, maintainable system.'], ['Refine', 'Test the real flow and remove friction.']];
  return <div className="process-grid">{rows.map(([title, text], i) => <article className="process-card" key={title}><span>{String(i + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>)}</div>;
}

function FeatureTile({ number, title }: { number: number; title: string }) {
  return <article className="feature-tile"><span>{String(number).padStart(2, '0')}</span><h3>{title}</h3><p>Configured around the customer journey, workflow and priorities of the business.</p></article>;
}

function ClientExperience({ compact }: { compact: boolean }) {
  return <section className={`section client-experience-section ${compact ? 'client-experience-compact' : ''}`}><SectionHeading eyebrow="CLIENT EXPERIENCE" title="Professional digital work should feel clear from the client side too." text="Our working style is built around clarity, useful communication and solutions that make sense for the business." /><div className="testimonial-grid">{experienceCards.map(([title, text]) => <article className="testimonial-card" key={title}><MessageSquare size={23} /><h3>{title}</h3><p>{text}</p><div className="testimonial-signoff"><span>IDEA LAB</span><small>Client experience principle</small></div></article>)}</div>{compact && <div className="section-action centered"><Link className="text-link" to="/testimonials">View client experience <ArrowRight size={15} /></Link></div>}</section>;
}

function ConnectedVisual() {
  return <div className="connected-visual"><div className="connected-node connected-node-main">IDEA LAB</div><div className="connected-node connected-node-web">Website</div><div className="connected-node connected-node-crm">CRM</div><div className="connected-node connected-node-content">Content</div><div className="connected-node connected-node-auto">Automation</div><span className="connection-line line-one" /><span className="connection-line line-two" /><span className="connection-line line-three" /><span className="connection-line line-four" /></div>;
}

function Brief({ number, title, text }: { number: string; title: string; text: string }) {
  return <div><b>{number}</b><span><strong>{title}</strong><small>{text}</small></span></div>;
}

function CallToAction() {
  return <section className="section cta-section"><div className="cta-panel"><div><span className="section-kicker">START A PROJECT</span><h2>Bring the business problem. We’ll help shape the digital solution.</h2><p>Website, CRM, content, automation or a connected system — the first step is understanding what needs to work better.</p></div><div className="cta-actions"><Link className="primary-btn" to="/contact">Start a Conversation <ArrowRight size={17} /></Link><a className="secondary-btn" href="mailto:nawazidealab@gmail.com">Email IDEA LAB</a></div></div></section>;
}

function NotFoundPage() {
  return <section className="not-found-page"><SEO title="Page Not Found" description="IDEA LAB" /><span className="eyebrow">404</span><h1>That page does not exist.</h1><p>Return home or explore our services.</p><div className="hero-actions"><Link className="primary-btn" to="/">Back Home</Link><Link className="secondary-btn" to="/services">View Services</Link></div></section>;
}

function App() {
  return <div className="site-shell"><ScrollToTop /><Header /><main><Routes><Route path="/" element={<HomePage />} /><Route path="/services" element={<ServicesPage />} />{services.map(service => <Route key={service.slug} path={`/services/${service.slug}`} element={<ServicePage service={service} />} />)}<Route path="/work" element={<WorkPage />} /><Route path="/about" element={<AboutPage />} /><Route path="/testimonials" element={<TestimonialsPage />} /><Route path="/contact" element={<ContactPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></main><Footer /></div>;
}

export default App;
