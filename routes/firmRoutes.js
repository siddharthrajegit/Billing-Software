const express = require('express');
const router = express.Router();
const firmController = require('../controllers/firmController');
const { ensureUserOnly } = require('../middleware/auth');
const upload = require('../config/upload');

router.use(ensureUserOnly);

router.get('/', firmController.listFirms);
router.get('/create', firmController.getCreate);
router.post(
  '/create',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  firmController.postCreate
);

router.get('/edit/:id', firmController.getEdit);
router.post(
  '/edit/:id',
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'signature', maxCount: 1 }
  ]),
  firmController.postEdit
);

router.post('/switch/:id', firmController.postSwitch);
router.post('/default/:id', firmController.postSetDefault);
router.post('/delete/:id', firmController.postDelete);

module.exports = router;
