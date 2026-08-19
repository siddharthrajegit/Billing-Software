const { User, Firm, Item, Party, Invoice, Payment } = require('./models');

async function testFifoScenario() {
  console.log('=======================================================');
  console.log('🧪 TESTING USER FIFO SETTLEMENT SCENARIO');
  console.log('=======================================================');

  const user = User.findByPhone('9876543210');
  const firm = Firm.getDefault(user.id);

  // 1. Create a dedicated test customer
  const customerName = 'FIFO Test Customer ' + Date.now();
  const customer = Party.create({
    firm_id: firm.id,
    type: 'customer',
    name: customerName,
    phone: '9988776655',
    city: 'Mumbai',
    state: 'Maharashtra',
    state_code: '27',
    opening_balance: 0
  });

  console.log('1. Created Customer:', customer.name, '(ID:', customer.id, ')');

  // 2. Create Bill 1: ₹5,000
  const bill1 = Invoice.create({
    firm_id: firm.id,
    type: 'sale',
    invoice_number: 'TEST-INV-001',
    invoice_date: '2026-08-01',
    party_id: customer.id,
    party_name: customer.name,
    is_gst_bill: 0,
    subtotal: 5000,
    grand_total: 5000,
    paid_amount: 0,
    balance_due: 5000,
    payment_status: 'unpaid'
  }, [{
    item_name: 'Product A',
    quantity: 1,
    rate: 5000,
    taxable_amount: 5000,
    total_amount: 5000
  }]);

  // 3. Create Bill 2: ₹6,000
  const bill2 = Invoice.create({
    firm_id: firm.id,
    type: 'sale',
    invoice_number: 'TEST-INV-002',
    invoice_date: '2026-08-05',
    party_id: customer.id,
    party_name: customer.name,
    is_gst_bill: 0,
    subtotal: 6000,
    grand_total: 6000,
    paid_amount: 0,
    balance_due: 6000,
    payment_status: 'unpaid'
  }, [{
    item_name: 'Product B',
    quantity: 1,
    rate: 6000,
    taxable_amount: 6000,
    total_amount: 6000
  }]);

  // 4. Create Bill 3: ₹15,000
  const bill3 = Invoice.create({
    firm_id: firm.id,
    type: 'sale',
    invoice_number: 'TEST-INV-003',
    invoice_date: '2026-08-10',
    party_id: customer.id,
    party_name: customer.name,
    is_gst_bill: 0,
    subtotal: 15000,
    grand_total: 15000,
    paid_amount: 0,
    balance_due: 15000,
    payment_status: 'unpaid'
  }, [{
    item_name: 'Product C',
    quantity: 1,
    rate: 15000,
    taxable_amount: 15000,
    total_amount: 15000
  }]);

  console.log('✓ Created 3 Bills: ₹5000, ₹6000, ₹15000 (Total Billed: ₹26000)');

  // Check initial ledger
  let ledger = Party.getLedger(customer.id, firm.id);
  console.log('   Initial Total Balance Left:', ledger.closing_balance);
  if (ledger.closing_balance !== 26000) throw new Error('Initial balance should be 26000');

  // 5. Payment 1: Customer makes a payment of ₹3,000
  console.log('\n--- Making Payment 1 of ₹3,000 ---');
  Payment.create({
    firm_id: firm.id,
    type: 'payment_in',
    payment_number: 'REC-TEST-001',
    payment_date: '2026-08-12',
    party_id: customer.id,
    amount: 3000,
    payment_mode: 'cash',
    notes: 'First partial payment'
  });

  ledger = Party.getLedger(customer.id, firm.id);
  const updatedBill1_afterPay1 = Invoice.getById(bill1.id, firm.id);
  console.log('✓ Bill 1 (TEST-INV-001) Paid:', updatedBill1_afterPay1.paid_amount, '| Balance Left:', updatedBill1_afterPay1.balance_due, '| Status:', updatedBill1_afterPay1.payment_status);
  console.log('✓ Overall Total Balance Left:', ledger.closing_balance);

  if (updatedBill1_afterPay1.balance_due !== 2000) throw new Error('Bill 1 balance due should be 2000 (5000 - 3000)');
  if (ledger.closing_balance !== 23000) throw new Error('Total balance left should be 23000 (26000 - 3000)');

  // 6. Payment 2: Customer makes a second payment of ₹3,000
  console.log('\n--- Making Payment 2 of ₹3,000 ---');
  Payment.create({
    firm_id: firm.id,
    type: 'payment_in',
    payment_number: 'REC-TEST-002',
    payment_date: '2026-08-15',
    party_id: customer.id,
    amount: 3000,
    payment_mode: 'upi',
    notes: 'Second partial payment'
  });

  ledger = Party.getLedger(customer.id, firm.id);
  const updatedBill1_afterPay2 = Invoice.getById(bill1.id, firm.id);
  const updatedBill2_afterPay2 = Invoice.getById(bill2.id, firm.id);
  const updatedBill3_afterPay2 = Invoice.getById(bill3.id, firm.id);

  console.log('✓ Bill 1 (TEST-INV-001) Paid:', updatedBill1_afterPay2.paid_amount, '| Balance Left:', updatedBill1_afterPay2.balance_due, '| Status:', updatedBill1_afterPay2.payment_status);
  console.log('✓ Bill 2 (TEST-INV-002) Paid:', updatedBill2_afterPay2.paid_amount, '| Balance Left:', updatedBill2_afterPay2.balance_due, '| Status:', updatedBill2_afterPay2.payment_status);
  console.log('✓ Bill 3 (TEST-INV-003) Paid:', updatedBill3_afterPay2.paid_amount, '| Balance Left:', updatedBill3_afterPay2.balance_due, '| Status:', updatedBill3_afterPay2.payment_status);
  console.log('✓ Overall Total Balance Left:', ledger.closing_balance);

  if (updatedBill1_afterPay2.balance_due !== 0 || updatedBill1_afterPay2.payment_status !== 'paid') {
    throw new Error('Bill 1 should be completely CLEARED (balance_due = 0, status = paid)');
  }
  if (updatedBill2_afterPay2.balance_due !== 5000 || updatedBill2_afterPay2.payment_status !== 'partial') {
    throw new Error('Bill 2 should have 5000 rs balance left (6000 - 1000)');
  }
  if (ledger.closing_balance !== 20000) {
    throw new Error('Total balance left should be 20000');
  }

  console.log('\n--- Ledger Transaction Statements with FIFO Notes ---');
  ledger.transactions.forEach((tx, idx) => {
    console.log(`[${idx + 1}] Date: ${tx.date} | ${tx.voucher_no} (${tx.type}) | Debit: ${tx.debit} | Credit: ${tx.credit} | Running Bal: ₹${tx.running_balance}`);
    if (tx.fifo_details) {
      console.log(`    ↳ FIFO Detail: "${tx.fifo_details}"`);
    }
  });

  console.log('\n=======================================================');
  console.log('🎉 FIFO SETTLEMENT SCENARIO TEST PASSED 100% PERFECTLY!');
  console.log('=======================================================');
}

testFifoScenario().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
