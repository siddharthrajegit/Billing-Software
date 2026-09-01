const { Party, GST_STATES } = require('../models');

const partyController = {
  listParties: (req, res) => {
    const firmId = req.activeFirm.id;
    const filterType = req.query.type || 'all';
    
    let parties;
    if (filterType === 'customer' || filterType === 'supplier') {
      parties = Party.getByFirmId(firmId, filterType);
    } else {
      parties = Party.getByFirmId(firmId);
    }

    const partySummaries = Party.getPartySummary(firmId);
    const summaryMap = {};
    for (const s of partySummaries) {
      summaryMap[s.id] = s;
    }

    res.render('parties/list', {
      title: 'Parties & Customers',
      parties,
      summaryMap,
      filterType,
      activeMenu: 'parties'
    });
  },

  getCreate: (req, res) => {
    const defaultType = req.query.type || 'customer';
    res.render('parties/form', {
      title: 'Add New Party (Customer / Supplier)',
      party: null,
      defaultType,
      gstStates: GST_STATES,
      activeMenu: 'parties'
    });
  },

  postCreate: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const {
        type, name, phone, email, gstin, pan, billing_address,
        shipping_address, city, state, state_code, pincode, opening_balance
      } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Party / Customer name is required.');
        return res.redirect('/parties/create');
      }

      // Strict Phone Number Validation (10 digits)
      let cleanPhone = null;
      if (phone && phone.trim()) {
        cleanPhone = phone.trim().replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
          req.flash('error_msg', `Invalid Phone Number: Mobile number must contain exactly 10 digits (received ${cleanPhone.length} digits). Neither more nor less.`);
          return res.redirect('/parties/create');
        }
      }

      // Strict GSTIN Validation (15 alphanumeric chars)
      let cleanGstin = null;
      if (gstin && gstin.trim()) {
        cleanGstin = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
        if (cleanGstin.length !== 15) {
          req.flash('error_msg', `Invalid GSTIN Number: GST number must contain exactly 15 characters (received ${cleanGstin.length} characters). Neither more nor less.`);
          return res.redirect('/parties/create');
        }
      }

      // Auto resolve state code if needed
      let matchedCode = state_code;
      if (!matchedCode && state) {
        const found = GST_STATES.find(s => s.name.toLowerCase() === state.toLowerCase());
        if (found) matchedCode = found.code;
      }

      Party.create({
        firm_id: firmId,
        type: type || 'customer',
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        gstin: cleanGstin,
        pan: pan ? pan.trim().toUpperCase() : null,
        billing_address: billing_address ? billing_address.trim() : null,
        shipping_address: shipping_address ? shipping_address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        state_code: matchedCode || null,
        pincode: pincode ? pincode.trim() : null,
        opening_balance: parseFloat(opening_balance) || 0
      });

      req.flash('success_msg', `Party "${name}" created successfully!`);
      res.redirect('/parties');
    } catch (err) {
      console.error('Create party error:', err);
      req.flash('error_msg', 'Failed to create party: ' + err.message);
      res.redirect('/parties/create');
    }
  },

  getEdit: (req, res) => {
    const firmId = req.activeFirm.id;
    const party = Party.getById(req.params.id, firmId);
    if (!party) {
      req.flash('error_msg', 'Party not found.');
      return res.redirect('/parties');
    }

    res.render('parties/form', {
      title: `Edit ${party.name}`,
      party,
      defaultType: party.type,
      gstStates: GST_STATES,
      activeMenu: 'parties'
    });
  },

  postEdit: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const partyId = req.params.id;
      const {
        type, name, phone, email, gstin, pan, billing_address,
        shipping_address, city, state, state_code, pincode, opening_balance
      } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Party name is required.');
        return res.redirect(`/parties/edit/${partyId}`);
      }

      // Strict Phone Number Validation (10 digits)
      let cleanPhone = null;
      if (phone && phone.trim()) {
        cleanPhone = phone.trim().replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
          req.flash('error_msg', `Invalid Phone Number: Mobile number must contain exactly 10 digits (received ${cleanPhone.length} digits). Neither more nor less.`);
          return res.redirect(`/parties/edit/${partyId}`);
        }
      }

      // Strict GSTIN Validation (15 alphanumeric chars)
      let cleanGstin = null;
      if (gstin && gstin.trim()) {
        cleanGstin = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
        if (cleanGstin.length !== 15) {
          req.flash('error_msg', `Invalid GSTIN Number: GST number must contain exactly 15 characters (received ${cleanGstin.length} characters). Neither more nor less.`);
          return res.redirect(`/parties/edit/${partyId}`);
        }
      }

      // Auto resolve state code if needed
      let matchedCode = state_code;
      if (!matchedCode && state) {
        const found = GST_STATES.find(s => s.name.toLowerCase() === state.toLowerCase());
        if (found) matchedCode = found.code;
      }

      Party.update(partyId, firmId, {
        type: type || 'customer',
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        gstin: cleanGstin,
        pan: pan ? pan.trim().toUpperCase() : null,
        billing_address: billing_address ? billing_address.trim() : null,
        shipping_address: shipping_address ? shipping_address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        state_code: matchedCode || null,
        pincode: pincode ? pincode.trim() : null,
        opening_balance: parseFloat(opening_balance) || 0
      });

      req.flash('success_msg', 'Party details updated.');
      res.redirect('/parties');
    } catch (err) {
      console.error('Edit party error:', err);
      req.flash('error_msg', 'Failed to update party: ' + err.message);
      res.redirect(`/parties/edit/${req.params.id}`);
    }
  },

  getLedger: (req, res) => {
    const firmId = req.activeFirm.id;
    const partyId = req.params.id;
    const ledgerData = Party.getLedger(partyId, firmId);

    if (!ledgerData) {
      req.flash('error_msg', 'Party not found.');
      return res.redirect('/parties');
    }

    res.render('parties/ledger', {
      title: `Ledger Statement - ${ledgerData.party.name}`,
      party: ledgerData.party,
      opening_balance: ledgerData.opening_balance || 0,
      total_billed: ledgerData.total_billed || 0,
      total_paid: ledgerData.total_paid || 0,
      closing_balance: ledgerData.closing_balance || 0,
      pending_bills: ledgerData.pending_bills || [],
      transactions: ledgerData.transactions || [],
      activeMenu: 'parties'
    });
  },

  postDelete: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      Party.delete(req.params.id, firmId);
      req.flash('success_msg', 'Party deleted.');
      res.redirect('/parties');
    } catch (err) {
      console.error('Delete party error:', err);
      req.flash('error_msg', 'Failed to delete party.');
      res.redirect('/parties');
    }
  },

  // API endpoint for dynamic invoice party lookup
  apiGetParties: (req, res) => {
    const firmId = req.activeFirm.id;
    const type = req.query.type; // customer or supplier
    const parties = Party.getByFirmId(firmId, type);
    res.json(parties);
  },

  // API endpoint for AJAX quick party creation from invoice form
  postQuickCreate: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const {
        type, name, phone, email, gstin, pan, billing_address,
        shipping_address, city, state, state_code, pincode, opening_balance
      } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, error: 'Party / Customer name is required.' });
      }

      // Strict Phone Validation (10 digits if provided)
      let cleanPhone = null;
      if (phone && phone.trim()) {
        cleanPhone = phone.trim().replace(/[^0-9]/g, '');
        if (cleanPhone.length !== 10) {
          return res.status(400).json({ success: false, error: `Invalid Phone: Mobile number must contain exactly 10 digits (received ${cleanPhone.length} digits).` });
        }
      }

      // Strict GSTIN Validation (15 alphanumeric characters if provided)
      let cleanGstin = null;
      if (gstin && gstin.trim()) {
        cleanGstin = gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
        if (cleanGstin.length !== 15) {
          return res.status(400).json({ success: false, error: `Invalid GSTIN: GSTIN must be exactly 15 characters long (received ${cleanGstin.length} chars).` });
        }
      }

      // State Code auto lookup
      let matchedStateCode = state_code;
      if (!matchedStateCode && state) {
        const found = GST_STATES.find(s => s.name.toLowerCase() === state.toLowerCase());
        if (found) matchedStateCode = found.code;
      }
      if (!matchedStateCode && cleanGstin && cleanGstin.length === 15) {
        matchedStateCode = cleanGstin.substring(0, 2);
      }

      const party = Party.create({
        firm_id: firmId,
        type: type || 'customer',
        name: name.trim(),
        phone: cleanPhone,
        email: email ? email.trim() : null,
        gstin: cleanGstin,
        pan: pan ? pan.trim().toUpperCase() : null,
        billing_address: billing_address ? billing_address.trim() : null,
        shipping_address: shipping_address ? shipping_address.trim() : (billing_address ? billing_address.trim() : null),
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        state_code: matchedStateCode || null,
        pincode: pincode ? pincode.trim() : null,
        opening_balance: parseFloat(opening_balance) || 0
      });

      res.json({
        success: true,
        party,
        message: `Party "${party.name}" created successfully!`
      });
    } catch (err) {
      console.error('Quick create party error:', err);
      res.status(500).json({ success: false, error: 'Failed to create party: ' + err.message });
    }
  }
};

module.exports = partyController;
