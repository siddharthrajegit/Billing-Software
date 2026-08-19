const { Payment, Party, Invoice } = require('../models');

const paymentController = {
  listPayments: (req, res) => {
    const firmId = req.activeFirm.id;
    const type = req.query.type || null;
    const payments = Payment.getByFirmId(firmId, type);

    res.render('payments/list', {
      title: type === 'payment_in' ? 'Payment Receipts (In)' : (type === 'payment_out' ? 'Payment Vouchers (Out)' : 'All Payments'),
      payments,
      typeFilter: type,
      activeMenu: 'payments'
    });
  },

  getCreate: (req, res) => {
    const firmId = req.activeFirm.id;
    const type = req.query.type || 'payment_in'; // payment_in (Customer receipt) or payment_out (Supplier payment)
    const partyType = type === 'payment_in' ? 'customer' : 'supplier';
    const parties = Party.getByFirmId(firmId, partyType);
    const nextPaymentNumber = Payment.getNextPaymentNumber(firmId, type);
    const today = new Date().toISOString().split('T')[0];

    // Optional pre-selected party or invoice from query params
    const selectedPartyId = req.query.party_id ? parseInt(req.query.party_id) : null;
    const selectedInvoiceId = req.query.invoice_id ? parseInt(req.query.invoice_id) : null;

    res.render('payments/form', {
      title: type === 'payment_in' ? 'Record Payment Receipt (In)' : 'Record Payment Voucher (Out)',
      type,
      nextPaymentNumber,
      today,
      parties,
      selectedPartyId,
      selectedInvoiceId,
      activeMenu: 'payments'
    });
  },

  postCreate: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const {
        type, payment_number, payment_date, party_id,
        invoice_id, amount, payment_mode, reference_no, notes
      } = req.body;

      if (!party_id) {
        req.flash('error_msg', 'Please select a customer/supplier party.');
        return res.redirect(`/payments/create?type=${type}`);
      }

      if (!amount || parseFloat(amount) <= 0) {
        req.flash('error_msg', 'Please enter a valid payment amount.');
        return res.redirect(`/payments/create?type=${type}`);
      }

      Payment.create({
        firm_id: firmId,
        type: type || 'payment_in',
        payment_number: payment_number || Payment.getNextPaymentNumber(firmId, type),
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        party_id: parseInt(party_id),
        invoice_id: invoice_id ? parseInt(invoice_id) : null,
        amount: parseFloat(amount),
        payment_mode: payment_mode || 'cash',
        reference_no: reference_no ? reference_no.trim() : null,
        notes: notes ? notes.trim() : null
      });

      req.flash('success_msg', `Payment record ${payment_number} created successfully!`);
      res.redirect('/payments');
    } catch (err) {
      console.error('Create payment error:', err);
      req.flash('error_msg', 'Failed to record payment: ' + err.message);
      res.redirect(`/payments/create?type=${req.body.type || 'payment_in'}`);
    }
  },

  postDelete: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      Payment.delete(req.params.id, firmId);
      req.flash('success_msg', 'Payment record removed.');
      res.redirect('/payments');
    } catch (err) {
      console.error('Delete payment error:', err);
      req.flash('error_msg', 'Failed to delete payment.');
      res.redirect('/payments');
    }
  }
};

module.exports = paymentController;
