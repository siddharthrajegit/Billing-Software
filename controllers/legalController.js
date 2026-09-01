const legalController = {
  getLegalPage: (req, res) => {
    const tab = req.query.tab || req.params.section || 'terms';
    
    const validTabs = ['about', 'pricing', 'contact', 'terms', 'privacy', 'refund', 'disclaimer', 'security'];
    const activeTab = validTabs.includes(tab) ? tab : 'terms';

    const titles = {
      about: 'About RACE FINANCE - Smart Small Business Management & Digital Bookkeeping',
      pricing: 'Pricing Plans & 1-Month Free Trial - RACE FINANCE',
      contact: 'Contact Support & Onboarding Desk - RACE FINANCE',
      terms: 'Terms & Conditions (T&C) - RACE FINANCE',
      privacy: 'Privacy Policy & Zero-Knowledge Architecture - RACE FINANCE',
      refund: 'Refund & Cancellation Policy - RACE FINANCE',
      disclaimer: 'Legal Disclaimer & Tax Responsibility - RACE FINANCE',
      security: 'User Data Security & Password Notice - RACE FINANCE'
    };

    const descriptions = {
      about: 'Discover RACE FINANCE: An integrated small business management and digital bookkeeping utility. Manage up to 2 firms, FIFO ledgers, inventory, and GST registers.',
      pricing: 'Transparent and affordable pricing plans for Indian small businesses. Includes a 1-month complimentary full-featured free trial with zero setup fees.',
      contact: 'Get in touch with RACE FINANCE official support, customer onboarding, and technical assistance desk via WhatsApp (+91 9672847747) or direct call.',
      terms: 'Read the Terms and Conditions of service governing account provisioning, zero-knowledge security custody, and subscription lifecycle on RACE FINANCE.',
      privacy: 'Our strict zero-knowledge privacy policy: Zero administrator account inspection, salted one-way password encryption, and 100% offline data portability.',
      refund: 'RACE FINANCE Refund & Cancellation Policy: Non-refundable subscriptions backed by a full 1-month complimentary trial period prior to renewal.',
      disclaimer: 'Legal and tax compliance disclaimer: RACE FINANCE is an internal record management and billing utility for small business bookkeeping.',
      security: 'User data security advisory: One-way cryptographic bcrypt hashing, complete customer data ownership, and 24/7 security reporting desk.'
    };

    res.render('legal/index', {
      title: titles[activeTab] || 'RACE FINANCE - Small Business Billing & Inventory',
      metaDescription: descriptions[activeTab] || 'Smart Small Business Billing & Inventory Management Utility',
      activeTab,
      activeMenu: ['about', 'pricing', 'contact'].includes(activeTab) ? activeTab : 'legal'
    });
  },

  getAbout: (req, res) => {
    res.redirect('/legal?tab=about');
  },

  getPricing: (req, res) => {
    res.redirect('/legal?tab=pricing');
  },

  getContact: (req, res) => {
    res.redirect('/legal?tab=contact');
  },

  getTerms: (req, res) => {
    res.redirect('/legal?tab=terms');
  },

  getPrivacy: (req, res) => {
    res.redirect('/legal?tab=privacy');
  },

  getRefund: (req, res) => {
    res.redirect('/legal?tab=refund');
  },

  getDisclaimer: (req, res) => {
    res.redirect('/legal?tab=disclaimer');
  },

  getSecurity: (req, res) => {
    res.redirect('/legal?tab=security');
  }
};

module.exports = legalController;
