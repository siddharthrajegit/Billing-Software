const express = require('express');
const router = express.Router();
const partyController = require('../controllers/partyController');
const { ensureUserOnly, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureUserOnly, ensureActiveFirm);

router.get('/', partyController.listParties);
router.get('/create', partyController.getCreate);
router.post('/create', partyController.postCreate);
router.post('/quick-create', partyController.postQuickCreate);
router.get('/edit/:id', partyController.getEdit);
router.post('/edit/:id', partyController.postEdit);
router.get('/ledger/:id', partyController.getLedger);
router.post('/delete/:id', partyController.postDelete);
router.get('/api/search', partyController.apiGetParties);

module.exports = router;
