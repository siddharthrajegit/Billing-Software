const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { ensureUserOnly, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureUserOnly, ensureActiveFirm);

router.get('/', itemController.listItems);
router.get('/create', itemController.getCreate);
router.post('/create', itemController.postCreate);
router.get('/edit/:id', itemController.getEdit);
router.post('/edit/:id', itemController.postEdit);
router.post('/adjust/:id', itemController.postAdjustStock);
router.post('/delete/:id', itemController.postDelete);
router.get('/api/search', itemController.apiGetItems);

module.exports = router;
