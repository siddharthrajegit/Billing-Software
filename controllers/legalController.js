const legalController = {
  getLegalPage: (req, res) => {
    const tab = req.query.tab || req.params.section || 'terms';
    
    const validTabs = ['terms', 'privacy', 'refund', 'disclaimer', 'security'];
    const activeTab = validTabs.includes(tab) ? tab : 'terms';

    const titles = {
      terms: 'Terms & Conditions (T&C)',
      privacy: 'Privacy Policy & Zero-Knowledge Architecture',
      refund: 'Refund & Cancellation Policy',
      disclaimer: 'Legal Disclaimer & Tax Responsibility',
      security: 'User Data Security & Password Notice'
    };

    res.render('legal/index', {
      title: `${titles[activeTab]} - RACE FINANCE`,
      activeTab,
      activeMenu: 'legal'
    });
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
