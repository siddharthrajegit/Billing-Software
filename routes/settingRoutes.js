const express = require('express');
const router = express.Router();
const settingController = require('../controllers/settingController');
const { ensureUserOnly, ensureActiveFirm } = require('../middleware/auth');

router.use(ensureUserOnly);
router.use(ensureActiveFirm);

router.get('/', settingController.getSettings);
router.post('/', settingController.postSettings);

module.exports = router;
