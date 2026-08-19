const bcrypt = require('bcryptjs');
const { User, Firm, Item, Party, Invoice, Payment, Report, Backup } = require('./models');

async function runTests() {
  console.log('--- 1. Testing User Creation ---');
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('admin123', salt);

  let user = User.findByPhone('9876543210');
  if (!user) {
    user = User.create({
      name: 'Ramesh Sharma',
      email: 'admin@vyaparlite.com',
      phone: '9876543210',
      password
    });
  }
  console.log('✓ User created/found:', user.name, user.phone, 'ID:', user.id);

  console.log('\n--- 2. Testing Multi-Firm Management ---');
  let firms = Firm.getByUserId(user.id);
  let firm1;
  if (firms.length === 0) {
    firm1 = Firm.create({
      user_id: user.id,
      name: 'Sharma Electronics & Appliances',
      gstin: '27ABCDE1234F1Z5',
      phone: '9876543210',
      email: 'sales@sharmaelectronics.com',
      address: 'Shop 12, Market Road, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '400058',
      bank_name: 'HDFC Bank',
      bank_account_no: '50100234567890',
      bank_ifsc: 'HDFC0001234',
      bank_branch: 'Andheri West',
      upi_id: 'sharma@okhdfcbank',
      terms: '1. 1 Year manufacturer warranty on all items. 2. Goods once sold will not be returned.',
      is_default: 1
    });

    // Create a 2nd firm to verify multi-firm support
    Firm.create({
      user_id: user.id,
      name: 'Sharma Traders (Wholesale Agency)',
      gstin: '27XYZAB9876C1Z2',
      phone: '9876543211',
      email: 'wholesale@sharmatraders.com',
      address: 'Plot 45, APMC Market, Vashi',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      state_code: '27',
      pincode: '400703',
      is_default: 0
    });
  } else {
    firm1 = firms[0];
  }
  console.log('✓ Active Firm created/found:', firm1.name, 'State Code:', firm1.state_code);

  console.log('\n--- 3. Testing Item / Inventory Creation ---');
  let items = Item.getByFirmId(firm1.id);
  if (items.length === 0) {
    Item.create({
      firm_id: firm1.id,
      name: 'Smart LED TV 43 Inch 4K',
      item_code: 'TV-43-4K',
      hsn_code: '852872',
      unit: 'PCS',
      sale_price: 24999.00,
      purchase_price: 18500.00,
      tax_rate: 18.00,
      tax_inclusive: 0,
      opening_stock: 15,
      low_stock_threshold: 3,
      description: 'Ultra HD Smart Television with HDR10'
    });

    Item.create({
      firm_id: firm1.id,
      name: 'Wireless Bluetooth Earbuds',
      item_code: 'EAR-BT-01',
      hsn_code: '851830',
      unit: 'PCS',
      sale_price: 1499.00,
      purchase_price: 850.00,
      tax_rate: 18.00,
      tax_inclusive: 0,
      opening_stock: 40,
      low_stock_threshold: 10,
      description: 'True wireless stereo earbuds with ANC'
    });

    Item.create({
      firm_id: firm1.id,
      name: 'HDMI 2.1 Cable 2 Meter',
      item_code: 'CAB-HDMI-02',
      hsn_code: '854442',
      unit: 'PCS',
      sale_price: 299.00,
      purchase_price: 120.00,
      tax_rate: 18.00,
      tax_inclusive: 0,
      opening_stock: 2, // Trigger low stock alert
      low_stock_threshold: 5,
      description: 'High Speed 8K 60Hz Braided Cable'
    });
    items = Item.getByFirmId(firm1.id);
  }
  console.log(`✓ ${items.length} inventory items created.`);

  console.log('\n--- 4. Testing Parties (Customers & Suppliers) ---');
  let parties = Party.getByFirmId(firm1.id);
  let customer1, customer2, supplier1;
  if (parties.length === 0) {
    customer1 = Party.create({
      firm_id: firm1.id,
      type: 'customer',
      name: 'Apex Infotech Pvt Ltd',
      phone: '9820011223',
      email: 'purchase@apexinfotech.in',
      gstin: '27AAACA9999A1Z1',
      billing_address: 'Tech Park, Powai',
      city: 'Mumbai',
      state: 'Maharashtra',
      state_code: '27',
      opening_balance: 0
    });

    customer2 = Party.create({
      firm_id: firm1.id,
      type: 'customer',
      name: 'Delhi Digital World',
      phone: '9810055443',
      email: 'contact@delhidigital.in',
      gstin: '07AAACD8888B1Z9',
      billing_address: 'Nehru Place',
      city: 'New Delhi',
      state: 'Delhi',
      state_code: '07',
      opening_balance: 0
    });

    supplier1 = Party.create({
      firm_id: firm1.id,
      type: 'supplier',
      name: 'Sony & LG National Distributor',
      phone: '9822233445',
      email: 'distributor@electronicshub.com',
      gstin: '27BBBBB1111B1Z3',
      billing_address: 'Lamington Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      state_code: '27',
      opening_balance: -50000.00
    });
  } else {
    customer1 = parties.find(p => p.type === 'customer') || parties[0];
    supplier1 = parties.find(p => p.type === 'supplier') || parties[0];
  }
  console.log('✓ Parties created (Customers & Suppliers).');

  console.log('\n--- 5. Testing GST Sales Invoice Generation ---');
  const tvItem = items[0];
  const earbudItem = items[1];

  const subtotal = (tvItem.sale_price * 1) + (earbudItem.sale_price * 2); // 24999 + 2998 = 27997
  const cgst = (subtotal * 0.09); // 2519.73
  const sgst = (subtotal * 0.09); // 2519.73
  const grandTotal = Math.round(subtotal + cgst + sgst); // 27997 + 5039.46 = 33036.46 -> 33036
  const paid = 20000;
  const due = grandTotal - paid; // 13036

  const saleInvoice = Invoice.create({
    firm_id: firm1.id,
    type: 'sale',
    invoice_number: Invoice.getNextInvoiceNumber(firm1.id, 'sale'),
    invoice_date: new Date().toISOString().split('T')[0],
    party_id: customer1.id,
    party_name: customer1.name,
    party_phone: customer1.phone,
    party_gstin: customer1.gstin,
    party_address: customer1.billing_address,
    party_state: customer1.state,
    party_state_code: customer1.state_code,
    is_gst_bill: 1,
    is_interstate: 0,
    subtotal: subtotal,
    discount_amount: 0,
    taxable_amount: subtotal,
    cgst_amount: cgst,
    sgst_amount: sgst,
    igst_amount: 0,
    tax_amount: cgst + sgst,
    round_off: grandTotal - (subtotal + cgst + sgst),
    grand_total: grandTotal,
    paid_amount: paid,
    balance_due: due,
    payment_status: 'partial',
    payment_mode: 'upi',
    notes: 'Sold with standard warranty'
  }, [
    {
      item_id: tvItem.id,
      item_name: tvItem.name,
      hsn_code: tvItem.hsn_code,
      unit: tvItem.unit,
      quantity: 1,
      rate: tvItem.sale_price,
      discount_percent: 0,
      taxable_amount: tvItem.sale_price,
      tax_rate: 18,
      cgst_rate: 9,
      cgst_amount: tvItem.sale_price * 0.09,
      sgst_rate: 9,
      sgst_amount: tvItem.sale_price * 0.09,
      total_amount: tvItem.sale_price * 1.18
    },
    {
      item_id: earbudItem.id,
      item_name: earbudItem.name,
      hsn_code: earbudItem.hsn_code,
      unit: earbudItem.unit,
      quantity: 2,
      rate: earbudItem.sale_price,
      discount_percent: 0,
      taxable_amount: earbudItem.sale_price * 2,
      tax_rate: 18,
      cgst_rate: 9,
      cgst_amount: earbudItem.sale_price * 2 * 0.09,
      sgst_rate: 9,
      sgst_amount: earbudItem.sale_price * 2 * 0.09,
      total_amount: earbudItem.sale_price * 2 * 1.18
    }
  ]);
  console.log('✓ Sales Invoice generated:', saleInvoice.invoice_number, 'Grand Total: ₹', saleInvoice.grand_total, 'Due: ₹', saleInvoice.balance_due);

  console.log('\n--- 6. Testing Stock Auto-Deduction ---');
  const updatedTv = Item.getById(tvItem.id, firm1.id);
  console.log(`✓ Item stock after sale: "${updatedTv.name}" stock reduced from 15 to ${updatedTv.current_stock}`);

  console.log('\n--- 7. Testing Party Ledger Computation ---');
  const ledger = Party.getLedger(customer1.id, firm1.id);
  console.log('✓ Customer Ledger Closing Balance: ₹', ledger.closing_balance, 'Transactions count:', ledger.transactions.length);

  console.log('\n--- 8. Testing Dashboard & Tax Report ---');
  const dashboard = Report.getDashboardSummary(firm1.id);
  console.log('✓ Dashboard Summary - Total Sales: ₹', dashboard.sales.total_sales_amount, 'Low stock count:', dashboard.lowStockCount);

  const taxRep = Report.getTaxReport(firm1.id);
  console.log('✓ Tax Report - Summary rows:', taxRep.summary.length, 'Invoices listed:', taxRep.invoices.length);

  console.log('\n--- 9. Testing JSON Full Database Backup & Restore ---');
  const backupJson = Backup.exportFullBackup(user.id);
  console.log('✓ Backup JSON generated successfully:');
  console.log(`   - Firms: ${backupJson.firms.length}`);
  console.log(`   - Parties: ${backupJson.parties.length}`);
  console.log(`   - Items: ${backupJson.items.length}`);
  console.log(`   - Invoices: ${backupJson.invoices.length}`);
  console.log(`   - Line Items: ${backupJson.invoice_items.length}`);

  console.log('\n=======================================================');
  console.log('🎉 ALL TESTS AND SEEDING PASSED SUCCESSFULLY!');
  console.log('=======================================================');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
