const express = require('express');
const router = express.Router();
const legalController = require('../controllers/legalController');

router.get('/', legalController.getLegalPage);
router.get('/terms', legalController.getTerms);
router.get('/privacy', legalController.getPrivacy);
router.get('/refund-policy', legalController.getRefund);
router.get('/disclaimer', legalController.getDisclaimer);
router.get('/security', legalController.getSecurity);
router.get('/:section', legalController.getLegalPage);

module.exports = router;
