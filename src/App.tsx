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

type Service = {
  slug: string;
  title: string;
  eyebrow: string;
  icon: React.ReactNode;
  short: string;
  hero: string;
  detail: string;
  deliverables: string[];
  bestFor: string[];
  outcomes: string[];
  process: string[];
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
    bestFor: ['Professional services', 'Clinics and practices', 'Hospitality brands', 'Creative businesses', 'Property businesses', 'Growing service companies'],
    outcomes: ['Stronger first impression', 'Clearer customer journey', 'Better mobile experience', 'More qualified enquiries'],
    process: ['Define the customer journey', 'Create the visual direction', 'Build responsive components', 'Test performance and conversion flow']
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
    bestFor: ['Dental and aesthetic clinics', 'Restaurants and hospitality', 'Property teams', 'Agencies', 'Consultancies', 'Appointment-based businesses'],
    outcomes: ['Fewer missed leads', 'Clear ownership', 'More organised follow-up', 'Better visibility across the business'],
    process: ['Map the existing workflow', 'Define roles and statuses', 'Build the operational dashboard', 'Test with real daily scenarios']
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
    bestFor: ['Visual service brands', 'Clinics', 'Restaurants', 'Creative studios', 'Property businesses', 'Founder-led businesses'],
    outcomes: ['More consistent presence', 'Stronger brand perception', 'Clearer campaign messages', 'Content connected to business goals'],
    process: ['Define the content pillars', 'Build a visual language', 'Create campaign-ready assets', 'Review performance and refine']
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
    bestFor: ['Sales teams', 'Operations teams', 'Service businesses', 'Appointment workflows', 'Lead-heavy businesses', 'Small teams scaling up'],
    outcomes: ['Less manual work', 'Faster response times', 'More consistent processes', 'Fewer tasks falling through gaps'],
    process: ['Identify repetitive work', 'Choose the safest automation points', 'Connect the workflow', 'Monitor and refine']
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
    bestFor: ['High-value treatments', 'Service campaigns', 'Property enquiries', 'Restaurant launches', 'Consultation businesses', 'Lead-generation campaigns'],
    outcomes: ['Clearer offers', 'Higher-intent enquiries', 'Less friction', 'Better handoff into follow-up'],
    process: ['Choose the conversion goal', 'Remove unnecessary steps', 'Build the focused journey', 'Connect the follow-up path']
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
    bestFor: ['Businesses with disconnected tools', 'New ventures', 'Rebrands', 'Teams changing systems', 'Businesses with weak follow-up', 'Founders planning digital investment'],
    outcomes: ['Clear priorities', 'Better-connected systems', 'Less wasted effort', 'A practical sequence of next actions'],
    process: ['Audit the current setup', 'Map customer and team journeys', 'Prioritise the highest-value gaps', 'Create the implementation roadmap']
  }
];

const solutionCards = [
  {
    title: 'Healthcare Growth System',
    category: 'CRM + Website',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=82',
    description: 'Treatment-led landing pages, enquiry capture, follow-up stages and consultation-oriented workflows.'
  },
  {
    title: 'Hospitality Customer Platform',
    category: 'CRM + Retention',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=82',
    description: 'Customer profiles, reservations, VIP segmentation, feedback and repeat-visit campaign structure.'
  },
  {
    title: 'Creative Business Experience',
    category: 'Website + Social',
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1400&q=82',
    description: 'Premium web presentation and content direction for studios, photographers, printers, galleries and artists.'
  },
  {
    title: 'Property Lead Journey',
    category: 'Lead Generation',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=82',
    description: 'Seller enquiry capture, appraisal calls to action, lead qualification and structured follow-up.'
  }
];

const clientExperience = [
  {
    title: 'Clear communication',
    text: 'Projects stay focused around decisions, priorities and useful next steps instead of technical noise.'
  },
  {
    title: 'Built around the business',
    text: 'The workflow comes first. Technology is shaped around how the team and customer actually need to use it.'
  },
  {
    title: 'Design with a purpose',
    text: 'Visual polish matters, but every page, component and workflow should have a clear job to do.'
  }
];

function SEO({ title, description }: { title: string; description: string }) {
  React.useEffect(() => {
    document.title = `${title} | IDEA LAB`;
    const descriptionTag = document.querySelector('meta[name="description"]');
    if (descriptionTag) descriptionTag.setAttribute('content', description);
  }, [title, description]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  React.useEffect(() => window.scrollTo({ top: 0, behavior: 'auto' }), [pathname]);
  return null;
}

function Header() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const location = useLocation();
  React.useEffect(() => setMobileOpen(false), [location.pathname]);

  const nav = [
    ['/', 'Home'],
    ['/services', 'Services'],
    ['/work', 'Work'],
    ['/about', 'About'],
    ['/testimonials', 'Testimonials'],
    ['/contact', 'Contact']
  ];

  return (
    <>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="IDEA LAB home">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
          <span className="brand-wordmark">IDEA LAB</span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {nav.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'}>{label}</NavLink>
          ))}
        </nav>

        <Link className="nav-cta desktop-only" to="/contact">
          Start a Project <ArrowRight size={16} />
        </Link>

        <button className="mobile-toggle" onClick={() => setMobileOpen(v => !v)} aria-label="Toggle navigation" aria-expanded={mobileOpen}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>

      {mobileOpen && (
        <motion.nav className="mobile-menu" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} aria-label="Mobile navigation">
          {nav.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
          <Link className="mobile-menu-cta" to="/contact">Start a Project <ArrowRight size={15} /></Link>
        </motion.nav>
      )}
    </>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-brand">
        <div className="footer-logo-row"><img src="/idealab-logo.jpg" alt="IDEA LAB" /><strong>IDEA LAB</strong></div>
        <p>Premium websites, CRM systems, social content and automation for modern service businesses.</p>
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
          <Link to="/testimonials">Testimonials</Link>
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
      <SEO title="Digital Systems That Grow Businesses" description="IDEA LAB builds premium websites, CRM systems, social content and automation for service businesses." />

      <section className="home-hero">
        <div className="hero-grid-pattern" />
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <motion.div className="home-hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
          <div className="eyebrow"><Sparkles size={15} /> Digital systems built for growth</div>
          <h1>Better digital experiences.<span>Smarter business systems.</span></h1>
          <p>IDEA LAB connects premium web design, custom CRM, social content and automation so your customer journey and internal workflow work together.</p>
          <div className="hero-actions">
            <Link className="primary-btn" to="/contact">Start a Project <ArrowRight size={17} /></Link>
            <Link className="secondary-btn" to="/work">Explore Our Work</Link>
          </div>
          <div className="home-proof-row">
            <div><strong>Web</strong><span>Responsive & conversion-focused</span></div>
            <div><strong>CRM</strong><span>Built around your workflow</span></div>
            <div><strong>Growth</strong><span>Content + follow-up connected</span></div>
          </div>
        </motion.div>

        <motion.div className="home-hero-visual" initial={{ opacity: 0, x: 30, scale: .96 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: .8 }}>
          <div className="system-window">
            <div className="system-window-top"><div><span /><span /><span /></div><small>IDEA LAB / growth system</small></div>
            <div className="system-dashboard">
              <div className="system-sidebar">
                <div className="mini-logo">IL</div>
                <span className="system-nav-active" /><span /><span /><span /><span />
              </div>
              <div className="system-main">
                <div className="system-heading"><div><small>Growth overview</small><strong>Connected systems</strong></div><div className="system-avatar">IL</div></div>
                <div className="system-stats">
                  <div><small>Website</small><strong>Fast</strong></div>
                  <div><small>CRM</small><strong>Custom</strong></div>
                  <div><small>Content</small><strong>Focused</strong></div>
                </div>
                <div className="system-chart"><div className="chart-line" /></div>
                <div className="system-list"><span /><span /><span /></div>
              </div>
            </div>
          </div>
          <motion.div className="floating-card" animate={{ y: [0, -7, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            <BarChart3 size={19} /><div><small>One connected approach</small><strong>Design → leads → follow-up</strong></div>
          </motion.div>
        </motion.div>
      </section>

      <section className="industry-strip">
        <span>Healthcare</span><span>Hospitality</span><span>Creative</span><span>Property</span><span>Professional Services</span>
      </section>

      <section className="section section-light">
        <SectionHeading eyebrow="CORE CAPABILITIES" title="Build the parts that actually move the business." text="Start with one problem or connect multiple services into a complete digital system." />
        <ServiceGrid limit={6} />
      </section>

      <section className="section home-process-section">
        <div className="split-heading">
          <div><span className="section-kicker">HOW WE THINK</span><h2>Start with the business problem. Then choose the technology.</h2></div>
          <p>Good digital work is not about adding more software. It is about removing friction between your customer, your team and the next important action.</p>
        </div>
        <ProcessGrid />
      </section>

      <section className="section section-white">
        <SectionHeading eyebrow="SOLUTIONS IN ACTION" title="Different industries. Different journeys." text="Our approach changes with the business model, customer behaviour and operational need." align="left" />
        <SolutionGrid />
        <div className="section-action"><Link className="primary-btn" to="/work">Explore Work & Capabilities <ArrowRight size={16} /></Link></div>
      </section>

      <ClientExperience compact />
      <CallToAction />
    </>
  );
}

function ServicesPage() {
  return (
    <>
      <SEO title="Services" description="Explore IDEA LAB web development, CRM, social media, automation, conversion and digital strategy services." />
      <PageHero eyebrow="SERVICES" title="Specialist services designed to work together." text="Use one capability to solve a focused problem or combine them into a connected customer and operations system." visual="services" />
      <section className="section section-light">
        <SectionHeading eyebrow="CAPABILITIES" title="Choose the problem you want to solve first." text="Every service has its own page with deeper detail, deliverables, use cases and expected business impact." />
        <ServiceGrid limit={6} />
      </section>
      <section className="section connected-section">
        <div className="connected-copy"><span className="section-kicker">THE CONNECTED ADVANTAGE</span><h2>Website traffic is more valuable when the follow-up system is ready.</h2><p>We can connect the front-end experience with lead capture, CRM stages, content and automation so the journey does not stop after someone clicks.</p><Link className="text-link" to="/services/digital-strategy">See how the pieces connect <ArrowRight size={15} /></Link></div>
        <ConnectedVisual />
      </section>
      <CallToAction />
    </>
  );
}

function ServicePage({ service }: { service: Service }) {
  return (
    <>
      <SEO title={service.title} description={`${service.title} by IDEA LAB — ${service.short}`} />
      <PageHero eyebrow={service.eyebrow} title={service.hero} text={service.detail} visual={service.slug} />

      <section className="section section-light">
        <SectionHeading eyebrow="WHAT WE CAN BUILD" title={`A focused ${service.title.toLowerCase()} system around your priorities.`} text={service.short} align="left" />
        <div className="deliverable-grid">
          {service.deliverables.map((item, index) => <FeatureTile key={item} number={index + 1} title={item} />)}
        </div>
      </section>

      <section className="section audience-section">
        <div className="audience-copy"><span className="section-kicker">WHO IT FITS</span><h2>Useful when the current process is creating friction.</h2><p>The exact implementation changes by business, but these are common situations where this service creates the most value.</p></div>
        <div className="audience-list">{service.bestFor.map(item => <div key={item}><CheckCircle2 size={18} /><span>{item}</span></div>)}</div>
      </section>

      <section className="section section-white">
        <SectionHeading eyebrow="OUR PROCESS" title="A clear path from idea to working system." text="The work stays structured so design and technology remain tied to a real business outcome." />
        <div className="process-grid service-process-grid">
          {service.process.map((item, index) => <ProcessCard key={item} number={index + 1} title={item} />)}
        </div>
      </section>

      <section className="section outcome-section">
        <div className="outcome-panel">
          <div><span className="section-kicker">EXPECTED IMPACT</span><h2>What we design the system to improve.</h2></div>
          <div className="outcome-list">{service.outcomes.map(item => <div key={item}><CheckCircle2 size={19} /><span>{item}</span></div>)}</div>
        </div>
      </section>

      <CallToAction />
    </>
  );
}

function WorkPage() {
  return (
    <>
      <SEO title="Work & Capabilities" description="Explore IDEA LAB digital solution directions across healthcare, hospitality, creative and property businesses." />
      <PageHero eyebrow="WORK & CAPABILITIES" title="Digital systems shaped around the business model." text="The same template does not work for every company. We design around the customer journey, operational need and commercial goal." visual="work" />
      <section className="section section-white"><SolutionGrid /></section>
      <section className="section work-method-section">
        <div className="split-heading"><div><span className="section-kicker">OUR METHOD</span><h2>Strategy first. Build second.</h2></div><p>We define the problem, user journey and operating process before deciding what the website, CRM or automation needs to do.</p></div>
        <ProcessGrid />
      </section>
      <section className="section section-light">
        <SectionHeading eyebrow="INDUSTRY THINKING" title="The system changes with the customer." text="A clinic consultation funnel behaves differently from a restaurant retention system or a property appraisal journey." />
        <div className="industry-card-grid">
          <IndustryCard title="Healthcare" text="Treatment enquiries, consultation follow-up and patient lead visibility." />
          <IndustryCard title="Hospitality" text="Reservations, customer recognition, feedback and repeat-visit campaigns." />
          <IndustryCard title="Creative" text="Premium presentation, service discovery, portfolio storytelling and enquiries." />
          <IndustryCard title="Property" text="Seller lead capture, appraisal journeys, qualification and structured follow-up." />
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function AboutPage() {
  return (
    <>
      <SEO title="About" description="Learn how IDEA LAB approaches web development, CRM, content and automation as one connected digital system." />
      <PageHero eyebrow="ABOUT IDEA LAB" title="Technology should make the business simpler, not heavier." text="IDEA LAB is built around a practical idea: understand the customer journey and internal workflow first, then build the right digital system around them." visual="about" />

      <section className="section about-story-section">
        <div className="about-story-copy"><span className="section-kicker">OUR APPROACH</span><h2>Design, technology and operations belong in the same conversation.</h2><p>A beautiful website can still lose leads. A powerful CRM can still be difficult to use. Social content can still create attention without creating action. We focus on how these pieces work together.</p><p>That means prioritising clarity, usability, responsive design, practical workflows and secure architecture rather than adding complexity for its own sake.</p></div>
        <div className="principles-panel">
          <div><Search size={22} /><strong>Understand first</strong><span>Map the real problem before suggesting a build.</span></div>
          <div><MonitorSmartphone size={22} /><strong>Design for real use</strong><span>Desktop, mobile, customer and staff journeys all matter.</span></div>
          <div><Workflow size={22} /><strong>Connect the workflow</strong><span>Reduce gaps between marketing, leads and follow-up.</span></div>
          <div><ShieldCheck size={22} /><strong>Build responsibly</strong><span>Security and maintainability are part of the system design.</span></div>
        </div>
      </section>

      <section className="section section-light">
        <SectionHeading eyebrow="WHAT WE VALUE" title="Premium does not have to mean complicated." text="The goal is a system that feels polished to customers and straightforward to the people using it every day." />
        <div className="value-grid">
          <ValueCard title="Clarity" text="Clear pages, clear workflows and clear next actions." />
          <ValueCard title="Purpose" text="Every feature should solve a real problem or support a measurable objective." />
          <ValueCard title="Flexibility" text="Systems should adapt as the business changes rather than becoming a dead end." />
        </div>
      </section>
      <ClientExperience compact={false} />
      <CallToAction />
    </>
  );
}

function TestimonialsPage() {
  return (
    <>
      <SEO title="Client Experience" description="See the principles that shape the IDEA LAB client experience, from communication and design to practical implementation." />
      <PageHero eyebrow="CLIENT EXPERIENCE" title="Good work starts with a good working relationship." text="We keep projects focused, understandable and tied to the business goal from the first conversation through implementation." visual="testimonials" />
      <ClientExperience compact={false} />
      <section className="section section-light">
        <SectionHeading eyebrow="WHAT WORKING TOGETHER LOOKS LIKE" title="Clear expectations at every stage." text="No unnecessary technical theatre. The focus stays on what is being solved, what is being built and what happens next." />
        <div className="process-grid">
          <ProcessCard number={1} title="Clear scope" text="Agree the priority, outcome and boundaries before development starts." />
          <ProcessCard number={2} title="Visible progress" text="Review meaningful milestones rather than waiting until the end to see the direction." />
          <ProcessCard number={3} title="Practical handover" text="Keep the final system understandable and usable for the people who need it." />
          <ProcessCard number={4} title="Room to improve" text="Build a foundation that can be refined as real usage and business needs evolve." />
        </div>
      </section>
      <CallToAction />
    </>
  );
}

function ContactPage() {
  return (
    <>
      <SEO title="Contact" description="Contact IDEA LAB to discuss a website, CRM, social content, automation or connected digital growth system." />
      <PageHero eyebrow="START A PROJECT" title="Tell us what you want the business to do better." text="You do not need a technical specification. Start with the problem, current process or opportunity and we can work from there." visual="contact" />

      <section className="section contact-page-section">
        <div className="contact-info-card">
          <span className="section-kicker">DIRECT CONTACT</span><h2>Start with a simple email.</h2><p>Share your website, business type, current process and the result you want to improve. A short brief is enough to start.</p>
          <a className="contact-email" href="mailto:nawazidealab@gmail.com?subject=IDEA%20LAB%20Project%20Enquiry"><Mail size={20} /><span><small>Email IDEA LAB</small><strong>nawazidealab@gmail.com</strong></span><ArrowRight size={18} /></a>
        </div>
        <div className="brief-card">
          <span className="section-kicker">A USEFUL FIRST MESSAGE</span><h3>Include these four things.</h3>
          <div className="brief-list">
            <div><b>01</b><span><strong>Your business</strong><small>What you sell and who you serve.</small></span></div>
            <div><b>02</b><span><strong>The current problem</strong><small>What is slow, confusing, manual or underperforming.</small></span></div>
            <div><b>03</b><span><strong>The desired result</strong><small>What you want the customer or team to do better.</small></span></div>
            <div><b>04</b><span><strong>Useful links</strong><small>Your website, social profiles or current system if relevant.</small></span></div>
          </div>
        </div>
      </section>

      <section className="section section-light">
        <SectionHeading eyebrow="COMMON STARTING POINTS" title="You can come to us with a problem, not a solution." text="These are common reasons businesses start a conversation with IDEA LAB." />
        <div className="value-grid">
          <ValueCard title="Our website feels weak" text="We can review positioning, structure, mobile experience and conversion paths." />
          <ValueCard title="Leads are getting lost" text="We can map the follow-up process and design a CRM workflow around it." />
          <ValueCard title="Our digital activity is disconnected" text="We can connect web, content, lead capture and automation into a clearer system." />
        </div>
      </section>
    </>
  );
}

function NotFoundPage() {
  return <><SEO title="Page Not Found" description="IDEA LAB" /><section className="not-found-page"><span className="eyebrow">404</span><h1>That page does not exist.</h1><p>Return to the IDEA LAB homepage or explore our services.</p><div className="hero-actions"><Link className="primary-btn" to="/">Back Home</Link><Link className="secondary-btn" to="/services">View Services</Link></div></section></>;
}

function PageHero({ eyebrow, title, text, visual }: { eyebrow: string; title: string; text: string; visual: string }) {
  return (
    <section className="page-hero">
      <div className="hero-grid-pattern" />
      <motion.div className="page-hero-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
        <div className="eyebrow"><Sparkles size={15} /> {eyebrow}</div><h1>{title}</h1><p>{text}</p>
        <div className="hero-actions"><Link className="primary-btn" to="/contact">Start a Project <ArrowRight size={17} /></Link><Link className="secondary-btn" to="/work">Explore Work</Link></div>
      </motion.div>
      <motion.div className="page-hero-visual" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .75 }}>
        <HeroVisual type={visual} />
      </motion.div>
    </section>
  );
}

function HeroVisual({ type }: { type: string }) {
  const service = services.find(item => item.slug === type);
  if (service) {
    return <div className="visual-panel"><div className="visual-panel-icon">{service.icon}</div><span>{service.title}</span><h3>{service.outcomes[0]}</h3><p>{service.short}</p><div className="visual-feature-list">{service.deliverables.slice(0, 3).map(item => <div key={item}><CheckCircle2 size={15} />{item}</div>)}</div></div>;
  }
  if (type === 'work') return <div className="visual-panel"><div className="visual-panel-icon"><Target size={26} /></div><span>Solution thinking</span><h3>Different businesses need different journeys.</h3><p>Customer behaviour, offer value and team workflow shape the system.</p><div className="visual-feature-list"><div><CheckCircle2 size={15}/>Healthcare</div><div><CheckCircle2 size={15}/>Hospitality</div><div><CheckCircle2 size={15}/>Property & creative</div></div></div>;
  if (type === 'about') return <div className="visual-panel"><div className="visual-panel-icon"><Workflow size={26} /></div><span>IDEA LAB approach</span><h3>Connect the experience to the workflow.</h3><p>Design, systems and follow-up are stronger when they are planned together.</p><div className="visual-feature-list"><div><CheckCircle2 size={15}/>Understand</div><div><CheckCircle2 size={15}/>Design</div><div><CheckCircle2 size={15}/>Build responsibly</div></div></div>;
  if (type === 'testimonials') return <div className="visual-panel"><div className="visual-panel-icon"><MessageSquare size={26} /></div><span>Client experience</span><h3>Clear, practical and collaborative.</h3><p>A professional process should make complex digital work easier to understand.</p><div className="visual-feature-list"><div><CheckCircle2 size={15}/>Clear scope</div><div><CheckCircle2 size={15}/>Visible progress</div><div><CheckCircle2 size={15}/>Practical delivery</div></div></div>;
  if (type === 'contact') return <div className="visual-panel"><div className="visual-panel-icon"><Mail size={26} /></div><span>Start simply</span><h3>Bring the problem. We can shape the solution.</h3><p>A website link and a short explanation of what you want to improve is enough to begin.</p><div className="visual-feature-list"><div><CheckCircle2 size={15}/>No technical brief required</div><div><CheckCircle2 size={15}/>Focused next step</div><div><CheckCircle2 size={15}/>Direct conversation</div></div></div>;
  return <ConnectedVisual />;
}

function SectionHeading({ eyebrow, title, text, align = 'center' }: { eyebrow: string; title: string; text: string; align?: 'left' | 'center' }) {
  return <div className={`section-heading ${align === 'left' ? 'section-heading-left' : ''}`}><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div>;
}

function ServiceGrid({ limit }: { limit: number }) {
  return <div className="service-grid">{services.slice(0, limit).map((service, index) => <motion.article className="service-card" key={service.slug} initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .05 }} whileHover={{ y: -5 }}><div className="service-icon">{service.icon}</div><span className="card-eyebrow">{service.eyebrow}</span><h3>{service.title}</h3><p>{service.short}</p><Link to={`/services/${service.slug}`}>Explore {service.title} <ArrowRight size={15} /></Link></motion.article>)}</div>;
}

function SolutionGrid() {
  return <div className="solution-grid">{solutionCards.map((project, index) => <motion.article className="solution-card" key={project.title} initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .07 }}><div className="solution-image"><img src={project.image} alt={project.title} /><div className="solution-category">{project.category}</div></div><div className="solution-copy"><h3>{project.title}</h3><p>{project.description}</p></div></motion.article>)}</div>;
}

function ProcessGrid() {
  const items = [
    ['Discover', 'Understand the business, customer and current friction before choosing a solution.'],
    ['Design', 'Shape the journey, interface and workflow around the most important actions.'],
    ['Build', 'Develop the system with responsive behaviour, maintainability and security in mind.'],
    ['Refine', 'Test the real flow, remove friction and improve the parts that matter most.']
  ];
  return <div className="process-grid">{items.map(([title, text], index) => <ProcessCard key={title} number={index + 1} title={title} text={text} />)}</div>;
}

function ProcessCard({ number, title, text = 'Designed around your workflow, customer journey and business priorities.' }: { number: number; title: string; text?: string }) {
  return <article className="process-card"><span>{String(number).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>;
}

function FeatureTile({ number, title }: { number: number; title: string }) {
  return <motion.article className="feature-tile" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}><span>{String(number).padStart(2, '0')}</span><h3>{title}</h3><p>Configured around the specific customer journey, workflow and priorities of the business.</p></motion.article>;
}

function IndustryCard({ title, text }: { title: string; text: string }) {
  return <article className="industry-card"><div className="industry-icon"><Target size={20} /></div><h3>{title}</h3><p>{text}</p></article>;
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return <article className="value-card"><CheckCircle2 size={22} /><h3>{title}</h3><p>{text}</p></article>;
}

function ClientExperience({ compact }: { compact: boolean }) {
  return <section className={`section client-experience-section ${compact ? 'client-experience-compact' : ''}`}><SectionHeading eyebrow="CLIENT EXPERIENCE" title="Professional digital work should feel clear from the client side too." text="Our working style is built around clarity, useful communication and solutions that make sense for the business." /><div className="testimonial-grid">{clientExperience.map((item, index) => <motion.article className="testimonial-card" key={item.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * .08 }}><MessageSquare size={23} /><h3>{item.title}</h3><p>{item.text}</p><div className="testimonial-signoff"><span>IDEA LAB</span><small>Client experience principle</small></div></motion.article>)}</div>{compact && <div className="section-action centered"><Link className="text-link" to="/testimonials">Explore the client experience <ArrowRight size={15} /></Link></div>}</section>;
}

function ConnectedVisual() {
  return <div className="connected-visual"><div className="connected-node connected-node-main">IDEA LAB</div><div className="connected-node connected-node-web">Website</div><div className="connected-node connected-node-crm">CRM</div><div className="connected-node connected-node-content">Content</div><div className="connected-node connected-node-auto">Automation</div><span className="connection-line line-one"/><span className="connection-line line-two"/><span className="connection-line line-three"/><span className="connection-line line-four"/></div>;
}

function CallToAction() {
  return <section className="section cta-section"><motion.div className="cta-panel" initial={{ opacity: 0, scale: .98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}><div><span className="section-kicker">START A PROJECT</span><h2>Bring the business problem. We’ll help shape the digital solution.</h2><p>Website, CRM, content, automation or a connected system — the first step is understanding what needs to work better.</p></div><div className="cta-actions"><Link className="primary-btn" to="/contact">Start a Conversation <ArrowRight size={17} /></Link><a className="secondary-btn" href="mailto:nawazidealab@gmail.com">Email IDEA LAB</a></div></motion.div></section>;
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
          <Route path="/testimonials" element={<TestimonialsPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;
