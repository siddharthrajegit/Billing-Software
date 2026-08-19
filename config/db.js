const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'biller.db');
const db = new Database(dbPath);

// Enable foreign keys and WAL mode for better concurrency and integrity
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function initDatabase() {
  db.exec(`
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT,
      google_id TEXT UNIQUE,
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Firms / Businesses table
    CREATE TABLE IF NOT EXISTS firms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      gstin TEXT,
      pan TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      state_code TEXT,
      pincode TEXT,
      bank_name TEXT,
      bank_account_no TEXT,
      bank_ifsc TEXT,
      bank_branch TEXT,
      upi_id TEXT,
      terms TEXT,
      logo_path TEXT,
      signature_path TEXT,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Parties (Customers & Suppliers)
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firm_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'customer', -- 'customer', 'supplier', 'both'
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      gstin TEXT,
      pan TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      city TEXT,
      state TEXT,
      state_code TEXT,
      pincode TEXT,
      opening_balance REAL DEFAULT 0.00, -- Positive: to receive, Negative: to pay
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE
    );

    -- Items / Inventory
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firm_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      item_code TEXT,
      hsn_code TEXT,
      unit TEXT DEFAULT 'PCS',
      sale_price REAL DEFAULT 0.00,
      purchase_price REAL DEFAULT 0.00,
      tax_rate REAL DEFAULT 0.00, -- 0, 5, 12, 18, 28
      tax_inclusive INTEGER DEFAULT 0,
      opening_stock REAL DEFAULT 0.00,
      current_stock REAL DEFAULT 0.00,
      low_stock_threshold REAL DEFAULT 5.00,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE
    );

    -- Invoices (Sales & Purchase Bills)
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firm_id INTEGER NOT NULL,
      type TEXT NOT NULL DEFAULT 'sale', -- 'sale' or 'purchase'
      invoice_number TEXT NOT NULL,
      invoice_date DATE NOT NULL,
      due_date DATE,
      party_id INTEGER,
      party_name TEXT NOT NULL,
      party_phone TEXT,
      party_gstin TEXT,
      party_address TEXT,
      party_state TEXT,
      party_state_code TEXT,
      is_gst_bill INTEGER DEFAULT 1, -- 1: GST Tax Invoice, 0: Non-GST / Bill of Supply
      is_interstate INTEGER DEFAULT 0, -- 1: IGST, 0: CGST + SGST
      subtotal REAL DEFAULT 0.00,
      discount_type TEXT DEFAULT 'percentage',
      discount_value REAL DEFAULT 0.00,
      discount_amount REAL DEFAULT 0.00,
      taxable_amount REAL DEFAULT 0.00,
      cgst_amount REAL DEFAULT 0.00,
      sgst_amount REAL DEFAULT 0.00,
      igst_amount REAL DEFAULT 0.00,
      tax_amount REAL DEFAULT 0.00,
      round_off REAL DEFAULT 0.00,
      grand_total REAL DEFAULT 0.00,
      paid_amount REAL DEFAULT 0.00,
      balance_due REAL DEFAULT 0.00,
      payment_status TEXT DEFAULT 'unpaid', -- 'paid', 'partial', 'unpaid'
      payment_mode TEXT DEFAULT 'cash', -- 'cash', 'bank', 'upi', 'cheque', 'credit'
      notes TEXT,
      terms TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE SET NULL
    );

    -- Invoice Line Items
    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      item_id INTEGER,
      item_name TEXT NOT NULL,
      hsn_code TEXT,
      unit TEXT DEFAULT 'PCS',
      quantity REAL NOT NULL DEFAULT 1.00,
      rate REAL NOT NULL DEFAULT 0.00,
      discount_percent REAL DEFAULT 0.00,
      discount_amount REAL DEFAULT 0.00,
      taxable_amount REAL NOT NULL DEFAULT 0.00,
      tax_rate REAL DEFAULT 0.00,
      cgst_rate REAL DEFAULT 0.00,
      cgst_amount REAL DEFAULT 0.00,
      sgst_rate REAL DEFAULT 0.00,
      sgst_amount REAL DEFAULT 0.00,
      igst_rate REAL DEFAULT 0.00,
      igst_amount REAL DEFAULT 0.00,
      total_amount REAL NOT NULL DEFAULT 0.00,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE SET NULL
    );

    -- Payments (Payment-In for Receipts, Payment-Out for Vouchers)
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firm_id INTEGER NOT NULL,
      type TEXT NOT NULL, -- 'payment_in' or 'payment_out'
      payment_number TEXT NOT NULL,
      payment_date DATE NOT NULL,
      party_id INTEGER NOT NULL,
      invoice_id INTEGER,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'cash',
      reference_no TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL
    );

    -- Google OAuth Tokens for Google Drive Backup
    CREATE TABLE IF NOT EXISTS google_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      access_token TEXT,
      refresh_token TEXT,
      scope TEXT,
      token_type TEXT,
      expiry_date INTEGER,
      email TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Extensible Firm Settings (Sales, Purchases, Taxes, Print, General)
    CREATE TABLE IF NOT EXISTS firm_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firm_id INTEGER NOT NULL UNIQUE,
      settings_json TEXT DEFAULT '{}',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_firms_user ON firms(user_id);
    CREATE INDEX IF NOT EXISTS idx_firm_settings ON firm_settings(firm_id);
    CREATE INDEX IF NOT EXISTS idx_parties_firm ON parties(firm_id);
    CREATE INDEX IF NOT EXISTS idx_items_firm ON items(firm_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_firm ON invoices(firm_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_party ON invoices(party_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
    CREATE INDEX IF NOT EXISTS idx_payments_firm ON payments(firm_id);
    CREATE INDEX IF NOT EXISTS idx_payments_party ON payments(party_id);
  `);
}

initDatabase();

module.exports = db;
