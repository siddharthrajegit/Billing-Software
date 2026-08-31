const { Invoice, Party, Item, Setting, GST_STATES } = require('../models');

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function isChecked(value) {
  return value === '1' || value === 'on' || value === true || value === 'true';
}

function formArrayValue(value, index, fallback = 0) {
  if (Array.isArray(value)) {
    return value[index] !== undefined && value[index] !== null && value[index] !== '' ? value[index] : fallback;
  }
  return value !== undefined && value !== null && value !== '' ? value : fallback;
}

function redirectForType(type) {
  return type === 'purchase' ? '/purchases/create' : '/sales/create';
}

function submissionError(message, redirectTo) {
  const error = new Error(message);
  error.redirectTo = redirectTo;
  return error;
}

function validatePartyFields(body, redirectTo) {
  const invoiceNumber = (body.invoice_number || '').toString().trim();
  if (!invoiceNumber || !/^[0-9]+$/.test(invoiceNumber)) {
    throw submissionError(
      'Invalid Bill Number: Bill / Invoice number must contain only numbers (no letters or special characters allowed).',
      redirectTo
    );
  }

  if (!body.party_name || !body.party_name.trim()) {
    throw submissionError('Customer / Party name is required.', redirectTo);
  }

  let cleanPhone = null;
  if (body.party_phone && body.party_phone.trim()) {
    cleanPhone = body.party_phone.trim().replace(/[^0-9]/g, '');
    if (cleanPhone.length !== 10) {
      throw submissionError(
        `Invalid Phone Number: Phone number must contain exactly 10 digits (received ${cleanPhone.length} digits). Neither more nor less.`,
        redirectTo
      );
    }
  }

  let cleanGstin = null;
  if (body.party_gstin && body.party_gstin.trim()) {
    cleanGstin = body.party_gstin.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (cleanGstin.length !== 15) {
      throw submissionError(
        `Invalid GSTIN Number: GST number must contain exactly 15 characters (received ${cleanGstin.length} characters). Neither more nor less.`,
        redirectTo
      );
    }
  }

  let validatedState = body.party_state ? body.party_state.trim() : '';
  let validatedStateCode = body.party_state_code ? body.party_state_code.trim() : '';

  if (validatedState) {
    const matchedState = GST_STATES.find(
      s => s.name.toLowerCase() === validatedState.toLowerCase() || s.code === validatedState
    );
    if (!matchedState) {
      throw submissionError(
        `Invalid State "${validatedState}". Please select a valid Indian State / Union Territory (city names are not allowed).`,
        redirectTo
      );
    }
    validatedState = matchedState.name;
    validatedStateCode = matchedState.code;
  }

  return { cleanPhone, cleanGstin, validatedState, validatedStateCode };
}

function resolveParty(body, firmId, cleaned) {
  const type = body.type || 'sale';
  let resolvedPartyId = body.party_id && !isNaN(parseInt(body.party_id)) ? parseInt(body.party_id) : null;

  if (resolvedPartyId) {
    return resolvedPartyId;
  }

  const existingParty = Party.getByName(body.party_name.trim(), firmId);
  if (existingParty) {
    return existingParty.id;
  }

  const newParty = Party.create({
    firm_id: firmId,
    type: type === 'purchase' ? 'supplier' : 'customer',
    name: body.party_name.trim(),
    phone: cleaned.cleanPhone,
    email: null,
    gstin: cleaned.cleanGstin,
    billing_address: body.party_address ? body.party_address.trim() : null,
    state: cleaned.validatedState || null,
    state_code: cleaned.validatedStateCode || null,
    opening_balance: 0
  });
  return newParty.id;
}

function calculateTax(taxable, taxRate, isGst, isInterstate) {
  const tax = { cgst_rate: 0, cgst_amount: 0, sgst_rate: 0, sgst_amount: 0, igst_rate: 0, igst_amount: 0, total: 0 };
  if (!isGst || taxRate <= 0) return tax;

  if (isInterstate) {
    tax.igst_rate = taxRate;
    tax.igst_amount = taxable * (taxRate / 100);
    tax.total = tax.igst_amount;
  } else {
    tax.cgst_rate = taxRate / 2;
    tax.sgst_rate = taxRate / 2;
    tax.cgst_amount = taxable * (tax.cgst_rate / 100);
    tax.sgst_amount = taxable * (tax.sgst_rate / 100);
    tax.total = tax.cgst_amount + tax.sgst_amount;
  }
  return tax;
}

function resolveItemId(body, index, firmId, type, isGst, itemName) {
  const rawItemId = formArrayValue(body.item_id, index, null);
  if (rawItemId && !isNaN(parseInt(rawItemId)) && parseInt(rawItemId) > 0) {
    return parseInt(rawItemId);
  }

  const existingItem = Item.getByName(itemName, firmId);
  if (existingItem) {
    return existingItem.id;
  }

  const rowRate = parseFloat(formArrayValue(body.rate, index, 0)) || 0;
  const newItem = Item.create({
    firm_id: firmId,
    name: itemName,
    item_code: null,
    hsn_code: formArrayValue(body.hsn_code, index, '') || null,
    unit: formArrayValue(body.unit, index, 'PCS') || 'PCS',
    sale_price: type === 'sale' ? rowRate : 0,
    purchase_price: type === 'purchase' ? rowRate : 0,
    tax_rate: isGst ? (parseFloat(formArrayValue(body.item_tax_rate, index, 0)) || 0) : 0,
    opening_stock: 0,
    low_stock_threshold: 0
  });
  return newItem.id;
}

function buildInvoiceItems(body, firmId, type, isGst, isInterstate) {
  const itemNames = Array.isArray(body.item_name) ? body.item_name : (body.item_name ? [body.item_name] : []);
  const items = [];
  const totals = { subtotal: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };

  for (let index = 0; index < itemNames.length; index++) {
    const rawName = itemNames[index];
    if (!rawName || !rawName.trim()) continue;

    const itemName = rawName.trim();
    const quantity = parseFloat(formArrayValue(body.quantity, index, 1)) || 1;
    const rate = parseFloat(formArrayValue(body.rate, index, 0)) || 0;
    const discountPercent = parseFloat(formArrayValue(body.item_discount_percent, index, 0)) || 0;
    const gross = quantity * rate;
    const discountAmount = gross * (discountPercent / 100);
    const taxableAmount = Math.max(0, gross - discountAmount);
    const taxRate = isGst ? (parseFloat(formArrayValue(body.item_tax_rate, index, 0)) || 0) : 0;
    const tax = calculateTax(taxableAmount, taxRate, isGst, isInterstate);
    const totalAmount = taxableAmount + tax.total;

    totals.subtotal += taxableAmount;
    totals.cgst += tax.cgst_amount;
    totals.sgst += tax.sgst_amount;
    totals.igst += tax.igst_amount;
    totals.tax += tax.total;

    items.push({
      item_id: resolveItemId(body, index, firmId, type, isGst, itemName),
      item_name: itemName,
      hsn_code: formArrayValue(body.hsn_code, index, '') || null,
      unit: formArrayValue(body.unit, index, 'PCS') || 'PCS',
      quantity,
      rate,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      taxable_amount: taxableAmount,
      tax_rate: taxRate,
      cgst_rate: tax.cgst_rate,
      cgst_amount: tax.cgst_amount,
      sgst_rate: tax.sgst_rate,
      sgst_amount: tax.sgst_amount,
      igst_rate: tax.igst_rate,
      igst_amount: tax.igst_amount,
      total_amount: totalAmount
    });
  }

  return { items, totals };
}

function applyFinalAmountGst(totals, body, isGst, isInterstate, netTaxable) {
  if (!isGst || body.gst_calc_mode !== 'final_amount') {
    return totals;
  }

  const finalTaxRate = parseFloat(body.final_tax_rate) || 0;
  const taxTotals = { ...totals, cgst: 0, sgst: 0, igst: 0, tax: 0 };
  if (isInterstate) {
    taxTotals.igst = netTaxable * (finalTaxRate / 100);
    taxTotals.tax = taxTotals.igst;
  } else {
    taxTotals.cgst = netTaxable * ((finalTaxRate / 2) / 100);
    taxTotals.sgst = netTaxable * ((finalTaxRate / 2) / 100);
    taxTotals.tax = taxTotals.cgst + taxTotals.sgst;
  }
  return taxTotals;
}

function buildInvoiceSubmission({ body, firmId, activeFirm, existingInvoice = null, redirectTo }) {
  const type = body.type || existingInvoice?.type || 'sale';
  const cleaned = validatePartyFields(body, redirectTo);
  const partyId = resolveParty(body, firmId, cleaned);
  const isGst = isChecked(body.is_gst_bill);
  const isInterstate = isChecked(body.is_interstate);
  const { items, totals: itemTotals } = buildInvoiceItems(body, firmId, type, isGst, isInterstate);

  if (items.length === 0) {
    throw submissionError('Please add at least one item row to the bill.', redirectTo);
  }

  const discountValue = parseFloat(body.discount_value) || 0;
  const discountType = body.discount_type || 'percentage';
  const discountAmount = discountType === 'percentage' ? itemTotals.subtotal * (discountValue / 100) : discountValue;
  const netTaxable = Math.max(0, itemTotals.subtotal - discountAmount);
  const totals = applyFinalAmountGst(itemTotals, body, isGst, isInterstate, netTaxable);
  const unroundedGrand = netTaxable + totals.tax;
  const grandTotal = Math.round(unroundedGrand);
  const roundOff = grandTotal - unroundedGrand;
  const paidAmount = parseFloat(body.paid_amount) || 0;
  const balanceDue = Math.max(0, grandTotal - paidAmount);
  const paymentStatus = paidAmount >= grandTotal && grandTotal > 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');

  const invoiceData = {
    firm_id: firmId,
    type,
    invoice_number: body.invoice_number && body.invoice_number.trim()
      ? body.invoice_number.trim()
      : existingInvoice?.invoice_number || Invoice.getNextInvoiceNumber(firmId, type),
    invoice_date: body.invoice_date || existingInvoice?.invoice_date || todayIso(),
    due_date: body.due_date || null,
    party_id: partyId,
    party_name: body.party_name.trim(),
    party_phone: body.party_phone ? body.party_phone.trim() : null,
    party_gstin: body.party_gstin ? body.party_gstin.trim().toUpperCase() : null,
    party_address: body.party_address ? body.party_address.trim() : null,
    party_state: body.party_state ? body.party_state.trim() : null,
    party_state_code: body.party_state_code ? body.party_state_code.trim() : null,
    is_gst_bill: isGst ? 1 : 0,
    is_interstate: isInterstate ? 1 : 0,
    subtotal: itemTotals.subtotal,
    discount_type: discountType,
    discount_value: discountValue,
    discount_amount: discountAmount,
    taxable_amount: netTaxable,
    cgst_amount: totals.cgst,
    sgst_amount: totals.sgst,
    igst_amount: totals.igst,
    tax_amount: totals.tax,
    round_off: roundOff,
    grand_total: grandTotal,
    paid_amount: paidAmount,
    balance_due: balanceDue,
    payment_status: paymentStatus,
    payment_mode: body.payment_mode || 'cash',
    notes: body.notes ? body.notes.trim() : null,
    terms: body.terms ? body.terms.trim() : (activeFirm.terms || null)
  };

  return { invoiceData, items };
}

function renderInvoiceForm(req, res, type, title, invoice = null) {
  const firmId = req.activeFirm.id;
  const invoiceType = invoice ? (invoice.type || 'sale') : type;

  res.render('invoices/form', {
    title,
    isEdit: Boolean(invoice),
    invoice,
    invoiceType,
    nextInvoiceNumber: invoice ? invoice.invoice_number : Invoice.getNextInvoiceNumber(firmId, invoiceType),
    today: invoice ? invoice.invoice_date : todayIso(),
    parties: Party.getByFirmId(firmId, invoiceType === 'sale' ? 'customer' : 'supplier'),
    items: Item.getByFirmId(firmId),
    settings: Setting.get(firmId),
    gstStates: GST_STATES,
    activeMenu: invoiceType === 'sale' ? 'sales' : 'purchases'
  });
}

const invoiceController = {
  listSales: (req, res) => {
    res.render('invoices/sales_list', {
      title: 'Sales Records',
      invoices: Invoice.getByFirmId(req.activeFirm.id, 'sale'),
      activeMenu: 'sales'
    });
  },

  listPurchases: (req, res) => {
    res.render('invoices/purchase_list', {
      title: 'Purchase Records',
      invoices: Invoice.getByFirmId(req.activeFirm.id, 'purchase'),
      activeMenu: 'purchases'
    });
  },

  getCreateSale: (req, res) => {
    renderInvoiceForm(req, res, 'sale', 'Create Sales Record');
  },

  getCreatePurchase: (req, res) => {
    renderInvoiceForm(req, res, 'purchase', 'Create Purchase Record');
  },

  postCreate: (req, res) => {
    try {
      const { invoiceData, items } = buildInvoiceSubmission({
        body: req.body,
        firmId: req.activeFirm.id,
        activeFirm: req.activeFirm,
        redirectTo: redirectForType(req.body.type)
      });
      const createdInvoice = Invoice.create(invoiceData, items);

      req.flash(
        'success_msg',
        `${req.body.type === 'purchase' ? 'Purchase Bill' : 'Sales Invoice'} "${createdInvoice.invoice_number}" created successfully!`
      );
      res.redirect(`/invoices/view/${createdInvoice.id}`);
    } catch (err) {
      console.error('Create invoice error:', err);
      req.flash('error_msg', 'Failed to generate bill: ' + err.message);
      res.redirect(err.redirectTo || redirectForType(req.body.type));
    }
  },

  getEdit: (req, res) => {
    const invoice = Invoice.getById(req.params.id, req.activeFirm.id);
    if (!invoice) {
      req.flash('error_msg', 'Invoice not found.');
      return res.redirect('/sales');
    }

    const label = invoice.type === 'sale' ? 'Sales Invoice' : 'Purchase Bill';
    renderInvoiceForm(req, res, invoice.type || 'sale', `Edit ${label}: ${invoice.invoice_number}`, invoice);
  },

  postEdit: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const invoiceId = parseInt(req.params.id);
      const existingInvoice = Invoice.getById(invoiceId, firmId);
      if (!existingInvoice) {
        req.flash('error_msg', 'Invoice not found.');
        return res.redirect('/sales');
      }

      const { invoiceData, items } = buildInvoiceSubmission({
        body: req.body,
        firmId,
        activeFirm: req.activeFirm,
        existingInvoice,
        redirectTo: `/invoices/edit/${invoiceId}`
      });
      const updatedInvoice = Invoice.update(invoiceId, firmId, invoiceData, items);

      req.flash(
        'success_msg',
        `${req.body.type === 'purchase' ? 'Purchase Bill' : 'Sales Invoice'} "${updatedInvoice.invoice_number}" updated successfully!`
      );
      res.redirect(`/invoices/view/${updatedInvoice.id}`);
    } catch (err) {
      console.error('Update invoice error:', err);
      req.flash('error_msg', 'Failed to update bill: ' + err.message);
      res.redirect(err.redirectTo || `/invoices/edit/${req.params.id}`);
    }
  },

  getView: (req, res) => {
    const invoice = Invoice.getById(req.params.id, req.activeFirm.id);
    if (!invoice) {
      req.flash('error_msg', 'Invoice not found.');
      return res.redirect('/sales');
    }

    res.render('invoices/view', {
      title: `${invoice.type === 'purchase' ? 'Purchase Record' : 'Sales Record'} - ${invoice.invoice_number}`,
      invoice,
      firm: req.activeFirm,
      activeMenu: invoice.type === 'purchase' ? 'purchases' : 'sales'
    });
  },

  getDownload: (req, res) => {
    const firmId = req.activeFirm.id;
    const invoice = Invoice.getById(req.params.id, firmId);
    if (!invoice) {
      req.flash('error_msg', 'Record not found.');
      return res.redirect('/sales');
    }

    res.render('invoices/download', {
      title: `Download Record - ${invoice.invoice_number}`,
      invoice,
      firm: req.activeFirm,
      settings: Setting.get(firmId),
      layout: false
    });
  },

  getPrintA4: (req, res) => {
    const invoice = Invoice.getById(req.params.id, req.activeFirm.id);
    if (!invoice) {
      req.flash('error_msg', 'Record not found.');
      return res.redirect('/sales');
    }

    res.render('invoices/print_a4', {
      title: `Print Record - ${invoice.invoice_number}`,
      invoice,
      firm: req.activeFirm,
      layout: false
    });
  },

  postDelete: (req, res) => {
    try {
      const invoice = Invoice.getById(req.params.id, req.activeFirm.id);
      if (!invoice) {
        req.flash('error_msg', 'Record not found.');
        return res.redirect('/sales');
      }

      Invoice.delete(req.params.id, req.activeFirm.id);
      req.flash('success_msg', `Record "${invoice.invoice_number}" deleted and item inventory restored.`);
      res.redirect(invoice.type === 'purchase' ? '/purchases' : '/sales');
    } catch (err) {
      console.error('Delete record error:', err);
      req.flash('error_msg', 'Failed to delete record.');
      res.redirect('/sales');
    }
  }
};

module.exports = invoiceController;
