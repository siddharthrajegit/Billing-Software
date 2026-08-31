const { Firm, GST_STATES } = require('../models');
const fs = require('fs');
const path = require('path');

// Helper to safely delete file from public directory
function removeUploadedFile(relativeFilePath) {
  if (!relativeFilePath) return;
  try {
    const fullPath = path.join(__dirname, '..', 'public', relativeFilePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (err) {
    console.error('Failed to remove old file:', relativeFilePath, err.message);
  }
}

const firmController = {
  listFirms: (req, res) => {
    const firms = Firm.getByUserId(req.user.id);
    res.render('firms/list', {
      title: 'My Businesses & Firms',
      firms,
      activeMenu: 'firms',
      canCreateNewFirm: firms.length < 2
    });
  },

  getCreate: (req, res) => {
    const existingFirms = Firm.getByUserId(req.user.id);
    if (existingFirms.length >= 2) {
      req.flash('error_msg', 'Maximum firm limit reached. A user can only register up to 2 business firms.');
      return res.redirect('/firms');
    }

    res.render('firms/form', {
      title: 'Register New Business Firm',
      firm: null,
      gstStates: GST_STATES,
      activeMenu: 'firms'
    });
  },

  postCreate: (req, res) => {
    try {
      const existingFirms = Firm.getByUserId(req.user.id);
      if (existingFirms.length >= 2) {
        // Clean up any uploaded file in this request since it exceeded limit
        if (req.files) {
          if (req.files.logo && req.files.logo[0]) removeUploadedFile('/uploads/' + req.files.logo[0].filename);
          if (req.files.signature && req.files.signature[0]) removeUploadedFile('/uploads/' + req.files.signature[0].filename);
        }
        req.flash('error_msg', 'Maximum firm limit reached. A user can only register up to 2 business firms.');
        return res.redirect('/firms');
      }

      const {
        name, gstin, pan, phone, email, address, city, state, state_code,
        pincode, bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id,
        terms, is_default
      } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Business/Firm name is required.');
        return res.redirect('/firms/create');
      }

      let logoPath = null;
      let signaturePath = null;

      if (req.files) {
        if (req.files.logo && req.files.logo[0]) {
          logoPath = '/uploads/' + req.files.logo[0].filename;
        }
        if (req.files.signature && req.files.signature[0]) {
          signaturePath = '/uploads/' + req.files.signature[0].filename;
        }
      }

      // If state selected, find state code automatically if not provided
      let matchedStateCode = state_code;
      if (!matchedStateCode && state) {
        const found = GST_STATES.find(s => s.name.toLowerCase() === state.toLowerCase());
        if (found) matchedStateCode = found.code;
      }

      const newFirm = Firm.create({
        user_id: req.user.id,
        name: name.trim(),
        gstin: gstin ? gstin.trim().toUpperCase() : null,
        pan: pan ? pan.trim().toUpperCase() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        state_code: matchedStateCode || null,
        pincode: pincode ? pincode.trim() : null,
        bank_name: bank_name ? bank_name.trim() : null,
        bank_account_no: bank_account_no ? bank_account_no.trim() : null,
        bank_ifsc: bank_ifsc ? bank_ifsc.trim().toUpperCase() : null,
        bank_branch: bank_branch ? bank_branch.trim() : null,
        upi_id: upi_id ? upi_id.trim() : null,
        terms: terms ? terms.trim() : null,
        logo_path: logoPath,
        signature_path: signaturePath,
        is_default: is_default === 'on' || is_default === '1' ? 1 : 0
      });

      // Set newly created firm as active in session
      req.session.activeFirmId = newFirm.id;

      req.flash('success_msg', `Firm "${newFirm.name}" registered successfully!`);
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Create firm error:', err);
      req.flash('error_msg', 'Failed to create business firm: ' + err.message);
      res.redirect('/firms/create');
    }
  },

  getEdit: (req, res) => {
    const firm = Firm.getById(req.params.id, req.user.id);
    if (!firm) {
      req.flash('error_msg', 'Firm not found.');
      return res.redirect('/firms');
    }

    res.render('firms/form', {
      title: `Edit ${firm.name}`,
      firm,
      gstStates: GST_STATES,
      activeMenu: 'firms'
    });
  },

  postEdit: (req, res) => {
    try {
      const firmId = req.params.id;
      const existing = Firm.getById(firmId, req.user.id);
      if (!existing) {
        req.flash('error_msg', 'Firm not found.');
        return res.redirect('/firms');
      }

      const {
        name, gstin, pan, phone, email, address, city, state, state_code,
        pincode, bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id,
        terms, is_default
      } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Business/Firm name is required.');
        return res.redirect(`/firms/edit/${firmId}`);
      }

      const firmData = {
        name: name.trim(),
        gstin: gstin ? gstin.trim().toUpperCase() : null,
        pan: pan ? pan.trim().toUpperCase() : null,
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        address: address ? address.trim() : null,
        city: city ? city.trim() : null,
        state: state ? state.trim() : null,
        state_code: state_code || null,
        pincode: pincode ? pincode.trim() : null,
        bank_name: bank_name ? bank_name.trim() : null,
        bank_account_no: bank_account_no ? bank_account_no.trim() : null,
        bank_ifsc: bank_ifsc ? bank_ifsc.trim().toUpperCase() : null,
        bank_branch: bank_branch ? bank_branch.trim() : null,
        upi_id: upi_id ? upi_id.trim() : null,
        terms: terms ? terms.trim() : null,
        is_default: is_default === 'on' || is_default === '1' ? 1 : 0
      };

      if (req.files) {
        if (req.files.logo && req.files.logo[0]) {
          // Remove previous logo file to prevent storage bloat
          if (existing.logo_path) removeUploadedFile(existing.logo_path);
          firmData.logo_path = '/uploads/' + req.files.logo[0].filename;
        }
        if (req.files.signature && req.files.signature[0]) {
          // Remove previous signature file to prevent storage bloat
          if (existing.signature_path) removeUploadedFile(existing.signature_path);
          firmData.signature_path = '/uploads/' + req.files.signature[0].filename;
        }
      }

      Firm.update(firmId, req.user.id, firmData);

      req.flash('success_msg', 'Firm details updated successfully!');
      res.redirect('/firms');
    } catch (err) {
      console.error('Update firm error:', err);
      req.flash('error_msg', 'Failed to update firm: ' + err.message);
      res.redirect(`/firms/edit/${req.params.id}`);
    }
  },

  postSwitch: (req, res) => {
    const firmId = parseInt(req.params.id);
    const firm = Firm.getById(firmId, req.user.id);
    if (!firm) {
      req.flash('error_msg', 'Firm not found.');
      return res.redirect('/dashboard');
    }

    req.session.activeFirmId = firm.id;
    req.flash('success_msg', `Switched active firm to "${firm.name}".`);
    const returnUrl = req.header('Referer') || '/dashboard';
    res.redirect(returnUrl);
  },

  postSetDefault: (req, res) => {
    const firmId = parseInt(req.params.id);
    const firm = Firm.getById(firmId, req.user.id);
    if (firm) {
      Firm.setDefault(firmId, req.user.id);
      req.flash('success_msg', `"${firm.name}" is now your default business firm.`);
    }
    res.redirect('/firms');
  },

  postDelete: (req, res) => {
    const firmId = parseInt(req.params.id);
    const firms = Firm.getByUserId(req.user.id);

    if (firms.length <= 1) {
      req.flash('error_msg', 'You must have at least one business firm.');
      return res.redirect('/firms');
    }

    const firmToDelete = firms.find(f => f.id === firmId);
    if (firmToDelete) {
      if (firmToDelete.logo_path) removeUploadedFile(firmToDelete.logo_path);
      if (firmToDelete.signature_path) removeUploadedFile(firmToDelete.signature_path);
    }

    Firm.delete(firmId, req.user.id);

    if (req.session.activeFirmId === firmId) {
      delete req.session.activeFirmId;
    }

    req.flash('success_msg', 'Business firm and associated records deleted.');
    res.redirect('/firms');
  }
};

module.exports = firmController;
