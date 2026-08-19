# Vyapar Lite — Small Business Billing, Inventory & Accounting System

A fast, lightweight, and modern web application for small businesses and traders to create GST and Non-GST sales/purchase bills, manage items and stock, track customer/vendor ledgers, operate multiple business firms, and perform 1-click cloud backups to Google Drive.

---

## 🌟 Key Features

1. **Multi-Firm Management**:
   - Register and manage multiple business firms or branches under a single account.
   - Switch active firm with 1-click directly from the top navigation bar.
   - Customize each firm with business name, GSTIN, PAN, address, state/state codes, bank account details, UPI ID, logo, and terms.

2. **Sales & Purchase Billing (GST & Non-GST)**:
   - **GST Tax Invoice**: Real-time tax computation (intra-state CGST + SGST vs inter-state IGST based on GST state codes).
   - **Non-GST / Bill of Supply / Retail Bill**: Simple tax-free invoices with a single toggle.
   - Dynamic line items with autocomplete product search, HSN/SAC codes, units, item discounts, and overall bill discount.
   - Partial payment tracking (Amount Paid, Balance Due, Payment Status: *Paid / Partial / Unpaid*).
   - Automatic inventory stock deduction on Sales and stock addition on Purchases.

3. **Standard A4 Invoice Print & PDF**:
   - Clean, professional standard A4 Tax Invoice layout with seller/buyer details, HSN breakdown, tax split, bank/UPI details, terms, and authorized signature.
   - Native browser print with dedicated `@media print` CSS.

4. **Item & Inventory Management**:
   - Track product catalog with HSN codes, custom units (PCS, KG, BOX, MTR, etc.), sale/purchase rates, and tax rates.
   - Low stock threshold alerts with instant visual warning badges on the dashboard.
   - Quick stock adjustment tool (+ / - stock).

5. **Customer & Party Ledgers**:
   - Track outstanding receivables (money customers owe you) and payables (money you owe suppliers).
   - Detailed ledger statement with debit, credit, and running balance history.
   - Record Payment-In receipts and Payment-Out vouchers.

6. **Reports & Tax Filing (GSTR-1)**:
   - Real-time Dashboard KPIs (Today's Sales, Total Sales, Receivables, Payables, Low Stock items).
   - GSTR-1 Tax Summary report with date-range filters, taxable turnover, and CGST/SGST/IGST breakdown.
   - Party-wise account summary and item-wise sales volume reports.

7. **Backup & Google Drive Cloud Sync**:
   - **1-Click Local JSON Export**: Download complete offline database backup as `.json`.
   - **JSON Restore**: Upload and import backups into any account.
   - **1-Click Google Drive Sync**: Direct upload to a `"Vyapar Lite Backups"` folder in the user's Google Drive via Google Drive API v3.

8. **Authentication**:
   - Manual Sign-In & Sign-Up using Phone Number or Email + Password (encrypted via `bcryptjs`).
   - Google OAuth 2.0 1-Click Sign-In.

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. (Optional) Run Database Seeder
To test with pre-filled sample items, parties, firms, and bills:
```bash
npm run seed
```

**Default Test Credentials:**
- **Phone:** `9876543210`
- **Email:** `admin@vyaparlite.com`
- **Password:** `admin123`

### 3. Start the Server
```bash
npm start
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## ⚙️ Configuration (`.env`)

Create or edit `.env` in the root folder:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=vyapar_biller_secret_key_2026_production_ready

# Google OAuth 2.0 & Google Drive Backup (Optional)
# Obtain from Google Cloud Console (https://console.cloud.google.com):
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

---

## 📁 Tech Stack Architecture

- **Backend:** Node.js, Express.js, Passport.js, Multer, Google APIs
- **Database:** SQLite (`better-sqlite3`) — fast, zero setup, single-file storage in `data/biller.db`
- **Frontend / Templating:** HTML5, Vanilla CSS, Bootstrap 5.3, Bootstrap Icons, EJS (Embedded JavaScript Templates)
- **Cloud API:** Google Drive API v3 (for 1-click cloud backups)
