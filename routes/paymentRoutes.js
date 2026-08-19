const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { ensureAuthenticated, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureAuthenticated, ensureActiveFirm);

router.get('/', paymentController.listPayments);
router.get('/create', paymentController.getCreate);
router.post('/create', paymentController.postCreate);
router.post('/delete/:id', paymentController.postDelete);

module.exports = router;
