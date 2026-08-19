async function testBillCreationHttp() {
  console.log('Testing HTTP Sale and Purchase Bill Creation...');

  // 1. Login
  const loginParams = new URLSearchParams();
  loginParams.append('identifier', '9876543210');
  loginParams.append('password', 'admin123');

  const loginRes = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    body: loginParams,
    redirect: 'manual'
  });

  const cookie = loginRes.headers.get('set-cookie');
  if (!cookie) throw new Error('No cookie');
  const sessionCookie = cookie.split(';')[0];

  // 2. Create Sales Bill via POST /invoices/create
  const saleParams = new URLSearchParams();
  saleParams.append('type', 'sale');
  saleParams.append('invoice_number', 'WEB-INV-' + Date.now());
  saleParams.append('invoice_date', '2026-08-17');
  saleParams.append('party_name', 'Web Customer Alpha');
  saleParams.append('party_phone', '9898989898');
  saleParams.append('party_gstin', '27ABCDE9999Z1Z5');
  saleParams.append('party_state', 'Maharashtra');
  saleParams.append('party_state_code', '27');
  saleParams.append('is_gst_bill', '1');
  saleParams.append('is_interstate', '0');
  saleParams.append('payment_mode', 'cash');
  saleParams.append('paid_amount', '500');

  // Line item arrays
  saleParams.append('item_name', 'Wireless Keyboard');
  saleParams.append('hsn_code', '847160');
  saleParams.append('quantity', '2');
  saleParams.append('unit', 'PCS');
  saleParams.append('rate', '1200');
  saleParams.append('item_discount_percent', '10'); // 2 * 1200 = 2400 - 240 = 2160
  saleParams.append('item_tax_rate', '18'); // 18% of 2160 = 388.80 -> 2548.80 -> 2549

  const createSaleRes = await fetch('http://localhost:3000/invoices/create', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: saleParams,
    redirect: 'manual'
  });

  console.log('2. Create Sale Bill HTTP status:', createSaleRes.status, 'Location:', createSaleRes.headers.get('location'));
  if (createSaleRes.status !== 302 || !createSaleRes.headers.get('location').includes('/invoices/view/')) {
    throw new Error('Sale bill creation failed over HTTP');
  }

  // 3. Create Purchase Bill via POST /invoices/create
  const purchaseParams = new URLSearchParams();
  purchaseParams.append('type', 'purchase');
  purchaseParams.append('invoice_number', 'WEB-PUR-' + Date.now());
  purchaseParams.append('invoice_date', '2026-08-17');
  purchaseParams.append('party_name', 'Supplier Alpha Electronics');
  purchaseParams.append('party_phone', '9797979797');
  purchaseParams.append('is_gst_bill', '0');
  purchaseParams.append('paid_amount', '0');

  purchaseParams.append('item_name', 'Type-C Fast Charging Cable');
  purchaseParams.append('quantity', '10');
  purchaseParams.append('unit', 'PCS');
  purchaseParams.append('rate', '150');

  const createPurchaseRes = await fetch('http://localhost:3000/invoices/create', {
    method: 'POST',
    headers: { Cookie: sessionCookie },
    body: purchaseParams,
    redirect: 'manual'
  });

  console.log('3. Create Purchase Bill HTTP status:', createPurchaseRes.status, 'Location:', createPurchaseRes.headers.get('location'));
  if (createPurchaseRes.status !== 302 || !createPurchaseRes.headers.get('location').includes('/invoices/view/')) {
    throw new Error('Purchase bill creation failed over HTTP');
  }

  console.log('\n✅ BOTH SALE AND PURCHASE BILL CREATION PASSED VIA HTTP!');
}

testBillCreationHttp().catch(err => {
  console.error('HTTP Bill Creation Test Failed:', err);
  process.exit(1);
});
