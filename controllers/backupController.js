const fs = require('fs');
const { Backup } = require('../models');
const { uploadBackupToDrive } = require('../config/googleDrive');

const backupController = {
  getIndex: (req, res) => {
    const googleToken = Backup.getGoogleToken(req.user.id);
    const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here');

    res.render('backup/index', {
      title: 'Data Backup & Google Drive Cloud Sync',
      googleToken,
      hasGoogleAuth,
      activeMenu: 'backup'
    });
  },

  exportJson: (req, res) => {
    try {
      const backupData = Backup.exportFullBackup(req.user.id);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `RaceFinance_Backup_${dateStr}_${Date.now()}.json`;

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(backupData, null, 2));
    } catch (err) {
      console.error('Export backup error:', err);
      req.flash('error_msg', 'Failed to export backup: ' + err.message);
      res.redirect('/backup');
    }
  },

  restoreJson: (req, res) => {
    try {
      if (!req.file) {
        req.flash('error_msg', 'Please select a valid JSON backup file.');
        return res.redirect('/backup');
      }

      const filePath = req.file.path;
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const backupData = JSON.parse(fileContent);

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (e) {}

      Backup.restoreFullBackup(req.user.id, backupData);

      req.flash('success_msg', 'Data restored successfully from backup! All firms, items, and bills imported.');
      res.redirect('/dashboard');
    } catch (err) {
      console.error('Restore backup error:', err);
      req.flash('error_msg', 'Failed to restore backup: ' + err.message);
      res.redirect('/backup');
    }
  },

  uploadGoogleDrive: async (req, res) => {
    try {
      const googleToken = Backup.getGoogleToken(req.user.id);
      if (!googleToken || !googleToken.access_token) {
        req.flash('error_msg', 'Google Drive is not connected. Please connect your Google account below first.');
        return res.redirect('/backup');
      }

      const backupData = Backup.exportFullBackup(req.user.id);
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `RaceFinance_Backup_${dateStr}_${Date.now()}.json`;

      const uploadResult = await uploadBackupToDrive(req.user.id, backupData, filename);

      req.flash(
        'success_msg',
        `Backup successfully uploaded to Google Drive! File: "${uploadResult.name}".`
      );
      res.redirect('/backup');
    } catch (err) {
      console.error('Google Drive backup error:', err);
      req.flash('error_msg', 'Google Drive upload failed: ' + err.message);
      res.redirect('/backup');
    }
  }
};

module.exports = backupController;
