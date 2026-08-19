const db = require('../config/db');

// State list with standard 2-digit GST state codes
const GST_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra and Nagar Haveli and Daman and Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
  { code: '97', name: 'Other Territory' }
];

const User = {
  findById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
  findByEmail: (email) => db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email),
  findByPhone: (phone) => db.prepare('SELECT * FROM users WHERE phone = ?').get(phone),
  findByGoogleId: (googleId) => db.prepare('SELECT * FROM users WHERE google_id = ?').get(googleId),
  findByEmailOrPhone: (identifier) => {
    return db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?) OR phone = ?').get(identifier, identifier);
  },
  create: ({ name, email, phone, password, google_id, avatar }) => {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, password, google_id, avatar)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, email || null, phone || null, password || null, google_id || null, avatar || null);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  },
  updateGoogleId: (id, google_id, avatar) => {
    db.prepare('UPDATE users SET google_id = ?, avatar = COALESCE(avatar, ?) WHERE id = ?').run(google_id, avatar, id);
    return User.findById(id);
  }
};

const Firm = {
  getByUserId: (userId) => db.prepare('SELECT * FROM firms WHERE user_id = ? ORDER BY is_default DESC, name ASC').all(userId),
  getById: (id, userId) => db.prepare('SELECT * FROM firms WHERE id = ? AND user_id = ?').get(id, userId),
  getDefault: (userId) => db.prepare('SELECT * FROM firms WHERE user_id = ? ORDER BY is_default DESC, id ASC LIMIT 1').get(userId),
  create: (firmData) => {
    const {
      user_id, name, gstin, pan, phone, email, address, city, state, state_code,
      pincode, bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id, terms,
      logo_path, signature_path, is_default
    } = firmData;

    const insert = db.transaction(() => {
      if (is_default) {
        db.prepare('UPDATE firms SET is_default = 0 WHERE user_id = ?').run(user_id);
      }
      // If this is the user's first firm, make it default automatically
      const existingCount = db.prepare('SELECT COUNT(*) as count FROM firms WHERE user_id = ?').get(user_id).count;
      const defaultFlag = (is_default || existingCount === 0) ? 1 : 0;

      const stmt = db.prepare(`
        INSERT INTO firms (
          user_id, name, gstin, pan, phone, email, address, city, state, state_code,
          pincode, bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id, terms,
          logo_path, signature_path, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        user_id, name, gstin || null, pan || null, phone || null, email || null,
        address || null, city || null, state || null, state_code || null,
        pincode || null, bank_name || null, bank_account_no || null, bank_ifsc || null,
        bank_branch || null, upi_id || null, terms || null, logo_path || null,
        signature_path || null, defaultFlag
      );
      return db.prepare('SELECT * FROM firms WHERE id = ?').get(info.lastInsertRowid);
    });

    return insert();
  },
  update: (id, userId, firmData) => {
    const {
      name, gstin, pan, phone, email, address, city, state, state_code,
      pincode, bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id, terms,
      logo_path, signature_path, is_default
    } = firmData;

    const updateTx = db.transaction(() => {
      if (is_default) {
        db.prepare('UPDATE firms SET is_default = 0 WHERE user_id = ?').run(userId);
      }

      let query = `
        UPDATE firms SET
          name = ?, gstin = ?, pan = ?, phone = ?, email = ?, address = ?, city = ?,
          state = ?, state_code = ?, pincode = ?, bank_name = ?, bank_account_no = ?,
          bank_ifsc = ?, bank_branch = ?, upi_id = ?, terms = ?, is_default = COALESCE(?, is_default)
      `;
      const params = [
        name, gstin || null, pan || null, phone || null, email || null, address || null, city || null,
        state || null, state_code || null, pincode || null, bank_name || null, bank_account_no || null,
        bank_ifsc || null, bank_branch || null, upi_id || null, terms || null, is_default !== undefined ? (is_default ? 1 : 0) : null
      ];

      if (logo_path !== undefined) {
        query += `, logo_path = ?`;
        params.push(logo_path);
      }
      if (signature_path !== undefined) {
        query += `, signature_path = ?`;
        params.push(signature_path);
      }

      query += ` WHERE id = ? AND user_id = ?`;
      params.push(id, userId);

      db.prepare(query).run(...params);
      return db.prepare('SELECT * FROM firms WHERE id = ?').get(id);
    });

    return updateTx();
  },
  setDefault: (id, userId) => {
    const tx = db.transaction(() => {
      db.prepare('UPDATE firms SET is_default = 0 WHERE user_id = ?').run(userId);
      db.prepare('UPDATE firms SET is_default = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    });
    tx();
  },
  delete: (id, userId) => {
    return db.prepare('DELETE FROM firms WHERE id = ? AND user_id = ?').run(id, userId);
  }
};

const Party = {
  getByFirmId: (firmId, type = null) => {
    if (type) {
      return db.prepare(`SELECT * FROM parties WHERE firm_id = ? AND (type = ? OR type = 'both') ORDER BY name ASC`).all(firmId, type);
    }
    return db.prepare('SELECT * FROM parties WHERE firm_id = ? ORDER BY name ASC').all(firmId);
  },
  getById: (id, firmId) => db.prepare('SELECT * FROM parties WHERE id = ? AND firm_id = ?').get(id, firmId),
  getByName: (name, firmId) => {
    if (!name || !name.trim()) return null;
    return db.prepare('SELECT * FROM parties WHERE LOWER(name) = LOWER(?) AND firm_id = ?').get(name.trim(), firmId);
  },
  create: (partyData) => {
    const {
      firm_id, type, name, phone, email, gstin, pan, billing_address,
      shipping_address, city, state, state_code, pincode, opening_balance
    } = partyData;

    const stmt = db.prepare(`
      INSERT INTO parties (
        firm_id, type, name, phone, email, gstin, pan, billing_address,
        shipping_address, city, state, state_code, pincode, opening_balance
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      firm_id, type || 'customer', name.trim(), phone || null, email || null,
      gstin || null, pan || null, billing_address || null, shipping_address || null,
      city || null, state || null, state_code || null, pincode || null,
      parseFloat(opening_balance) || 0
    );
    return db.prepare('SELECT * FROM parties WHERE id = ?').get(info.lastInsertRowid);
  },
  update: (id, firmId, partyData) => {
    const {
      type, name, phone, email, gstin, pan, billing_address,
      shipping_address, city, state, state_code, pincode, opening_balance
    } = partyData;

    db.prepare(`
      UPDATE parties SET
        type = ?, name = ?, phone = ?, email = ?, gstin = ?, pan = ?,
        billing_address = ?, shipping_address = ?, city = ?, state = ?,
        state_code = ?, pincode = ?, opening_balance = ?
      WHERE id = ? AND firm_id = ?
    `).run(
      type || 'customer', name.trim(), phone || null, email || null, gstin || null,
      pan || null, billing_address || null, shipping_address || null, city || null,
      state || null, state_code || null, pincode || null, parseFloat(opening_balance) || 0,
      id, firmId
    );
    return Party.getById(id, firmId);
  },
  delete: (id, firmId) => {
    return db.prepare('DELETE FROM parties WHERE id = ? AND firm_id = ?').run(id, firmId);
  },

  // FIFO Bill Settlement Synchronizer: Allocates payments to oldest bills first
  syncFIFOSettlement: (partyId, firmId) => {
    if (!partyId) return;

    const syncTx = db.transaction(() => {
      const updateInvStmt = db.prepare(`
        UPDATE invoices SET paid_amount = ?, balance_due = ?, payment_status = ?
        WHERE id = ?
      `);

      // 1. Sync Sales Invoices against Payment-In receipts (FIFO)
      const salesInvoices = db.prepare(`
        SELECT * FROM invoices 
        WHERE party_id = ? AND firm_id = ? AND type = 'sale' 
        ORDER BY invoice_date ASC, id ASC
      `).all(partyId, firmId);

      const paymentsIn = db.prepare(`
        SELECT * FROM payments 
        WHERE party_id = ? AND firm_id = ? AND type = 'payment_in' 
        ORDER BY payment_date ASC, id ASC
      `).all(partyId, firmId);

      let totalCashReceived = paymentsIn.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      for (const inv of salesInvoices) {
        const grandTotal = parseFloat(inv.grand_total) || 0;
        const allocated = Math.min(totalCashReceived, grandTotal);
        const due = Math.max(0, grandTotal - allocated);
        const status = due <= 0.001 ? 'paid' : (allocated > 0 ? 'partial' : 'unpaid');

        updateInvStmt.run(allocated, due, status, inv.id);
        totalCashReceived = Math.max(0, totalCashReceived - allocated);
      }

      // 2. Sync Purchase Invoices against Payment-Out vouchers (FIFO)
      const purchaseInvoices = db.prepare(`
        SELECT * FROM invoices 
        WHERE party_id = ? AND firm_id = ? AND type = 'purchase' 
        ORDER BY invoice_date ASC, id ASC
      `).all(partyId, firmId);

      const paymentsOut = db.prepare(`
        SELECT * FROM payments 
        WHERE party_id = ? AND firm_id = ? AND type = 'payment_out' 
        ORDER BY payment_date ASC, id ASC
      `).all(partyId, firmId);

      let totalCashPaid = paymentsOut.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      for (const inv of purchaseInvoices) {
        const grandTotal = parseFloat(inv.grand_total) || 0;
        const allocated = Math.min(totalCashPaid, grandTotal);
        const due = Math.max(0, grandTotal - allocated);
        const status = due <= 0.001 ? 'paid' : (allocated > 0 ? 'partial' : 'unpaid');

        updateInvStmt.run(allocated, due, status, inv.id);
        totalCashPaid = Math.max(0, totalCashPaid - allocated);
      }
    });

    syncTx();
  },

  // Comprehensive Party Ledger with FIFO Step-by-Step Breakdown
  getLedger: (partyId, firmId) => {
    // First synchronize latest FIFO state
    Party.syncFIFOSettlement(partyId, firmId);

    const party = Party.getById(partyId, firmId);
    if (!party) return null;

    // Get all invoices for this party
    const invoices = db.prepare(`
      SELECT 
        id, invoice_number as voucher_no, invoice_date as date, type,
        grand_total, paid_amount, balance_due, payment_status, notes, 'invoice' as entry_type
      FROM invoices
      WHERE party_id = ? AND firm_id = ?
      ORDER BY invoice_date ASC, id ASC
    `).all(partyId, firmId);

    // Get all payments for this party
    const payments = db.prepare(`
      SELECT 
        id, payment_number as voucher_no, payment_date as date, type,
        amount, payment_mode, reference_no, notes, 'payment' as entry_type
      FROM payments
      WHERE party_id = ? AND firm_id = ?
      ORDER BY payment_date ASC, id ASC
    `).all(partyId, firmId);

    // Track simulated FIFO balances for each invoice as transactions occur
    const invStateMap = {};
    invoices.forEach(inv => {
      invStateMap[inv.id] = {
        number: inv.voucher_no,
        total: parseFloat(inv.grand_total) || 0,
        paid: 0,
        due: parseFloat(inv.grand_total) || 0
      };
    });

    // Opening Balance
    let runningBalance = parseFloat(party.opening_balance) || 0;
    let totalBilled = 0;
    let totalPaid = 0;

    const allEntries = [...invoices, ...payments].sort((a, b) => new Date(a.date) - new Date(b.date) || a.id - b.id);
    const transactions = [];

    for (const entry of allEntries) {
      let debit = 0;
      let credit = 0;
      let fifoDetails = '';

      if (entry.entry_type === 'invoice') {
        if (entry.type === 'sale') {
          debit = parseFloat(entry.grand_total) || 0;
          totalBilled += debit;
          runningBalance += debit;
          fifoDetails = `Sale Bill ${entry.voucher_no} generated (₹${debit.toFixed(2)})`;
        } else if (entry.type === 'purchase') {
          credit = parseFloat(entry.grand_total) || 0;
          totalBilled += credit;
          runningBalance -= credit;
          fifoDetails = `Purchase Bill ${entry.voucher_no} generated (₹${credit.toFixed(2)})`;
        }
      } else if (entry.entry_type === 'payment') {
        const payAmt = parseFloat(entry.amount) || 0;
        totalPaid += payAmt;

        if (entry.type === 'payment_in') {
          credit = payAmt;
          runningBalance -= payAmt;

          // Apply payment to oldest pending sale invoice in simulation
          let rem = payAmt;
          const logs = [];

          for (const inv of invoices.filter(i => i.type === 'sale')) {
            const st = invStateMap[inv.id];
            if (st && st.due > 0.001) {
              const apply = Math.min(rem, st.due);
              st.due -= apply;
              st.paid += apply;
              rem -= apply;

              if (st.due <= 0.001) {
                logs.push(`Bill ${st.number} cleared (₹${apply.toFixed(2)})`);
              } else {
                logs.push(`Applied ₹${apply.toFixed(2)} to oldest bill ${st.number} (Balance left in bill: ₹${st.due.toFixed(2)})`);
              }

              if (rem <= 0) break;
            }
          }

          if (logs.length > 0) {
            fifoDetails = `${logs.join('. ')}. Total balance left: ₹${runningBalance.toFixed(2)}`;
          } else {
            fifoDetails = `Advance payment of ₹${payAmt.toFixed(2)} received. Total balance left: ₹${runningBalance.toFixed(2)}`;
          }

        } else if (entry.type === 'payment_out') {
          debit = payAmt;
          runningBalance += payAmt;

          // Apply payment to oldest pending purchase invoice
          let rem = payAmt;
          const logs = [];

          for (const inv of invoices.filter(i => i.type === 'purchase')) {
            const st = invStateMap[inv.id];
            if (st && st.due > 0.001) {
              const apply = Math.min(rem, st.due);
              st.due -= apply;
              st.paid += apply;
              rem -= apply;

              if (st.due <= 0.001) {
                logs.push(`Purchase Bill ${st.number} cleared (₹${apply.toFixed(2)})`);
              } else {
                logs.push(`Applied ₹${apply.toFixed(2)} to oldest bill ${st.number} (Balance left in bill: ₹${st.due.toFixed(2)})`);
              }

              if (rem <= 0) break;
            }
          }

          if (logs.length > 0) {
            fifoDetails = `${logs.join('. ')}. Total balance left: ₹${Math.abs(runningBalance).toFixed(2)}`;
          } else {
            fifoDetails = `Payment of ₹${payAmt.toFixed(2)} made. Total balance left: ₹${Math.abs(runningBalance).toFixed(2)}`;
          }
        }
      }

      transactions.push({
        ...entry,
        debit,
        credit,
        running_balance: runningBalance,
        fifo_details: fifoDetails
      });
    }

    // Pending unpaid bills currently
    const pendingBills = invoices.filter(i => i.balance_due > 0.001);

    return {
      party,
      opening_balance: parseFloat(party.opening_balance) || 0,
      total_billed: totalBilled,
      total_paid: totalPaid,
      closing_balance: runningBalance,
      pending_bills: pendingBills,
      transactions
    };
  },
  getPartySummary: (firmId) => {
    return db.prepare(`
      SELECT 
        p.*,
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE party_id = p.id AND type = 'sale'), 0) as total_sales,
        COALESCE((SELECT SUM(grand_total) FROM invoices WHERE party_id = p.id AND type = 'purchase'), 0) as total_purchases,
        COALESCE((SELECT SUM(balance_due) FROM invoices WHERE party_id = p.id AND type = 'sale'), 0) as sales_due,
        COALESCE((SELECT SUM(balance_due) FROM invoices WHERE party_id = p.id AND type = 'purchase'), 0) as purchase_due
      FROM parties p
      WHERE p.firm_id = ?
      ORDER BY p.name ASC
    `).all(firmId);
  }
};

const Item = {
  getByFirmId: (firmId) => db.prepare('SELECT * FROM items WHERE firm_id = ? ORDER BY name ASC').all(firmId),
  getById: (id, firmId) => db.prepare('SELECT * FROM items WHERE id = ? AND firm_id = ?').get(id, firmId),
  getByName: (name, firmId) => {
    if (!name || !name.trim()) return null;
    return db.prepare('SELECT * FROM items WHERE LOWER(name) = LOWER(?) AND firm_id = ?').get(name.trim(), firmId);
  },
  getLowStock: (firmId) => {
    return db.prepare(`
      SELECT * FROM items 
      WHERE firm_id = ? AND current_stock <= low_stock_threshold 
      ORDER BY current_stock ASC
    `).all(firmId);
  },
  create: (itemData) => {
    const {
      firm_id, name, item_code, hsn_code, unit, sale_price, purchase_price,
      tax_rate, tax_inclusive, opening_stock, low_stock_threshold, description
    } = itemData;

    const initialStock = parseFloat(opening_stock) || 0;

    const stmt = db.prepare(`
      INSERT INTO items (
        firm_id, name, item_code, hsn_code, unit, sale_price, purchase_price,
        tax_rate, tax_inclusive, opening_stock, current_stock, low_stock_threshold, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      firm_id, name.trim(), item_code || null, hsn_code || null, unit || 'PCS',
      parseFloat(sale_price) || 0, parseFloat(purchase_price) || 0,
      parseFloat(tax_rate) || 0, tax_inclusive ? 1 : 0,
      initialStock, initialStock, parseFloat(low_stock_threshold) || 0,
      description || null
    );
    return db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid);
  },
  update: (id, firmId, itemData) => {
    const {
      name, item_code, hsn_code, unit, sale_price, purchase_price,
      tax_rate, tax_inclusive, low_stock_threshold, description
    } = itemData;

    db.prepare(`
      UPDATE items SET
        name = ?, item_code = ?, hsn_code = ?, unit = ?, sale_price = ?,
        purchase_price = ?, tax_rate = ?, tax_inclusive = ?,
        low_stock_threshold = ?, description = ?
      WHERE id = ? AND firm_id = ?
    `).run(
      name.trim(), item_code || null, hsn_code || null, unit || 'PCS',
      parseFloat(sale_price) || 0, parseFloat(purchase_price) || 0,
      parseFloat(tax_rate) || 0, tax_inclusive ? 1 : 0,
      parseFloat(low_stock_threshold) || 0, description || null,
      id, firmId
    );
    return Item.getById(id, firmId);
  },
  adjustStock: (id, firmId, adjustment, reason = '') => {
    const item = Item.getById(id, firmId);
    if (!item) return null;
    const newStock = item.current_stock + parseFloat(adjustment);
    db.prepare('UPDATE items SET current_stock = ? WHERE id = ? AND firm_id = ?').run(newStock, id, firmId);
    return Item.getById(id, firmId);
  },
  delete: (id, firmId) => {
    return db.prepare('DELETE FROM items WHERE id = ? AND firm_id = ?').run(id, firmId);
  }
};

const Invoice = {
  getByFirmId: (firmId, type = 'sale') => {
    return db.prepare(`
      SELECT i.*, p.name as party_display_name
      FROM invoices i
      LEFT JOIN parties p ON i.party_id = p.id
      WHERE i.firm_id = ? AND i.type = ?
      ORDER BY i.invoice_date DESC, i.id DESC
    `).all(firmId, type);
  },
  getById: (id, firmId) => {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ? AND firm_id = ?').get(id, firmId);
    if (!invoice) return null;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);
    return { ...invoice, items };
  },
  getNextInvoiceNumber: (firmId, type = 'sale') => {
    const prefix = type === 'sale' ? 'INV' : 'PUR';
    const year = new Date().getFullYear();
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM invoices WHERE firm_id = ? AND type = ?
    `).get(firmId, type);
    const num = (countRow.count + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${num}`;
  },
  create: (invoiceData, itemsData) => {
    const {
      firm_id, type, invoice_number, invoice_date, due_date, party_id,
      party_name, party_phone, party_gstin, party_address, party_state, party_state_code,
      is_gst_bill, is_interstate, subtotal, discount_type, discount_value, discount_amount,
      taxable_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, round_off,
      grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, terms
    } = invoiceData;

    const createTx = db.transaction(() => {
      // 1. Insert invoice header
      const invoiceStmt = db.prepare(`
        INSERT INTO invoices (
          firm_id, type, invoice_number, invoice_date, due_date, party_id,
          party_name, party_phone, party_gstin, party_address, party_state, party_state_code,
          is_gst_bill, is_interstate, subtotal, discount_type, discount_value, discount_amount,
          taxable_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, round_off,
          grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, terms
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);

      const info = invoiceStmt.run(
        firm_id, type || 'sale', invoice_number, invoice_date, due_date || null,
        party_id || null, party_name, party_phone || null, party_gstin || null,
        party_address || null, party_state || null, party_state_code || null,
        is_gst_bill ? 1 : 0, is_interstate ? 1 : 0, parseFloat(subtotal) || 0,
        discount_type || 'percentage', parseFloat(discount_value) || 0, parseFloat(discount_amount) || 0,
        parseFloat(taxable_amount) || 0, parseFloat(cgst_amount) || 0, parseFloat(sgst_amount) || 0,
        parseFloat(igst_amount) || 0, parseFloat(tax_amount) || 0, parseFloat(round_off) || 0,
        parseFloat(grand_total) || 0, parseFloat(paid_amount) || 0, parseFloat(balance_due) || 0,
        payment_status || 'unpaid', payment_mode || 'cash', notes || null, terms || null
      );

      const invoiceId = info.lastInsertRowid;

      // 2. Insert line items & adjust stock
      const itemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, item_id, item_name, hsn_code, unit, quantity, rate,
          discount_percent, discount_amount, taxable_amount, tax_rate,
          cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of itemsData) {
        itemStmt.run(
          invoiceId, item.item_id || null, item.item_name, item.hsn_code || null,
          item.unit || 'PCS', parseFloat(item.quantity) || 1, parseFloat(item.rate) || 0,
          parseFloat(item.discount_percent) || 0, parseFloat(item.discount_amount) || 0,
          parseFloat(item.taxable_amount) || 0, parseFloat(item.tax_rate) || 0,
          parseFloat(item.cgst_rate) || 0, parseFloat(item.cgst_amount) || 0,
          parseFloat(item.sgst_rate) || 0, parseFloat(item.sgst_amount) || 0,
          parseFloat(item.igst_rate) || 0, parseFloat(item.igst_amount) || 0,
          parseFloat(item.total_amount) || 0
        );

        // Adjust stock if linked to an inventory item
        if (item.item_id) {
          const qtyChange = parseFloat(item.quantity) || 0;
          if (type === 'sale') {
            db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND firm_id = ?').run(qtyChange, item.item_id, firm_id);
          } else if (type === 'purchase') {
            db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ? AND firm_id = ?').run(qtyChange, item.item_id, firm_id);
          }
        }
      }

      // 3. If paid_amount > 0 at time of billing, record payment receipt/voucher automatically
      const paidAmt = parseFloat(paid_amount) || 0;
      if (paidAmt > 0 && party_id) {
        const payType = type === 'purchase' ? 'payment_out' : 'payment_in';
        const payNum = Payment.getNextPaymentNumber(firm_id, payType);
        db.prepare(`
          INSERT INTO payments (
            firm_id, type, payment_number, payment_date, party_id,
            invoice_id, amount, payment_mode, reference_no, notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          firm_id, payType, payNum, invoice_date, party_id,
          invoiceId, paidAmt, payment_mode || 'cash',
          invoice_number, `Paid on bill ${invoice_number}`
        );
      }

      // Synchronize FIFO allocations across all bills for this party
      if (party_id) {
        Party.syncFIFOSettlement(party_id, firm_id);
      }

      return Invoice.getById(invoiceId, firm_id);
    });

    return createTx();
  },
  delete: (id, firmId) => {
    const deleteTx = db.transaction(() => {
      const invoice = Invoice.getById(id, firmId);
      if (!invoice) return false;

      const partyId = invoice.party_id;

      // Revert item inventory stock
      for (const item of invoice.items) {
        if (item.item_id) {
          const qty = parseFloat(item.quantity) || 0;
          if (invoice.type === 'sale') {
            db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ? AND firm_id = ?').run(qty, item.item_id, firm_id);
          } else if (invoice.type === 'purchase') {
            db.prepare('UPDATE items SET current_stock = current_stock - ? WHERE id = ? AND firm_id = ?').run(qty, item.item_id, firm_id);
          }
        }
      }

      // Also delete any linked payment made during bill creation
      db.prepare('DELETE FROM payments WHERE invoice_id = ? AND firm_id = ?').run(id, firmId);

      db.prepare('DELETE FROM invoices WHERE id = ? AND firm_id = ?').run(id, firmId);

      if (partyId) {
        Party.syncFIFOSettlement(partyId, firmId);
      }

      return true;
    });

    return deleteTx();
  }
};

const Payment = {
  getByFirmId: (firmId, type = null) => {
    if (type) {
      return db.prepare(`
        SELECT p.*, pt.name as party_name, pt.type as party_type
        FROM payments p
        JOIN parties pt ON p.party_id = pt.id
        WHERE p.firm_id = ? AND p.type = ?
        ORDER BY p.payment_date DESC, p.id DESC
      `).all(firmId, type);
    }
    return db.prepare(`
      SELECT p.*, pt.name as party_name, pt.type as party_type
      FROM payments p
      JOIN parties pt ON p.party_id = pt.id
      WHERE p.firm_id = ?
      ORDER BY p.payment_date DESC, p.id DESC
    `).all(firmId);
  },
  getNextPaymentNumber: (firmId, type = 'payment_in') => {
    const prefix = type === 'payment_in' ? 'REC' : 'PAY';
    const year = new Date().getFullYear();
    const countRow = db.prepare(`
      SELECT COUNT(*) as count FROM payments WHERE firm_id = ? AND type = ?
    `).get(firmId, type);
    const num = (countRow.count + 1).toString().padStart(4, '0');
    return `${prefix}-${year}-${num}`;
  },
  create: (paymentData) => {
    const {
      firm_id, type, payment_number, payment_date, party_id,
      invoice_id, amount, payment_mode, reference_no, notes
    } = paymentData;

    const createTx = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO payments (
          firm_id, type, payment_number, payment_date, party_id,
          invoice_id, amount, payment_mode, reference_no, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const info = stmt.run(
        firm_id, type, payment_number, payment_date, party_id,
        invoice_id || null, parseFloat(amount) || 0,
        payment_mode || 'cash', reference_no || null, notes || null
      );

      // Trigger automatic FIFO distribution to settle oldest bills first
      Party.syncFIFOSettlement(party_id, firm_id);

      return db.prepare('SELECT * FROM payments WHERE id = ?').get(info.lastInsertRowid);
    });

    return createTx();
  },
  delete: (id, firmId) => {
    const deleteTx = db.transaction(() => {
      const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND firm_id = ?').get(id, firmId);
      if (!payment) return false;

      const partyId = payment.party_id;
      db.prepare('DELETE FROM payments WHERE id = ? AND firm_id = ?').run(id, firmId);

      if (partyId) {
        Party.syncFIFOSettlement(partyId, firmId);
      }
      return true;
    });

    return deleteTx();
  }
};

const Report = {
  getDashboardSummary: (firmId) => {
    const salesSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_sales_count,
        COALESCE(SUM(grand_total), 0) as total_sales_amount,
        COALESCE(SUM(paid_amount), 0) as total_sales_received,
        COALESCE(SUM(balance_due), 0) as total_receivables
      FROM invoices 
      WHERE firm_id = ? AND type = 'sale'
    `).get(firmId);

    const purchaseSummary = db.prepare(`
      SELECT 
        COUNT(*) as total_purchase_count,
        COALESCE(SUM(grand_total), 0) as total_purchase_amount,
        COALESCE(SUM(paid_amount), 0) as total_purchase_paid,
        COALESCE(SUM(balance_due), 0) as total_payables
      FROM invoices 
      WHERE firm_id = ? AND type = 'purchase'
    `).get(firmId);

    const todayDate = new Date().toISOString().split('T')[0];
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(grand_total), 0) as amount 
      FROM invoices 
      WHERE firm_id = ? AND type = 'sale' AND invoice_date = ?
    `).get(firmId, todayDate);

    const totalItems = db.prepare('SELECT COUNT(*) as count FROM items WHERE firm_id = ?').get(firmId);
    const lowStockItems = Item.getLowStock(firmId);

    const recentInvoices = db.prepare(`
      SELECT i.*, p.name as party_name 
      FROM invoices i 
      LEFT JOIN parties p ON i.party_id = p.id 
      WHERE i.firm_id = ? 
      ORDER BY i.created_at DESC LIMIT 6
    `).all(firmId);

    return {
      sales: salesSummary,
      purchases: purchaseSummary,
      todaySales: todaySales.amount,
      totalItems: totalItems.count,
      lowStockCount: lowStockItems.length,
      lowStockItems,
      recentInvoices
    };
  },
  getTaxReport: (firmId, fromDate, toDate) => {
    let query = `
      SELECT 
        is_gst_bill,
        COUNT(*) as invoice_count,
        COALESCE(SUM(taxable_amount), 0) as total_taxable,
        COALESCE(SUM(cgst_amount), 0) as total_cgst,
        COALESCE(SUM(sgst_amount), 0) as total_sgst,
        COALESCE(SUM(igst_amount), 0) as total_igst,
        COALESCE(SUM(tax_amount), 0) as total_tax,
        COALESCE(SUM(grand_total), 0) as total_gross
      FROM invoices
      WHERE firm_id = ? AND type = 'sale'
    `;
    const params = [firmId];

    if (fromDate && toDate) {
      query += ` AND invoice_date BETWEEN ? AND ?`;
      params.push(fromDate, toDate);
    }
    query += ` GROUP BY is_gst_bill`;

    const rows = db.prepare(query).all(...params);

    const detailedInvoices = db.prepare(`
      SELECT * FROM invoices 
      WHERE firm_id = ? AND type = 'sale' ${fromDate && toDate ? 'AND invoice_date BETWEEN ? AND ?' : ''}
      ORDER BY invoice_date ASC
    `).all(...(fromDate && toDate ? [firmId, fromDate, toDate] : [firmId]));

    return {
      summary: rows,
      invoices: detailedInvoices
    };
  },
  getItemWiseReport: (firmId) => {
    return db.prepare(`
      SELECT 
        it.id, it.name, it.item_code, it.unit, it.current_stock,
        COALESCE(SUM(ii.quantity), 0) as total_sold_qty,
        COALESCE(SUM(ii.total_amount), 0) as total_sales_value
      FROM items it
      LEFT JOIN invoice_items ii ON it.id = ii.item_id
      LEFT JOIN invoices inv ON ii.invoice_id = inv.id AND inv.type = 'sale'
      WHERE it.firm_id = ?
      GROUP BY it.id
      ORDER BY total_sold_qty DESC
    `).all(firmId);
  }
};

const Backup = {
  exportFullBackup: (userId) => {
    // Export user profile, all firms, and for each firm: parties, items, invoices, invoice_items, payments
    const user = User.findById(userId);
    if (!user) return null;

    const firms = db.prepare('SELECT * FROM firms WHERE user_id = ?').all(userId);
    const firmIds = firms.map(f => f.id);

    let parties = [];
    let items = [];
    let invoices = [];
    let invoiceItems = [];
    let payments = [];

    if (firmIds.length > 0) {
      const placeholders = firmIds.map(() => '?').join(',');
      parties = db.prepare(`SELECT * FROM parties WHERE firm_id IN (${placeholders})`).all(...firmIds);
      items = db.prepare(`SELECT * FROM items WHERE firm_id IN (${placeholders})`).all(...firmIds);
      invoices = db.prepare(`SELECT * FROM invoices WHERE firm_id IN (${placeholders})`).all(...firmIds);
      payments = db.prepare(`SELECT * FROM payments WHERE firm_id IN (${placeholders})`).all(...firmIds);

      const invoiceIds = invoices.map(i => i.id);
      if (invoiceIds.length > 0) {
        const invPlaceholders = invoiceIds.map(() => '?').join(',');
        invoiceItems = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id IN (${invPlaceholders})`).all(...invoiceIds);
      }
    }

    return {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      firms,
      parties,
      items,
      invoices,
      invoice_items: invoiceItems,
      payments
    };
  },
  restoreFullBackup: (userId, backupData) => {
    if (!backupData || !backupData.firms) {
      throw new Error('Invalid backup file format.');
    }

    const restoreTx = db.transaction(() => {
      // Create mapping of old firm ID -> new firm ID
      const firmIdMap = {};
      const partyIdMap = {};
      const itemIdMap = {};
      const invoiceIdMap = {};

      // 1. Insert Firms
      for (const f of backupData.firms) {
        const stmt = db.prepare(`
          INSERT INTO firms (
            user_id, name, gstin, pan, phone, email, address, city, state, state_code,
            pincode, bank_name, bank_account_no, bank_ifsc, bank_branch, upi_id, terms,
            logo_path, signature_path, is_default
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        const info = stmt.run(
          userId, f.name, f.gstin, f.pan, f.phone, f.email, f.address, f.city, f.state,
          f.state_code, f.pincode, f.bank_name, f.bank_account_no, f.bank_ifsc, f.bank_branch,
          f.upi_id, f.terms, f.logo_path, f.signature_path, f.is_default || 0
        );
        firmIdMap[f.id] = info.lastInsertRowid;
      }

      // 2. Insert Parties
      if (backupData.parties && backupData.parties.length > 0) {
        for (const p of backupData.parties) {
          const newFirmId = firmIdMap[p.firm_id];
          if (!newFirmId) continue;

          const stmt = db.prepare(`
            INSERT INTO parties (
              firm_id, type, name, phone, email, gstin, pan, billing_address,
              shipping_address, city, state, state_code, pincode, opening_balance
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const info = stmt.run(
            newFirmId, p.type || 'customer', p.name, p.phone, p.email, p.gstin, p.pan,
            p.billing_address, p.shipping_address, p.city, p.state, p.state_code,
            p.pincode, p.opening_balance || 0
          );
          partyIdMap[p.id] = info.lastInsertRowid;
        }
      }

      // 3. Insert Items
      if (backupData.items && backupData.items.length > 0) {
        for (const it of backupData.items) {
          const newFirmId = firmIdMap[it.firm_id];
          if (!newFirmId) continue;

          const stmt = db.prepare(`
            INSERT INTO items (
              firm_id, name, item_code, hsn_code, unit, sale_price, purchase_price,
              tax_rate, tax_inclusive, opening_stock, current_stock, low_stock_threshold, description
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const info = stmt.run(
            newFirmId, it.name, it.item_code, it.hsn_code, it.unit || 'PCS',
            it.sale_price || 0, it.purchase_price || 0, it.tax_rate || 0,
            it.tax_inclusive || 0, it.opening_stock || 0, it.current_stock || 0,
            it.low_stock_threshold || 0, it.description
          );
          itemIdMap[it.id] = info.lastInsertRowid;
        }
      }

      // 4. Insert Invoices
      if (backupData.invoices && backupData.invoices.length > 0) {
        for (const inv of backupData.invoices) {
          const newFirmId = firmIdMap[inv.firm_id];
          if (!newFirmId) continue;

          const newPartyId = inv.party_id ? partyIdMap[inv.party_id] : null;

          const stmt = db.prepare(`
            INSERT INTO invoices (
              firm_id, type, invoice_number, invoice_date, due_date, party_id,
              party_name, party_phone, party_gstin, party_address, party_state, party_state_code,
              is_gst_bill, is_interstate, subtotal, discount_type, discount_value, discount_amount,
              taxable_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, round_off,
              grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, terms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const info = stmt.run(
            newFirmId, inv.type || 'sale', inv.invoice_number, inv.invoice_date, inv.due_date,
            newPartyId, inv.party_name, inv.party_phone, inv.party_gstin, inv.party_address,
            inv.party_state, inv.party_state_code, inv.is_gst_bill, inv.is_interstate,
            inv.subtotal, inv.discount_type, inv.discount_value, inv.discount_amount,
            inv.taxable_amount, inv.cgst_amount, inv.sgst_amount, inv.igst_amount,
            inv.tax_amount, inv.round_off, inv.grand_total, inv.paid_amount, inv.balance_due,
            inv.payment_status, inv.payment_mode, inv.notes, inv.terms
          );
          invoiceIdMap[inv.id] = info.lastInsertRowid;
        }
      }

      // 5. Insert Line Items
      if (backupData.invoice_items && backupData.invoice_items.length > 0) {
        for (const ii of backupData.invoice_items) {
          const newInvoiceId = invoiceIdMap[ii.invoice_id];
          if (!newInvoiceId) continue;

          const newItemId = ii.item_id ? itemIdMap[ii.item_id] : null;

          const stmt = db.prepare(`
            INSERT INTO invoice_items (
              invoice_id, item_id, item_name, hsn_code, unit, quantity, rate,
              discount_percent, discount_amount, taxable_amount, tax_rate,
              cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            newInvoiceId, newItemId, ii.item_name, ii.hsn_code, ii.unit, ii.quantity, ii.rate,
            ii.discount_percent, ii.discount_amount, ii.taxable_amount, ii.tax_rate,
            ii.cgst_rate, ii.cgst_amount, ii.sgst_rate, ii.sgst_amount, ii.igst_rate,
            ii.igst_amount, ii.total_amount
          );
        }
      }

      // 6. Insert Payments
      if (backupData.payments && backupData.payments.length > 0) {
        for (const p of backupData.payments) {
          const newFirmId = firmIdMap[p.firm_id];
          const newPartyId = partyIdMap[p.party_id];
          if (!newFirmId || !newPartyId) continue;

          const newInvoiceId = p.invoice_id ? invoiceIdMap[p.invoice_id] : null;

          const stmt = db.prepare(`
            INSERT INTO payments (
              firm_id, type, payment_number, payment_date, party_id,
              invoice_id, amount, payment_mode, reference_no, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          stmt.run(
            newFirmId, p.type, p.payment_number, p.payment_date, newPartyId,
            newInvoiceId, p.amount, p.payment_mode, p.reference_no, p.notes
          );
        }
      }

      return true;
    });

    return restoreTx();
  },
  saveGoogleToken: (userId, tokenData) => {
    const { access_token, refresh_token, scope, token_type, expiry_date, email } = tokenData;
    const stmt = db.prepare(`
      INSERT INTO google_tokens (user_id, access_token, refresh_token, scope, token_type, expiry_date, email, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = COALESCE(excluded.refresh_token, google_tokens.refresh_token),
        scope = excluded.scope,
        token_type = excluded.token_type,
        expiry_date = excluded.expiry_date,
        email = COALESCE(excluded.email, google_tokens.email),
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(userId, access_token, refresh_token || null, scope, token_type, expiry_date, email || null);
  },
  getGoogleToken: (userId) => {
    return db.prepare('SELECT * FROM google_tokens WHERE user_id = ?').get(userId);
  }
};

module.exports = {
  db,
  GST_STATES,
  User,
  Firm,
  Party,
  Item,
  Invoice,
  Payment,
  Report,
  Backup
};
