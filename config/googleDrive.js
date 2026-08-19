const { google } = require('googleapis');
const { Readable } = require('stream');
const { Backup } = require('../models');

function getOAuth2Client(userId) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

  if (!googleClientId || !googleClientSecret) {
    throw new Error('Google OAuth credentials not configured in .env');
  }

  const tokenRecord = Backup.getGoogleToken(userId);
  if (!tokenRecord || !tokenRecord.access_token) {
    throw new Error('Google Drive account is not connected. Please Sign in with Google to enable 1-Click Drive Backup.');
  }

  const oauth2Client = new google.auth.OAuth2(
    googleClientId,
    googleClientSecret,
    googleCallbackUrl
  );

  oauth2Client.setCredentials({
    access_token: tokenRecord.access_token,
    refresh_token: tokenRecord.refresh_token,
    expiry_date: tokenRecord.expiry_date
  });

  // Handle token refresh event to persist renewed access token
  oauth2Client.on('tokens', (tokens) => {
    Backup.saveGoogleToken(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || tokenRecord.refresh_token,
      scope: tokens.scope || tokenRecord.scope,
      token_type: tokens.token_type || tokenRecord.token_type,
      expiry_date: tokens.expiry_date || tokenRecord.expiry_date,
      email: tokenRecord.email
    });
  });

  return oauth2Client;
}

async function uploadBackupToDrive(userId, backupData, customFileName = null) {
  const auth = getOAuth2Client(userId);
  const drive = google.drive({ version: 'v3', auth });

  const fileName = customFileName || `RaceFinance_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fileContent = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);

  // 1. Check or create "RACE FINANCE Backups" folder
  let folderId = null;
  try {
    const searchRes = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and name='RACE FINANCE Backups' and trashed=false",
      fields: 'files(id, name)',
      spaces: 'drive'
    });

    if (searchRes.data.files && searchRes.data.files.length > 0) {
      folderId = searchRes.data.files[0].id;
    } else {
      const folderRes = await drive.files.create({
        requestBody: {
          name: 'RACE FINANCE Backups',
          mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id'
      });
      folderId = folderRes.data.id;
    }
  } catch (err) {
    // If folder creation fails due to scope restriction, upload to root
    console.warn('Drive folder check failed, uploading to root:', err.message);
  }

  // 2. Upload file stream
  const mediaStream = new Readable();
  mediaStream.push(fileContent);
  mediaStream.push(null);

  const fileMetadata = {
    name: fileName,
    parents: folderId ? [folderId] : []
  };

  const uploadRes = await drive.files.create({
    requestBody: fileMetadata,
    media: {
      mimeType: 'application/json',
      body: mediaStream
    },
    fields: 'id, name, webViewLink, webContentLink, createdTime'
  });

  return uploadRes.data;
}

module.exports = {
  getOAuth2Client,
  uploadBackupToDrive
};
