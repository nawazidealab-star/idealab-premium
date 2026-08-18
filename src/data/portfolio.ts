export type PortfolioItem = {
  id: string;
  title: string;
  category: string;
  image: string;
  description: string;
  featured?: boolean;
};

// Temporary capability examples. Replace these entries with genuine IDEA LAB
// portfolio projects as they are supplied. Keeping portfolio content here means
// images, titles, categories and descriptions can be changed without touching
// page layout or routing code.
export const portfolioItems: PortfolioItem[] = [
  {
    id: 'healthcare-growth-system',
    title: 'Healthcare Growth System',
    category: 'CRM + Website',
    image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=82',
    description: 'Treatment-led landing pages, enquiry capture, follow-up stages and consultation-oriented workflows.',
    featured: true
  },
  {
    id: 'hospitality-customer-platform',
    title: 'Hospitality Customer Platform',
    category: 'CRM + Retention',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1400&q=82',
    description: 'Customer profiles, reservations, VIP segmentation, feedback and repeat-visit campaign structure.',
    featured: true
  },
  {
    id: 'creative-business-experience',
    title: 'Creative Business Experience',
    category: 'Website + Social',
    image: 'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=1400&q=82',
    description: 'Premium web presentation and content direction for studios, photographers, printers, galleries and artists.',
    featured: true
  },
  {
    id: 'property-lead-journey',
    title: 'Property Lead Journey',
    category: 'Lead Generation',
    image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1400&q=82',
    description: 'Seller enquiry capture, appraisal calls to action, lead qualification and structured follow-up.',
    featured: true
  }
];
