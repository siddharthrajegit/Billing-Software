const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { ensureUserOnly } = require('../middleware/auth');
const upload = require('../config/upload');

router.use(ensureUserOnly);

router.get('/', backupController.getIndex);
router.get('/export', backupController.exportJson);
router.post('/restore', upload.single('backup_file'), backupController.restoreJson);
router.post('/google-drive', backupController.uploadGoogleDrive);

module.exports = router;
