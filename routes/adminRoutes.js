const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { ensureAdmin } = require('../middleware/auth');

// Guard all admin routes with ensureAdmin
router.use(ensureAdmin);

// Dashboard / Command Center
router.get('/', adminController.getDashboard);
router.get('/dashboard', adminController.getDashboard);

// User & Subscriber Management
router.get('/users', adminController.getUsers);
router.post('/users/create', adminController.postCreateUser);
router.get('/users/:id', adminController.getUserDetails);
router.post('/users/:id/role', adminController.postToggleUserRole);
router.post('/users/:id/status', adminController.postToggleUserStatus);
router.post('/users/:id/reset-password', adminController.postResetUserPassword);
router.post('/users/:id/delete', adminController.postDeleteUser);

// Platform Firms Directory
router.get('/firms', adminController.getFirms);

// Platform Invoices Explorer
router.get('/invoices', adminController.getInvoices);

// System Health & Storage
router.get('/system', adminController.getSystemHealth);
router.post('/system/vacuum', adminController.postVacuumDb);
router.post('/system/clean-orphans', adminController.postCleanOrphans);
router.get('/system/download-db', adminController.getDownloadDb);

// Governance & Platform Settings
router.get('/settings', adminController.getSettings);
router.post('/settings', adminController.postSettings);

module.exports = router;
