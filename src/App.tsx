import React from 'react';
import { motion } from 'framer-motion';
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
  icon: React.ReactNode;
  title: string;
  description: string;
};

type Project = {
  title: string;
  category: string;
  image: string;
  description: string;
};

const services: Service[] = [
  {
    icon: <Code2 size={28} />,
    title: 'Web Development',
    description: 'Premium responsive websites engineered for speed, clarity, credibility and conversion.'
  },
  {
    icon: <LayoutDashboard size={28} />,
    title: 'CRM Systems',
    description: 'Custom CRM platforms for leads, customers, follow-ups, workflows, projects and operations.'
  },
  {
    icon: <Camera size={28} />,
    title: 'Social Media',
    description: 'Branded content systems, short-form creative and campaigns designed around business goals.'
  },
  {
    icon: <Workflow size={28} />,
    title: 'Automation',
    description: 'Connected workflows, reminders and smart handoffs that reduce repetitive admin work.'
  },
  {
    icon: <Target size={28} />,
    title: 'Conversion Growth',
    description: 'Landing pages, enquiry journeys and stronger calls-to-action built to move prospects forward.'
  },
  {
    icon: <Globe2 size={28} />,
    title: 'Digital Strategy',
    description: 'A joined-up approach across web, CRM, content and follow-up instead of disconnected tools.'
  }
];

const projects: Project[] = [
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

function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navItems = ['home', 'services', 'work', 'about', 'contact'];

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#home" aria-label="IDEA LAB home">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
        </a>

        <nav className="desktop-nav">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="nav-cta desktop-only" href="#contact">
          Start a Project <ArrowRight size={16} />
        </a>

        <button
          className="mobile-toggle"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </header>

      {mobileOpen && (
        <motion.div
          className="mobile-menu"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {navItems.map((item) => (
            <a key={item} href={`#${item}`} onClick={() => setMobileOpen(false)}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </a>
          ))}
        </motion.div>
      )}

      <main>
        <section id="home" className="hero section-dark">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />

          <motion.div
            className="hero-copy"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="eyebrow">
              <Sparkles size={16} />
              Digital systems built for growth
            </div>

            <h1>
              We build systems.
              <span>You get results.</span>
            </h1>

            <p>
              Premium websites, CRM systems, social media and automation — designed as one connected digital growth system.
            </p>

            <div className="hero-actions">
              <a className="primary-btn" href="#work">
                Explore Our Capabilities <ArrowRight size={18} />
              </a>
              <a className="secondary-btn" href="#contact">Start a Conversation</a>
            </div>

            <div className="hero-trust">
              <div className="mini-avatar-group">
                <span>IL</span><span>CRM</span><span>WEB</span>
              </div>
              <div>
                <strong>Built for ambitious service businesses</strong>
                <small>Healthcare · Hospitality · Creative · Property · Professional Services</small>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="hero-visual"
            initial={{ opacity: 0, scale: 0.94, x: 30 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ duration: 0.85 }}
          >
            <div className="browser-card">
              <div className="browser-top">
                <div className="browser-dots"><span /><span /><span /></div>
                <span>IDEA LAB digital experience</span>
              </div>
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

            <motion.div
              className="floating-dashboard"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="float-title"><BarChart3 size={18} />Connected growth</div>
              <div className="chart-bars">
                {[45, 62, 52, 78, 66, 91, 100].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="stats-strip">
          <div><strong>CRM</strong><span>Lead & customer management</span></div>
          <div><strong>WEB</strong><span>Premium responsive development</span></div>
          <div><strong>SOCIAL</strong><span>Content that supports growth</span></div>
          <div><strong>AUTOMATE</strong><span>Smarter business workflows</span></div>
        </section>

        <section id="services" className="section light-section">
          <div className="section-heading">
            <span>WHAT WE DO</span>
            <h2>One partner. Connected digital solutions.</h2>
            <p>We combine customer-facing design with the systems that capture, organise and move opportunities forward.</p>
          </div>

          <div className="service-grid">
            {services.map((service, index) => (
              <motion.article
                key={service.title}
                className="service-card"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.07 }}
                whileHover={{ y: -6 }}
              >
                <div className="service-icon">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <a href="#contact">Discuss your project <ArrowRight size={15} /></a>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="work" className="section work-section">
          <div className="section-heading left-heading">
            <span>SOLUTIONS IN ACTION</span>
            <h2>Built around real business needs.</h2>
            <p>Explore the types of digital experiences and systems we design across high-value service industries.</p>
          </div>

          <div className="project-grid">
            {projects.map((project, index) => (
              <motion.article
                key={project.title}
                className="project-card"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="project-image-wrap">
                  <img src={project.image} alt={project.title} />
                  <div className="project-overlay"><span>{project.category}</span><ArrowRight /></div>
                </div>
                <div className="project-copy">
                  <span>{project.category}</span>
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="about" className="section about-section">
          <div className="about-copy">
            <span className="section-kicker">WHY IDEA LAB</span>
            <h2>Technology should make growth simpler, not more complicated.</h2>
            <p>IDEA LAB combines design, development, CRM architecture, social content and automation into practical systems built around how modern businesses attract and manage customers.</p>

            <div className="check-list">
              {[
                'Responsive websites built for modern devices',
                'Custom CRM and lead management workflows',
                'Conversion-focused landing and enquiry pages',
                'Social content designed around business goals',
                'Automation and follow-up infrastructure',
                'Secure business systems and integrations'
              ].map((item) => (
                <div key={item}><CheckCircle2 size={19} /><span>{item}</span></div>
              ))}
            </div>
          </div>

          <div className="about-panel">
            <div className="about-panel-header">
              <ShieldCheck size={25} />
              <div><strong>Modern by design</strong><span>Performance, usability and security considered from the start</span></div>
            </div>
            <div className="about-panel-grid">
              <div><Search size={21} /><strong>Clear</strong><span>Focused user journeys and information hierarchy</span></div>
              <div><MonitorSmartphone size={21} /><strong>Responsive</strong><span>Designed across desktop, tablet and mobile</span></div>
              <div><Workflow size={21} /><strong>Connected</strong><span>Marketing and operations working together</span></div>
              <div><ShieldCheck size={21} /><strong>Secure</strong><span>Modern architecture with protected business systems</span></div>
            </div>
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <motion.div
            className="contact-panel"
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div>
              <span className="section-kicker red-kicker">START A PROJECT</span>
              <h2>Tell us what you want your business to do better.</h2>
              <p>Whether you need a stronger website, a custom CRM, better content or a connected digital system, we can shape the right solution around your workflow.</p>
              <div className="contact-details">
                <a href="mailto:nawazidealab@gmail.com"><Mail size={18} />nawazidealab@gmail.com</a>
              </div>
            </div>

            <div className="contact-form">
              <div className="full-field">
                <span className="section-kicker">READY WHEN YOU ARE</span>
                <h3 style={{ margin: '14px 0 10px', fontSize: '28px', color: '#fff' }}>Start with a simple conversation.</h3>
                <p style={{ margin: '0 0 24px', color: '#9a9da5', lineHeight: 1.7 }}>
                  Send us your website, current process or the problem you want to solve. We’ll recommend a focused next step.
                </p>
                <a className="primary-btn" href="mailto:nawazidealab@gmail.com?subject=IDEA%20LAB%20Project%20Enquiry">
                  Email IDEA LAB <ArrowRight size={17} />
                </a>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
          <p>Websites, CRM systems, social content and automation designed to help businesses operate and grow more effectively.</p>
        </div>
        <div className="footer-links">
          <div>
            <strong>Services</strong>
            <a href="#services">Web Development</a>
            <a href="#services">CRM Systems</a>
            <a href="#services">Social Media</a>
            <a href="#services">Automation</a>
          </div>
          <div>
            <strong>IDEA LAB</strong>
            <a href="#about">About</a>
            <a href="#work">Capabilities</a>
            <a href="#contact">Contact</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 IDEA LAB. All rights reserved.</span>
          <span>Digital systems built for growth.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
