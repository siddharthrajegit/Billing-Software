const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { ensureUserOnly, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureUserOnly, ensureActiveFirm);

router.get('/', paymentController.listPayments);
router.get('/create', paymentController.getCreate);
router.post('/create', paymentController.postCreate);
router.get('/view/:id', paymentController.getView);
router.post('/delete/:id', paymentController.postDelete);

module.exports = router;
