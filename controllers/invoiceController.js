const { Invoice, Party, Item, Setting, GST_STATES } = require('../models');

const invoiceController = {
  listSales: (req, res) => {
    const firmId = req.activeFirm.id;
    const invoices = Invoice.getByFirmId(firmId, 'sale');

    res.render('invoices/sales_list', {
      title: 'Sales Invoices',
      invoices,
      activeMenu: 'sales'
    });
  },

  listPurchases: (req, res) => {
    const firmId = req.activeFirm.id;
    const invoices = Invoice.getByFirmId(firmId, 'purchase');

    res.render('invoices/purchase_list', {
      title: 'Purchase Bills',
      invoices,
      activeMenu: 'purchases'
    });
  },

  getCreateSale: (req, res) => {
    const firmId = req.activeFirm.id;
    const parties = Party.getByFirmId(firmId, 'customer');
    const items = Item.getByFirmId(firmId);
    const nextInvoiceNumber = Invoice.getNextInvoiceNumber(firmId, 'sale');
    const today = new Date().toISOString().split('T')[0];
    const settings = Setting.get(firmId);

    res.render('invoices/form', {
      title: 'Create Sales Invoice',
      invoiceType: 'sale',
      nextInvoiceNumber,
      today,
      parties,
      items,
      settings,
      gstStates: GST_STATES,
      activeMenu: 'sales'
    });
  },

  getCreatePurchase: (req, res) => {
    const firmId = req.activeFirm.id;
    const parties = Party.getByFirmId(firmId, 'supplier');
    const items = Item.getByFirmId(firmId);
    const nextInvoiceNumber = Invoice.getNextInvoiceNumber(firmId, 'purchase');
    const today = new Date().toISOString().split('T')[0];
    const settings = Setting.get(firmId);

    res.render('invoices/form', {
      title: 'Create Purchase Bill',
      invoiceType: 'purchase',
      nextInvoiceNumber,
      today,
      parties,
      items,
      settings,
      gstStates: GST_STATES,
      activeMenu: 'purchases'
    });
  },

  postCreate: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const {
        type, invoice_number, invoice_date, due_date, party_id,
        party_name, party_phone, party_gstin, party_address, party_state, party_state_code,
        is_gst_bill, is_interstate, subtotal, discount_type, discount_value, discount_amount,
        taxable_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, round_off,
        grand_total, paid_amount, balance_due, payment_mode, notes, terms,
        // Line items arrays from form submission
        item_id, item_name, hsn_code, unit, quantity, rate,
        item_discount_percent, item_discount_amount, item_taxable, item_tax_rate,
        item_cgst_rate, item_cgst_amount, item_sgst_rate, item_sgst_amount,
        item_igst_rate, item_igst_amount, item_total
      } = req.body;

      if (!party_name || !party_name.trim()) {
        req.flash('error_msg', 'Customer / Party name is required.');
        return res.redirect(type === 'purchase' ? '/purchases/create' : '/sales/create');
      }

      // 1. Auto-resolve or create Party in database
      let resolvedPartyId = party_id && !isNaN(parseInt(party_id)) ? parseInt(party_id) : null;

      if (!resolvedPartyId) {
        let existingParty = Party.getByName(party_name.trim(), firmId);
        if (existingParty) {
          resolvedPartyId = existingParty.id;
        } else {
          const newParty = Party.create({
            firm_id: firmId,
            type: type === 'purchase' ? 'supplier' : 'customer',
            name: party_name.trim(),
            phone: party_phone ? party_phone.trim() : null,
            email: null,
            gstin: party_gstin ? party_gstin.trim().toUpperCase() : null,
            billing_address: party_address ? party_address.trim() : null,
            state: party_state ? party_state.trim() : null,
            state_code: party_state_code ? party_state_code.trim() : null,
            opening_balance: 0
          });
          resolvedPartyId = newParty.id;
        }
      }

      // 2. Parse & compute line items with server-side validation
      const itemsList = [];
      const itemNames = Array.isArray(item_name) ? item_name : (item_name ? [item_name] : []);
      const isGst = is_gst_bill === '1' || is_gst_bill === 'on' || is_gst_bill === true || is_gst_bill === 'true';
      const isInter = is_interstate === '1' || is_interstate === 'on' || is_interstate === true || is_interstate === 'true';

      const getItemVal = (arr, idx, fallback = 0) => {
        if (Array.isArray(arr)) return arr[idx] !== undefined && arr[idx] !== null && arr[idx] !== '' ? arr[idx] : fallback;
        return arr !== undefined && arr !== null && arr !== '' ? arr : fallback;
      };

      let computedSubtotal = 0;
      let computedTotalCgst = 0;
      let computedTotalSgst = 0;
      let computedTotalIgst = 0;
      let computedTotalTax = 0;

      for (let i = 0; i < itemNames.length; i++) {
        const rawName = itemNames[i];
        if (!rawName || !rawName.trim()) continue;

        const trimmedName = rawName.trim();
        let resolvedItemId = null;
        const rawItemId = getItemVal(item_id, i, null);

        if (rawItemId && !isNaN(parseInt(rawItemId)) && parseInt(rawItemId) > 0) {
          resolvedItemId = parseInt(rawItemId);
        } else {
          // Check if item exists in inventory, else auto-register item
          const existingItem = Item.getByName(trimmedName, firmId);
          if (existingItem) {
            resolvedItemId = existingItem.id;
          } else {
            const rowRate = parseFloat(getItemVal(rate, i, 0)) || 0;
            const rowUnit = getItemVal(unit, i, 'PCS') || 'PCS';
            const rowHsn = getItemVal(hsn_code, i, '') || null;
            const rowTaxRate = isGst ? (parseFloat(getItemVal(item_tax_rate, i, 0)) || 0) : 0;
            const newItem = Item.create({
              firm_id: firmId,
              name: trimmedName,
              item_code: null,
              hsn_code: rowHsn,
              unit: rowUnit,
              sale_price: type === 'sale' ? rowRate : 0,
              purchase_price: type === 'purchase' ? rowRate : 0,
              tax_rate: rowTaxRate,
              opening_stock: 0,
              low_stock_threshold: 0
            });
            resolvedItemId = newItem.id;
          }
        }

        const qty = parseFloat(getItemVal(quantity, i, 1)) || 1;
        const priceRate = parseFloat(getItemVal(rate, i, 0)) || 0;
        const discPercent = parseFloat(getItemVal(item_discount_percent, i, 0)) || 0;
        const gross = qty * priceRate;
        const discAmt = gross * (discPercent / 100);
        const taxable = Math.max(0, gross - discAmt);
        const taxRate = isGst ? (parseFloat(getItemVal(item_tax_rate, i, 0)) || 0) : 0;

        let rowCgstRate = 0, rowCgstAmt = 0;
        let rowSgstRate = 0, rowSgstAmt = 0;
        let rowIgstRate = 0, rowIgstAmt = 0;
        let rowTax = 0;

        if (isGst && taxRate > 0) {
          if (isInter) {
            rowIgstRate = taxRate;
            rowIgstAmt = taxable * (rowIgstRate / 100);
            rowTax = rowIgstAmt;
          } else {
            rowCgstRate = taxRate / 2;
            rowSgstRate = taxRate / 2;
            rowCgstAmt = taxable * (rowCgstRate / 100);
            rowSgstAmt = taxable * (rowSgstRate / 100);
            rowTax = rowCgstAmt + rowSgstAmt;
          }
        }

        const rowTotal = taxable + rowTax;

        computedSubtotal += taxable;
        computedTotalCgst += rowCgstAmt;
        computedTotalSgst += rowSgstAmt;
        computedTotalIgst += rowIgstAmt;
        computedTotalTax += rowTax;

        itemsList.push({
          item_id: resolvedItemId,
          item_name: trimmedName,
          hsn_code: getItemVal(hsn_code, i, '') || null,
          unit: getItemVal(unit, i, 'PCS') || 'PCS',
          quantity: qty,
          rate: priceRate,
          discount_percent: discPercent,
          discount_amount: discAmt,
          taxable_amount: taxable,
          tax_rate: taxRate,
          cgst_rate: rowCgstRate,
          cgst_amount: rowCgstAmt,
          sgst_rate: rowSgstRate,
          sgst_amount: rowSgstAmt,
          igst_rate: rowIgstRate,
          igst_amount: rowIgstAmt,
          total_amount: rowTotal
        });
      }

      if (itemsList.length === 0) {
        req.flash('error_msg', 'Please add at least one item row to the bill.');
        return res.redirect(type === 'purchase' ? '/purchases/create' : '/sales/create');
      }

      // 3. Compute overall invoice discount & grand total
      const discVal = parseFloat(discount_value) || 0;
      const discType = discount_type || 'percentage';
      let overallDiscAmt = 0;
      if (discType === 'percentage') {
        overallDiscAmt = computedSubtotal * (discVal / 100);
      } else {
        overallDiscAmt = discVal;
      }

      const netTaxable = Math.max(0, computedSubtotal - overallDiscAmt);

      // Support for Final Amount GST Calculation Mode
      const isFinalAmountGst = req.body.gst_calc_mode === 'final_amount';
      if (isGst && isFinalAmountGst) {
        const finalTaxRate = parseFloat(req.body.final_tax_rate) || 0;
        if (isInter) {
          computedTotalIgst = netTaxable * (finalTaxRate / 100);
          computedTotalCgst = 0;
          computedTotalSgst = 0;
          computedTotalTax = computedTotalIgst;
        } else {
          computedTotalCgst = netTaxable * ((finalTaxRate / 2) / 100);
          computedTotalSgst = netTaxable * ((finalTaxRate / 2) / 100);
          computedTotalIgst = 0;
          computedTotalTax = computedTotalCgst + computedTotalSgst;
        }
      }

      const unroundedGrand = netTaxable + computedTotalTax;
      const totalGrand = Math.round(unroundedGrand);
      const roundOffVal = totalGrand - unroundedGrand;

      const totalPaid = parseFloat(paid_amount) || 0;
      const totalDue = Math.max(0, totalGrand - totalPaid);

      let paymentStatus = 'unpaid';
      if (totalPaid >= totalGrand && totalGrand > 0) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      const invNumber = invoice_number && invoice_number.trim()
        ? invoice_number.trim()
        : Invoice.getNextInvoiceNumber(firmId, type || 'sale');

      const invoiceData = {
        firm_id: firmId,
        type: type || 'sale',
        invoice_number: invNumber,
        invoice_date: invoice_date || new Date().toISOString().split('T')[0],
        due_date: due_date || null,
        party_id: resolvedPartyId,
        party_name: party_name.trim(),
        party_phone: party_phone ? party_phone.trim() : null,
        party_gstin: party_gstin ? party_gstin.trim().toUpperCase() : null,
        party_address: party_address ? party_address.trim() : null,
        party_state: party_state ? party_state.trim() : null,
        party_state_code: party_state_code ? party_state_code.trim() : null,
        is_gst_bill: isGst ? 1 : 0,
        is_interstate: isInter ? 1 : 0,
        subtotal: computedSubtotal,
        discount_type: discType,
        discount_value: discVal,
        discount_amount: overallDiscAmt,
        taxable_amount: netTaxable,
        cgst_amount: computedTotalCgst,
        sgst_amount: computedTotalSgst,
        igst_amount: computedTotalIgst,
        tax_amount: computedTotalTax,
        round_off: roundOffVal,
        grand_total: totalGrand,
        paid_amount: totalPaid,
        balance_due: totalDue,
        payment_status: paymentStatus,
        payment_mode: payment_mode || 'cash',
        notes: notes ? notes.trim() : null,
        terms: terms ? terms.trim() : (req.activeFirm.terms || null)
      };

      const createdInvoice = Invoice.create(invoiceData, itemsList);

      req.flash(
        'success_msg',
        `${type === 'purchase' ? 'Purchase Bill' : 'Sales Invoice'} "${createdInvoice.invoice_number}" created successfully!`
      );
      res.redirect(`/invoices/view/${createdInvoice.id}`);
    } catch (err) {
      console.error('Create invoice error:', err);
      req.flash('error_msg', 'Failed to generate bill: ' + err.message);
      res.redirect(req.body.type === 'purchase' ? '/purchases/create' : '/sales/create');
    }
  },

  getView: (req, res) => {
    const firmId = req.activeFirm.id;
    const invoice = Invoice.getById(req.params.id, firmId);
    if (!invoice) {
      req.flash('error_msg', 'Invoice not found.');
      return res.redirect('/sales');
    }

    res.render('invoices/view', {
      title: `${invoice.type === 'purchase' ? 'Purchase Bill' : 'Sales Invoice'} - ${invoice.invoice_number}`,
      invoice,
      firm: req.activeFirm,
      activeMenu: invoice.type === 'purchase' ? 'purchases' : 'sales'
    });
  },

  getPrintA4: (req, res) => {
    const firmId = req.activeFirm.id;
    const invoice = Invoice.getById(req.params.id, firmId);
    if (!invoice) {
      req.flash('error_msg', 'Invoice not found.');
      return res.redirect('/sales');
    }

    res.render('invoices/print_a4', {
      title: `Print - ${invoice.invoice_number}`,
      invoice,
      firm: req.activeFirm,
      layout: false // Render standalone without master header/footer for clean printing
    });
  },

  postDelete: (req, res) => {
    try {
      const firmId = req.activeFirm.id;
      const invoice = Invoice.getById(req.params.id, firmId);
      if (!invoice) {
        req.flash('error_msg', 'Invoice not found.');
        return res.redirect('/sales');
      }

      const invType = invoice.type;
      Invoice.delete(req.params.id, firmId);

      req.flash('success_msg', `Invoice "${invoice.invoice_number}" deleted and item inventory restored.`);
      res.redirect(invType === 'purchase' ? '/purchases' : '/sales');
    } catch (err) {
      console.error('Delete invoice error:', err);
      req.flash('error_msg', 'Failed to delete invoice.');
      res.redirect('/sales');
    }
  }
};

module.exports = invoiceController;
