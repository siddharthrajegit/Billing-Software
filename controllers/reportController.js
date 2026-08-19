const { Report, Party, Item, Invoice } = require('../models');

const reportController = {
  getDashboard: (req, res) => {
    const firmId = req.activeFirm.id;
    const summary = Report.getDashboardSummary(firmId);

    res.render('dashboard', {
      title: 'Dashboard - RACE FINANCE',
      summary,
      firm: req.activeFirm,
      activeMenu: 'dashboard'
    });
  },

  getReportsIndex: (req, res) => {
    res.render('reports/index', {
      title: 'Business & Tax Reports',
      activeMenu: 'reports'
    });
  },

  getPartyReport: (req, res) => {
    const firmId = req.activeFirm.id;
    const parties = Party.getByFirmId(firmId);
    const partyData = [];

    let totalReceivables = 0;
    let totalPayables = 0;

    for (const p of parties) {
      const ledger = Party.getLedger(p.id, firmId);
      const balance = ledger ? ledger.closing_balance : (p.opening_balance || 0);

      if (balance > 0) totalReceivables += balance;
      if (balance < 0) totalPayables += Math.abs(balance);

      partyData.push({
        ...p,
        closing_balance: balance
      });
    }

    res.render('reports/party_report', {
      title: 'Party & Customer Wise Report',
      parties: partyData,
      totalReceivables,
      totalPayables,
      activeMenu: 'reports'
    });
  },

  getTaxReport: (req, res) => {
    const firmId = req.activeFirm.id;
    const { from_date, to_date } = req.query;

    const taxData = Report.getTaxReport(firmId, from_date, to_date);

    res.render('reports/tax_report', {
      title: 'GST & Tax Summary Report',
      summary: taxData.summary,
      invoices: taxData.invoices,
      fromDate: from_date || '',
      toDate: to_date || '',
      activeMenu: 'reports'
    });
  },

  getItemReport: (req, res) => {
    const firmId = req.activeFirm.id;
    const items = Report.getItemWiseReport(firmId);

    res.render('reports/item_report', {
      title: 'Item Wise Sales Report',
      items,
      activeMenu: 'reports'
    });
  }
};

module.exports = reportController;
