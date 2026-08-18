import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Code2,
  Contact,
  FileText,
  Globe2,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
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
    description:
      'Premium responsive websites designed to look modern, load fast and turn visitors into enquiries.'
  },
  {
    icon: <LayoutDashboard size={28} />,
    title: 'CRM Systems',
    description:
      'Custom dashboards for leads, clients, follow-ups, projects, tasks and internal business operations.'
  },
  {
    icon: <Camera size={28} />,
    title: 'Social Media',
    description:
      'Branded content, short-form video concepts, campaigns and creative systems built around real business goals.'
  },
  {
    icon: <Workflow size={28} />,
    title: 'Automation',
    description:
      'Automated lead routing, reminders, notifications and workflows that reduce repetitive manual work.'
  },
  {
    icon: <Target size={28} />,
    title: 'Conversion Growth',
    description:
      'Landing pages, enquiry journeys, booking flows and stronger calls-to-action built to improve conversion.'
  },
  {
    icon: <Globe2 size={28} />,
    title: 'Digital Strategy',
    description:
      'A connected approach across website, CRM, content and follow-up instead of disconnected marketing tools.'
  }
];

const projects: Project[] = [
  {
    title: 'Dental Clinic Growth System',
    category: 'CRM + Website',
    image:
      'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1200&q=80',
    description:
      'A patient enquiry journey combining treatment pages, lead capture, follow-up stages and appointment tracking.'
  },
  {
    title: 'Restaurant Growth Platform',
    category: 'CRM + Retention',
    image:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    description:
      'Customer profiles, reservations, VIP tracking, feedback and repeat-customer campaign management.'
  },
  {
    title: 'Creative Studio Digital Refresh',
    category: 'Website + Social',
    image:
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1200&q=80',
    description:
      'A premium visual direction for creative studios, photographers, printers, galleries and artists.'
  },
  {
    title: 'Property Lead Funnel',
    category: 'Lead Generation',
    image:
      'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
    description:
      'Seller enquiry capture, appraisal CTA design, property lead tracking and follow-up workflow.'
  }
];

const testimonials = [
  {
    quote:
      'The system made it much easier to understand where enquiries were coming from and what needed follow-up.',
    name: 'Sample Client',
    role: 'Healthcare Business'
  },
  {
    quote:
      'The new digital direction looked much more premium and gave us a clearer way to present our services.',
    name: 'Sample Client',
    role: 'Creative Business'
  },
  {
    quote:
      'The dashboard concept brought leads, projects and follow-ups into one much simpler workflow.',
    name: 'Sample Client',
    role: 'Service Business'
  }
];

const adminMenu = [
  { icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
  { icon: <Target size={18} />, label: 'Leads' },
  { icon: <Users size={18} />, label: 'Clients' },
  { icon: <BriefcaseBusiness size={18} />, label: 'Projects' },
  { icon: <ClipboardList size={18} />, label: 'Tasks' },
  { icon: <FileText size={18} />, label: 'Invoices' },
  { icon: <CalendarDays size={18} />, label: 'Content' },
  { icon: <BarChart3 size={18} />, label: 'Reports' },
  { icon: <Settings size={18} />, label: 'Settings' }
];

function App() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#home">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
        </a>

        <nav className="desktop-nav">
          <a href="#home">Home</a>
          <a href="#services">Services</a>
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#testimonials">Testimonials</a>
          <a href="#contact">Contact</a>
        </nav>

        <a className="nav-cta desktop-only" href="#contact">
          Start a Project
          <ArrowRight size={16} />
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
          <a href="#home" onClick={() => setMobileOpen(false)}>
            Home
          </a>
          <a href="#services" onClick={() => setMobileOpen(false)}>
            Services
          </a>
          <a href="#work" onClick={() => setMobileOpen(false)}>
            Work
          </a>
          <a href="#about" onClick={() => setMobileOpen(false)}>
            About
          </a>
          <a href="#testimonials" onClick={() => setMobileOpen(false)}>
            Testimonials
          </a>
          <a href="#contact" onClick={() => setMobileOpen(false)}>
            Contact
          </a>
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
              Premium websites, CRM systems, social media, automation and
              conversion journeys — designed as one connected growth system.
            </p>

            <div className="hero-actions">
              <a className="primary-btn" href="#work">
                View Our Work
                <ArrowRight size={18} />
              </a>

              <a className="secondary-btn" href="#contact">
                Book a Strategy Call
              </a>
            </div>

            <div className="hero-trust">
              <div className="mini-avatar-group">
                <span>IL</span>
                <span>CRM</span>
                <span>WEB</span>
              </div>
              <div>
                <strong>Built for service businesses</strong>
                <small>
                  Healthcare · Restaurants · Creative · Property · Professional
                  Services
                </small>
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
                <div className="browser-dots">
                  <span />
                  <span />
                  <span />
                </div>
                <span>idealab.digital</span>
              </div>

              <div className="browser-content">
                <div className="browser-badge">Premium Website Systems</div>
                <h3>
                  Built to look better.
                  <br />
                  Built to convert.
                </h3>
                <p>
                  Clean digital experiences backed by smarter internal systems.
                </p>

                <div className="browser-metrics">
                  <div>
                    <strong>Leads</strong>
                    <span>248</span>
                  </div>
                  <div>
                    <strong>Projects</strong>
                    <span>32</span>
                  </div>
                  <div>
                    <strong>Clients</strong>
                    <span>126</span>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              className="floating-dashboard"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <div className="float-title">
                <BarChart3 size={18} />
                Growth overview
              </div>
              <div className="chart-bars">
                {[45, 62, 52, 78, 66, 91, 100].map((height, index) => (
                  <span key={index} style={{ height: `${height}%` }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        </section>

        <section className="stats-strip">
          <div>
            <strong>CRM</strong>
            <span>Lead & client management</span>
          </div>
          <div>
            <strong>WEB</strong>
            <span>Premium responsive development</span>
          </div>
          <div>
            <strong>SOCIAL</strong>
            <span>Content that supports sales</span>
          </div>
          <div>
            <strong>AUTOMATE</strong>
            <span>Less manual admin</span>
          </div>
        </section>

        <section id="services" className="section light-section">
          <div className="section-heading">
            <span>WHAT WE DO</span>
            <h2>Complete digital solutions.</h2>
            <p>
              Not isolated services. We connect your customer-facing marketing
              with the systems your team uses behind the scenes.
            </p>
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
                <a href="#contact">
                  Discuss your project <ArrowRight size={15} />
                </a>
              </motion.article>
            ))}
          </div>
        </section>

        <section id="work" className="section work-section">
          <div className="section-heading left-heading">
            <span>SELECTED WORK</span>
            <h2>Built around real business problems.</h2>
            <p>
              These project directions demonstrate the kind of work IDEA LAB
              develops. Your real portfolio projects can replace these samples
              as you provide them.
            </p>
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
                  <div className="project-overlay">
                    <span>{project.category}</span>
                    <ArrowRight />
                  </div>
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

            <h2>
              Your website should not be separate from the way your business
              actually works.
            </h2>

            <p>
              IDEA LAB combines front-end design, development, CRM architecture,
              social content and automation into systems that are easier for
              customers to use and easier for your team to manage.
            </p>

            <div className="check-list">
              {[
                'Responsive websites built for modern devices',
                'Custom CRM and lead management workflows',
                'Conversion-focused landing and enquiry pages',
                'Social media designed around customer actions',
                'Automation and follow-up infrastructure',
                'Secure internal operational dashboards'
              ].map((item) => (
                <div key={item}>
                  <CheckCircle2 size={19} />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="about-panel">
            <div className="about-panel-header">
              <ShieldCheck size={25} />
              <div>
                <strong>Built with security in mind</strong>
                <span>Cloudflare-ready architecture</span>
              </div>
            </div>

            <div className="about-panel-grid">
              <div>
                <Search size={21} />
                <strong>Clear</strong>
                <span>Simple UX and information hierarchy</span>
              </div>

              <div>
                <MonitorSmartphone size={21} />
                <strong>Responsive</strong>
                <span>Designed across desktop and mobile</span>
              </div>

              <div>
                <Workflow size={21} />
                <strong>Connected</strong>
                <span>Marketing and operations working together</span>
              </div>

              <div>
                <ShieldCheck size={21} />
                <strong>Secure</strong>
                <span>Protected admin and API architecture</span>
              </div>
            </div>
          </div>
        </section>

        <section className="internal-section section-dark">
          <div className="internal-copy">
            <span className="section-kicker red-kicker">
              INTERNAL OPERATIONS
            </span>

            <h2>One private backend for IDEA LAB operations.</h2>

            <p>
              The agency backend is for internal staff only. It is not sold as
              a client portal and is not exposed as a public website feature.
            </p>

            <div className="internal-list">
              <div>
                <Users />
                <span>Clients and contacts</span>
              </div>
              <div>
                <Target />
                <span>Leads and pipeline</span>
              </div>
              <div>
                <BriefcaseBusiness />
                <span>Projects and delivery</span>
              </div>
              <div>
                <ClipboardList />
                <span>Tasks and deadlines</span>
              </div>
              <div>
                <CircleDollarSign />
                <span>Invoices and internal finance tracking</span>
              </div>
              <div>
                <FileText />
                <span>Content planning and records</span>
              </div>
            </div>
          </div>

          <motion.div
            className="admin-demo"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <aside className="admin-sidebar">
              <img src="/idealab-logo.jpg" alt="IDEA LAB" />

              <div className="admin-nav">
                {adminMenu.map((item, index) => (
                  <div
                    key={item.label}
                    className={index === 0 ? 'admin-nav-active' : ''}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="admin-main">
              <div className="admin-top">
                <div>
                  <span>Private agency dashboard</span>
                  <h3>Good afternoon.</h3>
                </div>

                <div className="admin-profile">IL</div>
              </div>

              <div className="admin-metrics">
                <div>
                  <span>Total leads</span>
                  <strong>248</strong>
                  <small>+12% this month</small>
                </div>

                <div>
                  <span>Active clients</span>
                  <strong>26</strong>
                  <small>4 new this month</small>
                </div>

                <div>
                  <span>Projects</span>
                  <strong>32</strong>
                  <small>11 currently active</small>
                </div>

                <div>
                  <span>Tasks due</span>
                  <strong>14</strong>
                  <small>5 due today</small>
                </div>
              </div>

              <div className="admin-bottom-grid">
                <div className="pipeline-card">
                  <div className="card-header">
                    <strong>Lead pipeline</strong>
                    <span>This month</span>
                  </div>

                  <div className="pipeline-bars">
                    <div>
                      <span>New</span>
                      <b style={{ width: '82%' }} />
                      <strong>67</strong>
                    </div>
                    <div>
                      <span>Contacted</span>
                      <b style={{ width: '66%' }} />
                      <strong>49</strong>
                    </div>
                    <div>
                      <span>Qualified</span>
                      <b style={{ width: '48%' }} />
                      <strong>34</strong>
                    </div>
                    <div>
                      <span>Won</span>
                      <b style={{ width: '28%' }} />
                      <strong>18</strong>
                    </div>
                  </div>
                </div>

                <div className="activity-card">
                  <div className="card-header">
                    <strong>Recent activity</strong>
                  </div>

                  {[
                    ['New lead added', '2 min ago'],
                    ['Project updated', '1 hour ago'],
                    ['Invoice created', '3 hours ago'],
                    ['Task completed', '5 hours ago']
                  ].map(([label, time]) => (
                    <div className="activity-row" key={label}>
                      <span className="activity-dot" />
                      <div>
                        <strong>{label}</strong>
                        <small>{time}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="testimonials" className="section testimonial-section">
          <div className="section-heading">
            <span>TESTIMONIALS</span>
            <h2>Proof will live here.</h2>
            <p>
              These are clearly marked placeholders until genuine IDEA LAB
              testimonials and client results are supplied.
            </p>
          </div>

          <div className="testimonial-grid">
            {testimonials.map((testimonial) => (
              <article className="testimonial-card" key={testimonial.quote}>
                <div className="sample-label">SAMPLE PLACEHOLDER</div>

                <div className="testimonial-stars">★★★★★</div>

                <blockquote>“{testimonial.quote}”</blockquote>

                <div>
                  <strong>{testimonial.name}</strong>
                  <span>{testimonial.role}</span>
                </div>
              </article>
            ))}
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
              <span className="section-kicker red-kicker">
                START A PROJECT
              </span>

              <h2>Tell us what your business needs to improve.</h2>

              <p>
                Website, CRM, social content or a complete connected system —
                start with the problem and we will recommend the simplest useful
                solution.
              </p>

              <div className="contact-details">
                <a href="mailto:nawazidealab@gmail.com">
                  <Mail size={18} />
                  nawazidealab@gmail.com
                </a>

                <div>
                  <MessageSquare size={18} />
                  WhatsApp details can be added when ready
                </div>
              </div>
            </div>

            <form
              className="contact-form"
              onSubmit={(event) => event.preventDefault()}
            >
              <label>
                Name
                <input type="text" placeholder="Your name" />
              </label>

              <label>
                Email
                <input type="email" placeholder="you@company.com" />
              </label>

              <label>
                Business
                <input type="text" placeholder="Business name" />
              </label>

              <label>
                What do you need?
                <select defaultValue="">
                  <option value="" disabled>
                    Select a service
                  </option>
                  <option>Website Development</option>
                  <option>CRM System</option>
                  <option>Social Media</option>
                  <option>Automation</option>
                  <option>Complete Digital System</option>
                </select>
              </label>

              <label className="full-field">
                Project details
                <textarea placeholder="Tell us what you want to improve..." />
              </label>

              <button type="submit" className="primary-btn form-button">
                Send Enquiry
                <ArrowRight size={17} />
              </button>
            </form>
          </motion.div>
        </section>
      </main>

      <footer>
        <div className="footer-brand">
          <img src="/idealab-logo.jpg" alt="IDEA LAB" />
          <p>
            Websites, CRM systems, social content and automation designed to
            help businesses operate and grow more effectively.
          </p>
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
            <a href="#work">Work</a>
            <a href="#testimonials">Testimonials</a>
            <a href="#contact">Contact</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 IDEA LAB. All rights reserved.</span>
          <span>Private agency systems are not public client portals.</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
