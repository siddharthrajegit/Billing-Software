const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { ensureAuthenticated, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureAuthenticated, ensureActiveFirm);

// Sales routes
router.get('/sales', invoiceController.listSales);
router.get('/sales/create', invoiceController.getCreateSale);

// Purchase routes
router.get('/purchases', invoiceController.listPurchases);
router.get('/purchases/create', invoiceController.getCreatePurchase);

// Shared create, view, print, delete
router.post('/invoices/create', invoiceController.postCreate);
router.get('/invoices/view/:id', invoiceController.getView);
router.get('/invoices/print/:id', invoiceController.getPrintA4);
router.post('/invoices/delete/:id', invoiceController.postDelete);

module.exports = router;
