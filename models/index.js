const fs = require('fs');
const path = require('path');
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
  create: ({ name, email, phone, password, google_id, avatar, role, status }) => {
    const stmt = db.prepare(`
      INSERT INTO users (name, email, phone, password, google_id, avatar, role, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(
      name, email || null, phone || null, password || null,
      google_id || null, avatar || null, role || 'user', status || 'active'
    );
    return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  },
  updateGoogleId: (id, google_id, avatar) => {
    db.prepare('UPDATE users SET google_id = ?, avatar = COALESCE(avatar, ?) WHERE id = ?').run(google_id, avatar, id);
    return User.findById(id);
  },
  updateRole: (id, role) => {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    return User.findById(id);
  },
  updateStatus: (id, status) => {
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
    return User.findById(id);
  },
  updatePassword: (id, hashedPassword) => {
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, id);
    return User.findById(id);
  },
  delete: (id) => {
    return db.prepare('DELETE FROM users WHERE id = ?').run(id);
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

function numeric(value, fallback = 0) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function adjustInvoiceItemStock(itemId, firmId, invoiceType, quantity, direction = 1) {
  if (!itemId) return;
  const qtyChange = numeric(quantity);
  if (!qtyChange) return;

  const typeMultiplier = invoiceType === 'sale' ? -1 : invoiceType === 'purchase' ? 1 : 0;
  if (!typeMultiplier) return;

  db.prepare('UPDATE items SET current_stock = current_stock + ? WHERE id = ? AND firm_id = ?')
    .run(typeMultiplier * direction * qtyChange, itemId, firmId);
}

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

        adjustInvoiceItemStock(item.item_id, firm_id, type, item.quantity);
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
  update: (id, firmId, invoiceData, itemsData) => {
    const updateTx = db.transaction(() => {
      const existingInvoice = Invoice.getById(id, firmId);
      if (!existingInvoice) return null;

      // 1. Revert previous inventory stock changes
      for (const oldItem of existingInvoice.items) {
        adjustInvoiceItemStock(oldItem.item_id, firmId, existingInvoice.type, oldItem.quantity, -1);
      }

      // 2. Delete existing line items
      db.prepare('DELETE FROM invoice_items WHERE invoice_id = ?').run(id);

      // 3. Update invoice header
      const {
        type, invoice_number, invoice_date, due_date, party_id,
        party_name, party_phone, party_gstin, party_address, party_state, party_state_code,
        is_gst_bill, is_interstate, subtotal, discount_type, discount_value, discount_amount,
        taxable_amount, cgst_amount, sgst_amount, igst_amount, tax_amount, round_off,
        grand_total, paid_amount, balance_due, payment_status, payment_mode, notes, terms
      } = invoiceData;

      db.prepare(`
        UPDATE invoices SET
          type = ?, invoice_number = ?, invoice_date = ?, due_date = ?, party_id = ?,
          party_name = ?, party_phone = ?, party_gstin = ?, party_address = ?, party_state = ?, party_state_code = ?,
          is_gst_bill = ?, is_interstate = ?, subtotal = ?, discount_type = ?, discount_value = ?, discount_amount = ?,
          taxable_amount = ?, cgst_amount = ?, sgst_amount = ?, igst_amount = ?, tax_amount = ?, round_off = ?,
          grand_total = ?, paid_amount = ?, balance_due = ?, payment_status = ?, payment_mode = ?, notes = ?, terms = ?
        WHERE id = ? AND firm_id = ?
      `).run(
        type || existingInvoice.type, invoice_number, invoice_date, due_date || null,
        party_id || null, party_name, party_phone || null, party_gstin || null,
        party_address || null, party_state || null, party_state_code || null,
        is_gst_bill ? 1 : 0, is_interstate ? 1 : 0, parseFloat(subtotal) || 0,
        discount_type || 'percentage', parseFloat(discount_value) || 0, parseFloat(discount_amount) || 0,
        parseFloat(taxable_amount) || 0, parseFloat(cgst_amount) || 0, parseFloat(sgst_amount) || 0,
        parseFloat(igst_amount) || 0, parseFloat(tax_amount) || 0, parseFloat(round_off) || 0,
        parseFloat(grand_total) || 0, parseFloat(paid_amount) || 0, parseFloat(balance_due) || 0,
        payment_status || 'unpaid', payment_mode || 'cash', notes || null, terms || null,
        id, firmId
      );

      // 4. Insert updated line items & apply new stock adjustments
      const itemStmt = db.prepare(`
        INSERT INTO invoice_items (
          invoice_id, item_id, item_name, hsn_code, unit, quantity, rate,
          discount_percent, discount_amount, taxable_amount, tax_rate,
          cgst_rate, cgst_amount, sgst_rate, sgst_amount, igst_rate, igst_amount, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of itemsData) {
        itemStmt.run(
          id, item.item_id || null, item.item_name, item.hsn_code || null,
          item.unit || 'PCS', parseFloat(item.quantity) || 1, parseFloat(item.rate) || 0,
          parseFloat(item.discount_percent) || 0, parseFloat(item.discount_amount) || 0,
          parseFloat(item.taxable_amount) || 0, parseFloat(item.tax_rate) || 0,
          parseFloat(item.cgst_rate) || 0, parseFloat(item.cgst_amount) || 0,
          parseFloat(item.sgst_rate) || 0, parseFloat(item.sgst_amount) || 0,
          parseFloat(item.igst_rate) || 0, parseFloat(item.igst_amount) || 0,
          parseFloat(item.total_amount) || 0
        );

        adjustInvoiceItemStock(item.item_id, firmId, type, item.quantity);
      }

      // 5. Update or recreate payment record if paid_amount changed
      const paidAmt = parseFloat(paid_amount) || 0;
      const existingPayment = db.prepare('SELECT id FROM payments WHERE invoice_id = ? AND firm_id = ?').get(id, firmId);

      if (paidAmt > 0 && party_id) {
        const payType = type === 'purchase' ? 'payment_out' : 'payment_in';
        if (existingPayment) {
          db.prepare(`
            UPDATE payments SET
              payment_date = ?, party_id = ?, amount = ?, payment_mode = ?,
              reference_no = ?, notes = ?
            WHERE id = ? AND firm_id = ?
          `).run(
            invoice_date, party_id, paidAmt, payment_mode || 'cash',
            invoice_number, `Paid on bill ${invoice_number}`,
            existingPayment.id, firmId
          );
        } else {
          const payNum = Payment.getNextPaymentNumber(firmId, payType);
          db.prepare(`
            INSERT INTO payments (
              firm_id, type, payment_number, payment_date, party_id,
              invoice_id, amount, payment_mode, reference_no, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            firmId, payType, payNum, invoice_date, party_id,
            id, paidAmt, payment_mode || 'cash',
            invoice_number, `Paid on bill ${invoice_number}`
          );
        }
      } else if (existingPayment && paidAmt === 0) {
        db.prepare('DELETE FROM payments WHERE id = ? AND firm_id = ?').run(existingPayment.id, firmId);
      }

      // Synchronize FIFO allocations across all bills for this party
      if (party_id) {
        Party.syncFIFOSettlement(party_id, firmId);
      }
      if (existingInvoice.party_id && existingInvoice.party_id !== party_id) {
        Party.syncFIFOSettlement(existingInvoice.party_id, firmId);
      }

      return Invoice.getById(id, firmId);
    });

    return updateTx();
  },
  delete: (id, firmId) => {
    const deleteTx = db.transaction(() => {
      const invoice = Invoice.getById(id, firmId);
      if (!invoice) return false;

      const partyId = invoice.party_id;

      // Revert item inventory stock
      for (const item of invoice.items) {
        adjustInvoiceItemStock(item.item_id, firmId, invoice.type, item.quantity, -1);
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
  getById: (id, firmId) => {
    return db.prepare(`
      SELECT p.*, pt.name as party_name, pt.type as party_type, pt.phone as party_phone,
             pt.billing_address as party_address, pt.gstin as party_gstin,
             pt.state as party_state, pt.state_code as party_state_code,
             inv.invoice_number as linked_invoice_number
      FROM payments p
      JOIN parties pt ON p.party_id = pt.id
      LEFT JOIN invoices inv ON p.invoice_id = inv.id
      WHERE p.id = ? AND p.firm_id = ?
    `).get(id, firmId);
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

const DEFAULT_SETTINGS = {
  sales: {
    default_gst_type: 'gst',        // 'gst' or 'non_gst'
    gst_calc_mode: 'separate',      // 'separate' (Item-wise GST) or 'final_amount' (GST on Final Amount)
    enable_discount_column: true,   // true or false
    enable_item_description: true,
    default_due_days: 0
  },
  purchases: {
    default_gst_type: 'gst',
    gst_calc_mode: 'separate',
    enable_discount_column: true
  },
  print: {
    show_bank_details: true,
    show_upi_qr: true,
    show_signature: true,
    footer_notes: ''
  },
  general: {
    currency_symbol: '₹',
    date_format: 'YYYY-MM-DD'
  }
};

const Setting = {
  get: (firmId) => {
    try {
      const row = db.prepare('SELECT * FROM firm_settings WHERE firm_id = ?').get(firmId);
      if (!row || !row.settings_json) {
        return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
      const parsed = JSON.parse(row.settings_json);
      return {
        sales: { ...DEFAULT_SETTINGS.sales, ...(parsed.sales || {}) },
        purchases: { ...DEFAULT_SETTINGS.purchases, ...(parsed.purchases || {}) },
        print: { ...DEFAULT_SETTINGS.print, ...(parsed.print || {}) },
        general: { ...DEFAULT_SETTINGS.general, ...(parsed.general || {}) }
      };
    } catch (e) {
      console.error('Error fetching settings:', e);
      return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
  },

  update: (firmId, sectionOrFull, updates) => {
    const current = Setting.get(firmId);
    let updated;
    if (typeof sectionOrFull === 'string') {
      updated = {
        ...current,
        [sectionOrFull]: {
          ...(current[sectionOrFull] || {}),
          ...updates
        }
      };
    } else {
      updated = {
        ...current,
        ...sectionOrFull
      };
    }

    const stmt = db.prepare(`
      INSERT INTO firm_settings (firm_id, settings_json, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(firm_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(firmId, JSON.stringify(updated));
    return updated;
  }
};

const Admin = {
  getDashboardMetrics: () => {
    // 1. Users
    const userStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) as suspended,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `).get();

    // 2. Firms
    const firmStats = db.prepare(`
      SELECT COUNT(*) as total FROM firms
    `).get();

    // 3. Invoices & Financials
    const invoiceStats = db.prepare(`
      SELECT 
        COUNT(*) as total_count,
        SUM(CASE WHEN type = 'sale' THEN 1 ELSE 0 END) as sales_count,
        SUM(CASE WHEN type = 'purchase' THEN 1 ELSE 0 END) as purchase_count,
        SUM(CASE WHEN type = 'sale' THEN grand_total ELSE 0 END) as total_sales_amount,
        SUM(CASE WHEN type = 'purchase' THEN grand_total ELSE 0 END) as total_purchase_amount,
        SUM(paid_amount) as total_paid_amount,
        SUM(balance_due) as total_balance_due
      FROM invoices
    `).get();

    // 4. Payments
    const paymentStats = db.prepare(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(CASE WHEN type = 'payment_in' THEN amount ELSE 0 END) as total_received,
        SUM(CASE WHEN type = 'payment_out' THEN amount ELSE 0 END) as total_paid_out
      FROM payments
    `).get();

    // 5. Items
    const itemStats = db.prepare(`
      SELECT COUNT(*) as total_items FROM items
    `).get();

    // 6. Parties
    const partyStats = db.prepare(`
      SELECT COUNT(*) as total_parties FROM parties
    `).get();

    // 7. Storage Pool Aggregation (200 MB quota per user)
    let totalPoolUsedBytes = 0;
    const regularUsers = db.prepare("SELECT id FROM users WHERE role != 'admin'").all();
    regularUsers.forEach(u => {
      const st = Admin.getUserStorageStats(u.id);
      if (st) {
        totalPoolUsedBytes += st.totalUsedBytes;
      }
    });
    const totalPoolQuotaMB = regularUsers.length * 200;
    const totalPoolUsedMB = parseFloat((totalPoolUsedBytes / (1024 * 1024)).toFixed(2));
    const poolUsagePercentage = totalPoolQuotaMB > 0 ? parseFloat(((totalPoolUsedMB / totalPoolQuotaMB) * 100).toFixed(1)) : 0;

    return {
      users: userStats || { total: 0, active: 0, suspended: 0, admins: 0 },
      firms: firmStats || { total: 0 },
      invoices: invoiceStats || { total_count: 0, sales_count: 0, purchase_count: 0, total_sales_amount: 0, total_purchase_amount: 0, total_paid_amount: 0, total_balance_due: 0 },
      payments: paymentStats || { total_payments: 0, total_received: 0, total_paid_out: 0 },
      items: itemStats || { total_items: 0 },
      parties: partyStats || { total_parties: 0 },
      storage: {
        totalPoolQuotaMB,
        totalPoolUsedMB,
        poolUsagePercentage,
        totalPoolUsedBytes,
        quotaPerUserMB: 200
      }
    };
  },

  getUserStorageStats: (userId) => {
    try {
      const user = db.prepare('SELECT id, name, email, phone FROM users WHERE id = ?').get(userId);
      if (!user) return null;

      const userFirms = db.prepare('SELECT id, name, logo_path, signature_path FROM firms WHERE user_id = ?').all(userId);
      const firmCount = userFirms.length;

      // Quota: 200 MB total per user
      // 1 firm: 200 MB quota for that firm
      // 2 firms: 100 MB quota for each firm
      const totalUserQuotaBytes = 200 * 1024 * 1024; // 200 MB
      const perFirmQuotaBytes = firmCount <= 1 ? totalUserQuotaBytes : (100 * 1024 * 1024);

      let totalUserUsedBytes = 0;
      const firmsStorage = [];

      const publicDir = path.join(__dirname, '..', 'public');
      const backupsDir = path.join(__dirname, '..', 'backups');

      userFirms.forEach(firm => {
        // 1. Calculate database size for this firm
        const itemsStats = db.prepare(`
          SELECT COALESCE(SUM(LENGTH(name) + LENGTH(COALESCE(description, '')) + LENGTH(COALESCE(hsn_code, '')) + LENGTH(COALESCE(unit, '')) + 64), 0) as bytes,
                 COUNT(*) as count
          FROM items WHERE firm_id = ?
        `).get(firm.id);

        const invoicesStats = db.prepare(`
          SELECT COALESCE(SUM(LENGTH(invoice_number) + LENGTH(COALESCE(party_name, '')) + LENGTH(COALESCE(notes, '')) + LENGTH(COALESCE(terms, '')) + 128), 0) as bytes,
                 COUNT(*) as count
          FROM invoices WHERE firm_id = ?
        `).get(firm.id);

        const lineItemsStats = db.prepare(`
          SELECT COALESCE(SUM(LENGTH(item_name) + LENGTH(COALESCE(hsn_code, '')) + 48), 0) as bytes,
                 COUNT(*) as count
          FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE firm_id = ?)
        `).get(firm.id);

        const partiesStats = db.prepare(`
          SELECT COALESCE(SUM(LENGTH(name) + LENGTH(COALESCE(phone, '')) + LENGTH(COALESCE(email, '')) + LENGTH(COALESCE(billing_address, '')) + LENGTH(COALESCE(shipping_address, '')) + LENGTH(COALESCE(gstin, '')) + 64), 0) as bytes,
                 COUNT(*) as count
          FROM parties WHERE firm_id = ?
        `).get(firm.id);

        const paymentsStats = db.prepare(`
          SELECT COALESCE(SUM(LENGTH(payment_number) + LENGTH(COALESCE(notes, '')) + LENGTH(COALESCE(reference_no, '')) + 64), 0) as bytes,
                 COUNT(*) as count
          FROM payments WHERE firm_id = ?
        `).get(firm.id);

        // Raw SQLite data bytes + B-Tree indexing factor
        const rawDbBytes = ((itemsStats ? itemsStats.bytes : 0) + 
                            (invoicesStats ? invoicesStats.bytes : 0) + 
                            (lineItemsStats ? lineItemsStats.bytes : 0) + 
                            (partiesStats ? partiesStats.bytes : 0) + 
                            (paymentsStats ? paymentsStats.bytes : 0) + 1024);
        const dbAllocatedBytes = Math.round(rawDbBytes * 1.5);

        // 2. Uploaded media files
        let mediaBytes = 0;
        if (firm.logo_path) {
          try {
            const relPath = firm.logo_path.startsWith('/') ? firm.logo_path.slice(1) : firm.logo_path;
            const fullLogoPath = path.join(publicDir, relPath);
            if (fs.existsSync(fullLogoPath)) {
              mediaBytes += fs.statSync(fullLogoPath).size;
            }
          } catch (e) {}
        }
        if (firm.signature_path) {
          try {
            const relPath = firm.signature_path.startsWith('/') ? firm.signature_path.slice(1) : firm.signature_path;
            const fullSigPath = path.join(publicDir, relPath);
            if (fs.existsSync(fullSigPath)) {
              mediaBytes += fs.statSync(fullSigPath).size;
            }
          } catch (e) {}
        }

        // 3. Local backup files
        let backupsBytes = 0;
        try {
          if (fs.existsSync(backupsDir)) {
            const bFiles = fs.readdirSync(backupsDir);
            bFiles.forEach(bf => {
              if (bf.includes(`firm_${firm.id}`) || bf.includes(`user_${userId}`)) {
                backupsBytes += fs.statSync(path.join(backupsDir, bf)).size;
              }
            });
          }
        } catch (e) {}

        const firmTotalUsedBytes = dbAllocatedBytes + mediaBytes + backupsBytes;
        totalUserUsedBytes += firmTotalUsedBytes;

        const firmQuotaMB = Math.round(perFirmQuotaBytes / (1024 * 1024));
        const firmUsedMB = (firmTotalUsedBytes / (1024 * 1024)).toFixed(2);
        const firmPercentage = Math.min(100, Math.max(0.1, ((firmTotalUsedBytes / perFirmQuotaBytes) * 100))).toFixed(1);

        firmsStorage.push({
          firmId: firm.id,
          firmName: firm.name,
          dbAllocatedBytes,
          dbAllocatedMB: (dbAllocatedBytes / (1024 * 1024)).toFixed(2),
          mediaBytes,
          mediaMB: (mediaBytes / (1024 * 1024)).toFixed(2),
          backupsBytes,
          backupsMB: (backupsBytes / (1024 * 1024)).toFixed(2),
          totalUsedBytes: firmTotalUsedBytes,
          totalUsedMB: parseFloat(firmUsedMB),
          quotaBytes: perFirmQuotaBytes,
          quotaMB: firmQuotaMB,
          usedPercentage: parseFloat(firmPercentage),
          counts: {
            items: itemsStats ? itemsStats.count : 0,
            invoices: invoicesStats ? invoicesStats.count : 0,
            parties: partiesStats ? partiesStats.count : 0,
            payments: paymentsStats ? paymentsStats.count : 0
          }
        });
      });

      const totalUserQuotaMB = 200;
      const totalUserUsedMB = (totalUserUsedBytes / (1024 * 1024)).toFixed(2);
      const totalUserPercentage = Math.min(100, Math.max(0.1, ((totalUserUsedBytes / totalUserQuotaBytes) * 100))).toFixed(1);

      return {
        userId,
        userName: user.name,
        totalQuotaBytes: totalUserQuotaBytes,
        totalQuotaMB: totalUserQuotaMB,
        totalUsedBytes: totalUserUsedBytes,
        totalUsedMB: parseFloat(totalUserUsedMB),
        totalUsedPercentage: parseFloat(totalUserPercentage),
        isOverQuota: totalUserUsedBytes > totalUserQuotaBytes,
        firmCount,
        quotaPerFirmMB: Math.round(perFirmQuotaBytes / (1024 * 1024)),
        firmsStorage
      };
    } catch (err) {
      console.error('Error calculating user storage stats:', err);
      return {
        userId,
        totalQuotaMB: 200,
        totalUsedMB: 0,
        totalUsedPercentage: 0,
        isOverQuota: false,
        firmCount: 0,
        quotaPerFirmMB: 200,
        firmsStorage: []
      };
    }
  },

  getAllUsers: (search = '', role = '', status = '') => {
    let query = `
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.status, u.avatar, u.created_at,
        COUNT(DISTINCT f.id) as firms_count,
        COUNT(DISTINCT i.id) as invoices_count,
        COALESCE(SUM(CASE WHEN i.type = 'sale' THEN i.grand_total ELSE 0 END), 0) as total_turnover
      FROM users u
      LEFT JOIN firms f ON f.user_id = u.id
      LEFT JOIN invoices i ON i.firm_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` AND (LOWER(u.name) LIKE ? OR LOWER(COALESCE(u.email, '')) LIKE ? OR u.phone LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term);
    }
    if (role && role.trim()) {
      query += ` AND u.role = ?`;
      params.push(role.trim());
    }
    if (status && status.trim()) {
      query += ` AND u.status = ?`;
      params.push(status.trim());
    }

    query += ` GROUP BY u.id ORDER BY u.created_at DESC`;
    const users = db.prepare(query).all(...params);

    // Attach storage usage for each subscriber
    users.forEach(u => {
      u.storage = Admin.getUserStorageStats(u.id);
    });

    return users;
  },

  getUserDeepInfo: (userId) => {
    const user = db.prepare('SELECT id, name, email, phone, role, status, avatar, created_at FROM users WHERE id = ?').get(userId);
    if (!user) return null;

    // 1. All firms owned by this user
    const firms = db.prepare(`
      SELECT f.*,
        COUNT(DISTINCT p.id) as parties_count,
        COUNT(DISTINCT it.id) as items_count,
        COUNT(DISTINCT inv.id) as invoices_count,
        COALESCE(SUM(CASE WHEN inv.type = 'sale' THEN inv.grand_total ELSE 0 END), 0) as total_turnover
      FROM firms f
      LEFT JOIN parties p ON p.firm_id = f.id
      LEFT JOIN items it ON it.firm_id = f.id
      LEFT JOIN invoices inv ON inv.firm_id = f.id
      WHERE f.user_id = ?
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `).all(userId);

    // 2. All parties/customers created by this user across their firms
    const parties = db.prepare(`
      SELECT p.*, f.name as firm_name
      FROM parties p
      JOIN firms f ON f.id = p.firm_id
      WHERE f.user_id = ?
      ORDER BY p.name ASC
    `).all(userId);

    // 3. All inventory items created by this user
    const items = db.prepare(`
      SELECT it.*, f.name as firm_name
      FROM items it
      JOIN firms f ON f.id = it.firm_id
      WHERE f.user_id = ?
      ORDER BY it.name ASC
    `).all(userId);

    // 4. All invoices created by this user
    const invoices = db.prepare(`
      SELECT inv.*, f.name as firm_name
      FROM invoices inv
      JOIN firms f ON f.id = inv.firm_id
      WHERE f.user_id = ?
      ORDER BY inv.created_at DESC
      LIMIT 200
    `).all(userId);

    // 5. Overall user business financials summary
    const financials = db.prepare(`
      SELECT 
        COUNT(DISTINCT inv.id) as total_invoices,
        COALESCE(SUM(CASE WHEN inv.type = 'sale' THEN inv.grand_total ELSE 0 END), 0) as total_sales,
        COALESCE(SUM(CASE WHEN inv.type = 'purchase' THEN inv.grand_total ELSE 0 END), 0) as total_purchases,
        COALESCE(SUM(inv.paid_amount), 0) as total_paid,
        COALESCE(SUM(inv.balance_due), 0) as total_due
      FROM invoices inv
      JOIN firms f ON f.id = inv.firm_id
      WHERE f.user_id = ?
    `).get(userId);

    // 6. User 200 MB storage quota breakdown
    const storage = Admin.getUserStorageStats(userId);

    return { user, firms, parties, items, invoices, financials, storage };
  },

  getAllFirms: (search = '') => {
    let query = `
      SELECT 
        f.*,
        u.name as owner_name,
        u.email as owner_email,
        u.phone as owner_phone,
        COUNT(DISTINCT p.id) as parties_count,
        COUNT(DISTINCT it.id) as items_count,
        COUNT(DISTINCT inv.id) as invoices_count,
        COALESCE(SUM(CASE WHEN inv.type = 'sale' THEN inv.grand_total ELSE 0 END), 0) as total_turnover
      FROM firms f
      JOIN users u ON u.id = f.user_id
      LEFT JOIN parties p ON p.firm_id = f.id
      LEFT JOIN items it ON it.firm_id = f.id
      LEFT JOIN invoices inv ON inv.firm_id = f.id
      WHERE 1=1
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` AND (LOWER(f.name) LIKE ? OR LOWER(COALESCE(f.gstin, '')) LIKE ? OR LOWER(u.name) LIKE ? OR LOWER(COALESCE(u.email, '')) LIKE ? OR u.phone LIKE ?)`;
      const term = `%${search.trim().toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }

    query += ` GROUP BY f.id ORDER BY f.created_at DESC`;
    return db.prepare(query).all(...params);
  },

  getAllInvoices: (filters = {}) => {
    let query = `
      SELECT 
        inv.*,
        f.name as firm_name,
        u.name as owner_name,
        u.phone as owner_phone,
        u.email as owner_email
      FROM invoices inv
      JOIN firms f ON f.id = inv.firm_id
      JOIN users u ON u.id = f.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.search) {
      query += ` AND (inv.invoice_number LIKE ? OR LOWER(inv.party_name) LIKE ? OR LOWER(f.name) LIKE ? OR u.phone LIKE ? OR LOWER(u.name) LIKE ?)`;
      const term = `%${filters.search.trim().toLowerCase()}%`;
      params.push(term, term, term, term, term);
    }
    if (filters.type) {
      query += ` AND inv.type = ?`;
      params.push(filters.type);
    }
    if (filters.payment_status) {
      query += ` AND inv.payment_status = ?`;
      params.push(filters.payment_status);
    }

    query += ` ORDER BY inv.created_at DESC LIMIT 200`;
    return db.prepare(query).all(...params);
  },

  getRecentActivities: (limit = 15) => {
    const recentUsers = db.prepare(`
      SELECT 'user_registered' as type, name as title, COALESCE(phone, email, 'New Account') as subtitle, created_at, id as entity_id
      FROM users
      ORDER BY created_at DESC LIMIT ?
    `).all(limit);

    const recentFirms = db.prepare(`
      SELECT 'firm_created' as type, f.name as title, u.name as subtitle, f.created_at, f.id as entity_id
      FROM firms f
      JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC LIMIT ?
    `).all(limit);

    const recentInvoices = db.prepare(`
      SELECT 'invoice_created' as type, (inv.invoice_number || ' - ₹ ' || inv.grand_total) as title, (inv.party_name || ' (' || f.name || ')') as subtitle, inv.created_at, inv.id as entity_id
      FROM invoices inv
      JOIN firms f ON f.id = inv.firm_id
      ORDER BY inv.created_at DESC LIMIT ?
    `).all(limit);

    const all = [...recentUsers, ...recentFirms, ...recentInvoices];
    all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return all.slice(0, limit);
  },

  logAction: (adminId, adminName, action, targetType, targetId, details, ip) => {
    db.prepare(`
      INSERT INTO admin_audit_logs (admin_id, admin_name, action, target_type, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(adminId || null, adminName || 'Admin', action, targetType || null, String(targetId || ''), details || null, ip || null);
  },

  getRecentLogs: (limit = 25) => {
    return db.prepare(`SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT ?`).all(limit);
  },

  getPlatformSetting: (key, defaultValue = null) => {
    const row = db.prepare('SELECT value FROM platform_settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  },

  setPlatformSetting: (key, value) => {
    db.prepare(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value));
  },

  getAllPlatformSettings: () => {
    const rows = db.prepare('SELECT key, value FROM platform_settings').all();
    const settings = {
      max_firms_limit: '2',
      max_upload_size_mb: '2',
      platform_announcement: '',
      platform_announcement_type: 'info',
      enable_announcement: '0',
      maintenance_mode: '0'
    };
    rows.forEach(r => {
      settings[r.key] = r.value;
    });
    return settings;
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
  Backup,
  Setting,
  DEFAULT_SETTINGS,
  Admin
};
