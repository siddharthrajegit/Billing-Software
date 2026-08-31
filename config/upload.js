const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// Whitelist only valid image types (JPG, PNG, WebP) and JSON backup files
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|webp|json/;
  const allowedMimeTypes = /image\/(jpeg|png|webp)|application\/json/;

  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const isValidExt = allowedExtensions.test(ext);
  const isValidMime = allowedMimeTypes.test(file.mimetype);

  if (isValidExt && isValidMime) {
    return cb(null, true);
  }
  cb(new Error('Invalid file format. Only images (JPG, PNG, WebP) up to 2MB and JSON backups are permitted.'));
};

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // Strict 2MB max limit to prevent cloud storage abuse
  },
  fileFilter
});

module.exports = upload;
