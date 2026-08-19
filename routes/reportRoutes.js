const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { ensureAuthenticated, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureAuthenticated, ensureActiveFirm);

router.get('/', reportController.getReportsIndex);
router.get('/parties', reportController.getPartyReport);
router.get('/tax', reportController.getTaxReport);
router.get('/items', reportController.getItemReport);

module.exports = router;
