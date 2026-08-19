const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { ensureAuthenticated } = require('../middleware/auth');
const upload = require('../config/upload');

router.use(ensureAuthenticated);

router.get('/', backupController.getIndex);
router.get('/export', backupController.exportJson);
router.post('/restore', upload.single('backup_file'), backupController.restoreJson);
router.post('/google-drive', backupController.uploadGoogleDrive);

module.exports = router;
