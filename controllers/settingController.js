const { Setting } = require('../models');

const settingController = {
  getSettings: (req, res) => {
    const firmId = req.activeFirm.id;
    const settings = Setting.get(firmId);
    const activeTab = req.query.tab || 'sales';

    res.render('settings/index', {
      title: 'Business & Bill Settings',
      settings,
      activeTab,
      activeMenu: 'settings'
    });
  },

  postSettings: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const section = req.body.section || 'sales';

      if (section === 'sales') {
        const {
          default_gst_type,
          gst_calc_mode,
          enable_discount_column,
          enable_item_description,
          default_due_days
        } = req.body;

        Setting.update(firmId, 'sales', {
          default_gst_type: default_gst_type === 'non_gst' ? 'non_gst' : 'gst',
          gst_calc_mode: gst_calc_mode === 'final_amount' ? 'final_amount' : 'separate',
          enable_discount_column: enable_discount_column === '1' || enable_discount_column === 'true' || enable_discount_column === 'on',
          enable_item_description: enable_item_description === '1' || enable_item_description === 'true' || enable_item_description === 'on',
          default_due_days: parseInt(default_due_days, 10) || 0
        });
      } else if (section === 'purchases') {
        const { default_gst_type, gst_calc_mode, enable_discount_column } = req.body;
        Setting.update(firmId, 'purchases', {
          default_gst_type: default_gst_type === 'non_gst' ? 'non_gst' : 'gst',
          gst_calc_mode: gst_calc_mode === 'final_amount' ? 'final_amount' : 'separate',
          enable_discount_column: enable_discount_column === '1' || enable_discount_column === 'true' || enable_discount_column === 'on'
        });
      } else if (section === 'print') {
        const { show_bank_details, show_upi_qr, show_signature, footer_notes } = req.body;
        Setting.update(firmId, 'print', {
          show_bank_details: show_bank_details === '1' || show_bank_details === 'true' || show_bank_details === 'on',
          show_upi_qr: show_upi_qr === '1' || show_upi_qr === 'true' || show_upi_qr === 'on',
          show_signature: show_signature === '1' || show_signature === 'true' || show_signature === 'on',
          footer_notes: footer_notes ? footer_notes.trim() : ''
        });
      } else if (section === 'general') {
        const { currency_symbol, date_format } = req.body;
        Setting.update(firmId, 'general', {
          currency_symbol: currency_symbol || '₹',
          date_format: date_format || 'YYYY-MM-DD'
        });
      }

      req.flash('success_msg', 'Settings updated successfully for ' + req.activeFirm.name + '!');
      res.redirect(`/settings?tab=${section}`);
    } catch (err) {
      console.error('Settings update error:', err);
      req.flash('error_msg', 'Failed to save settings: ' + err.message);
      res.redirect('/settings');
    }
  }
};

module.exports = settingController;
