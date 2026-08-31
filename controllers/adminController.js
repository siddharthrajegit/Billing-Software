const fs = require('fs');
const path = require('path');
const os = require('os');
const bcrypt = require('bcryptjs');
const { db, User, Firm, Invoice, Admin } = require('../models');

// Helper to calculate directory size and file count
function getDirectoryStats(dirPath) {
  let totalBytes = 0;
  let fileCount = 0;
  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          totalBytes += stat.size;
          fileCount++;
        }
      });
    }
  } catch (err) {
    console.error('Error calculating directory stats:', err.message);
  }
  return { totalBytes, fileCount, sizeFormatted: formatBytes(totalBytes) };
}

// Helper to format bytes into readable KB/MB/GB
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const adminController = {
  // 1. Admin Dashboard
  getDashboard: (req, res) => {
    try {
      const metrics = Admin.getDashboardMetrics();
      const recentActivities = Admin.getRecentActivities(12);
      const recentLogs = Admin.getRecentLogs(6);

      // Calculate storage metrics
      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
      const uploadsStats = getDirectoryStats(uploadsDir);
      const dbPath = path.join(__dirname, '..', 'data', 'biller.db');
      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
      }

      res.render('admin/dashboard', {
        title: 'Platform Command Center',
        activeMenu: 'admin-dashboard',
        metrics,
        recentActivities,
        recentLogs,
        storage: {
          uploads: uploadsStats,
          dbSize: formatBytes(dbSize),
          totalStorage: formatBytes(uploadsStats.totalBytes + dbSize)
        }
      });
    } catch (err) {
      console.error('Admin dashboard error:', err);
      req.flash('error_msg', 'Failed to load admin dashboard: ' + err.message);
      res.redirect('/dashboard');
    }
  },

  // 2. User & Business Subscriber Management
  getUsers: (req, res) => {
    try {
      const search = req.query.search || '';
      const role = req.query.role || '';
      const status = req.query.status || '';

      const users = Admin.getAllUsers(search, role, status);

      res.render('admin/users', {
        title: 'Subscriber & User Management',
        activeMenu: 'admin-users',
        users,
        search,
        role,
        status
      });
    } catch (err) {
      console.error('Admin getUsers error:', err);
      req.flash('error_msg', 'Failed to load users: ' + err.message);
      res.redirect('/admin');
    }
  },

  // 3. Deep 360-Degree Subscriber Business Inspector
  getUserDetails: (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const data = Admin.getUserDeepInfo(targetId);

      if (!data || !data.user) {
        req.flash('error_msg', 'User not found.');
        return res.redirect('/admin/users');
      }

      res.render('admin/user-details', {
        title: `Subscriber: ${data.user.name} (${data.user.phone || data.user.email})`,
        activeMenu: 'admin-users',
        targetUser: data.user,
        firms: data.firms,
        parties: data.parties,
        items: data.items,
        invoices: data.invoices,
        financials: data.financials
      });
    } catch (err) {
      console.error('Admin getUserDetails error:', err);
      req.flash('error_msg', 'Failed to load subscriber details: ' + err.message);
      res.redirect('/admin/users');
    }
  },

  postCreateUser: async (req, res) => {
    try {
      const { name, email, phone, password, role } = req.body;

      if (!name || !name.trim()) {
        req.flash('error_msg', 'Subscriber name is required.');
        return res.redirect('/admin/users');
      }

      if (!password || password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters long.');
        return res.redirect('/admin/users');
      }

      if (email && email.trim()) {
        const existingEmail = User.findByEmail(email.trim());
        if (existingEmail) {
          req.flash('error_msg', 'A subscriber with this email address already exists.');
          return res.redirect('/admin/users');
        }
      }

      if (phone && phone.trim()) {
        const existingPhone = User.findByPhone(phone.trim());
        if (existingPhone) {
          req.flash('error_msg', 'A subscriber with this phone number already exists.');
          return res.redirect('/admin/users');
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = User.create({
        name: name.trim(),
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        password: hashedPassword,
        google_id: null,
        avatar: null,
        role: role === 'admin' ? 'admin' : 'user',
        status: 'active'
      });

      Admin.logAction(
        req.user.id,
        req.user.name,
        'CREATE_SUBSCRIBER',
        'User',
        newUser.id,
        `Created new subscriber account "${newUser.name}" (${newUser.phone || newUser.email}) with role ${newUser.role}`,
        req.ip
      );

      req.flash('success_msg', `Subscriber account "${newUser.name}" registered successfully.`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Admin postCreateUser error:', err);
      req.flash('error_msg', 'Failed to create subscriber: ' + err.message);
      res.redirect('/admin/users');
    }
  },

  postToggleUserRole: (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      if (targetId === req.user.id) {
        req.flash('error_msg', 'You cannot change your own administrator role.');
        return res.redirect('/admin/users');
      }

      const user = User.findById(targetId);
      if (!user) {
        req.flash('error_msg', 'User not found.');
        return res.redirect('/admin/users');
      }

      const newRole = user.role === 'admin' ? 'user' : 'admin';
      User.updateRole(targetId, newRole);

      Admin.logAction(
        req.user.id,
        req.user.name,
        'CHANGE_ROLE',
        'User',
        targetId,
        `Changed role of "${user.name}" (${user.phone || user.email}) from ${user.role} to ${newRole}`,
        req.ip
      );

      req.flash('success_msg', `Role for "${user.name}" changed to ${newRole.toUpperCase()}.`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Admin toggle role error:', err);
      req.flash('error_msg', 'Failed to update user role: ' + err.message);
      res.redirect('/admin/users');
    }
  },

  postToggleUserStatus: (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      if (targetId === req.user.id) {
        req.flash('error_msg', 'You cannot suspend your own account.');
        return res.redirect('/admin/users');
      }

      const user = User.findById(targetId);
      if (!user) {
        req.flash('error_msg', 'User not found.');
        return res.redirect('/admin/users');
      }

      const newStatus = user.status === 'active' ? 'suspended' : 'active';
      User.updateStatus(targetId, newStatus);

      Admin.logAction(
        req.user.id,
        req.user.name,
        newStatus === 'suspended' ? 'SUSPEND_SUBSCRIBER' : 'ACTIVATE_SUBSCRIBER',
        'User',
        targetId,
        `Changed subscription status of "${user.name}" (${user.phone || user.email}) to ${newStatus}`,
        req.ip
      );

      req.flash('success_msg', `Account "${user.name}" is now ${newStatus.toUpperCase()}.`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Admin toggle status error:', err);
      req.flash('error_msg', 'Failed to update account status: ' + err.message);
      res.redirect('/admin/users');
    }
  },

  postResetUserPassword: async (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      const { new_password } = req.body;

      if (!new_password || new_password.length < 6) {
        req.flash('error_msg', 'New password must be at least 6 characters long.');
        return res.redirect('/admin/users');
      }

      const user = User.findById(targetId);
      if (!user) {
        req.flash('error_msg', 'User not found.');
        return res.redirect('/admin/users');
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);
      User.updatePassword(targetId, hashedPassword);

      Admin.logAction(
        req.user.id,
        req.user.name,
        'RESET_PASSWORD',
        'User',
        targetId,
        `Admin reset password for subscriber "${user.name}" (${user.phone || user.email})`,
        req.ip
      );

      req.flash('success_msg', `Password for "${user.name}" has been updated successfully.`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Admin reset password error:', err);
      req.flash('error_msg', 'Failed to reset password: ' + err.message);
      res.redirect('/admin/users');
    }
  },

  postDeleteUser: (req, res) => {
    try {
      const targetId = parseInt(req.params.id);
      if (targetId === req.user.id) {
        req.flash('error_msg', 'You cannot delete your own admin account.');
        return res.redirect('/admin/users');
      }

      const user = User.findById(targetId);
      if (!user) {
        req.flash('error_msg', 'User not found.');
        return res.redirect('/admin/users');
      }

      // Delete user's firm logo/signature files from disk
      const firms = Firm.getByUserId(targetId);
      firms.forEach(f => {
        if (f.logo_path) {
          const p = path.join(__dirname, '..', 'public', f.logo_path);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
        if (f.signature_path) {
          const p = path.join(__dirname, '..', 'public', f.signature_path);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }
      });

      User.delete(targetId);

      Admin.logAction(
        req.user.id,
        req.user.name,
        'DELETE_USER',
        'User',
        targetId,
        `Deleted subscriber account "${user.name}" (${user.phone || user.email}) and associated data`,
        req.ip
      );

      req.flash('success_msg', `Subscriber "${user.name}" and all business records deleted.`);
      res.redirect('/admin/users');
    } catch (err) {
      console.error('Admin delete user error:', err);
      req.flash('error_msg', 'Failed to delete user: ' + err.message);
      res.redirect('/admin/users');
    }
  },

  // 4. Platform Firms Directory
  getFirms: (req, res) => {
    try {
      const search = req.query.search || '';
      const firms = Admin.getAllFirms(search);

      res.render('admin/firms', {
        title: 'Registered Business Firms Directory',
        activeMenu: 'admin-firms',
        firms,
        search
      });
    } catch (err) {
      console.error('Admin getFirms error:', err);
      req.flash('error_msg', 'Failed to load firms directory: ' + err.message);
      res.redirect('/admin');
    }
  },

  // 5. Platform Invoices Explorer
  getInvoices: (req, res) => {
    try {
      const search = req.query.search || '';
      const type = req.query.type || '';
      const payment_status = req.query.payment_status || '';

      const invoices = Admin.getAllInvoices({ search, type, payment_status });

      res.render('admin/invoices', {
        title: 'Platform Invoices & Ledger Explorer',
        activeMenu: 'admin-invoices',
        invoices,
        search,
        type,
        payment_status
      });
    } catch (err) {
      console.error('Admin getInvoices error:', err);
      req.flash('error_msg', 'Failed to load invoices: ' + err.message);
      res.redirect('/admin');
    }
  },

  // 6. System Health, Diagnostics & Storage Inspector
  getSystemHealth: (req, res) => {
    try {
      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
      const uploadsStats = getDirectoryStats(uploadsDir);
      const dbPath = path.join(__dirname, '..', 'data', 'biller.db');
      let dbSize = 0;
      if (fs.existsSync(dbPath)) {
        dbSize = fs.statSync(dbPath).size;
      }

      // Memory and system diagnostics
      const memUsage = process.memoryUsage();
      const sysInfo = {
        platform: os.platform() + ' ' + os.release(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: Math.round(process.uptime()),
        cpuCount: os.cpus().length,
        freeMem: formatBytes(os.freemem()),
        totalMem: formatBytes(os.totalmem()),
        rssMem: formatBytes(memUsage.rss),
        heapTotal: formatBytes(memUsage.heapTotal),
        heapUsed: formatBytes(memUsage.heapUsed)
      };

      const auditLogs = Admin.getRecentLogs(35);

      res.render('admin/system', {
        title: 'System Health & Maintenance',
        activeMenu: 'admin-system',
        sysInfo,
        storage: {
          uploads: uploadsStats,
          dbSize: formatBytes(dbSize),
          totalStorage: formatBytes(uploadsStats.totalBytes + dbSize)
        },
        auditLogs
      });
    } catch (err) {
      console.error('Admin getSystemHealth error:', err);
      req.flash('error_msg', 'Failed to load system diagnostics: ' + err.message);
      res.redirect('/admin');
    }
  },

  postVacuumDb: (req, res) => {
    try {
      db.exec('VACUUM;');
      db.exec('PRAGMA optimize;');

      Admin.logAction(
        req.user.id,
        req.user.name,
        'OPTIMIZE_DATABASE',
        'System',
        'SQLite',
        'Executed SQLite VACUUM and database optimization',
        req.ip
      );

      req.flash('success_msg', 'Database vacuumed and index performance optimized successfully!');
      res.redirect('/admin/system');
    } catch (err) {
      console.error('Vacuum error:', err);
      req.flash('error_msg', 'Failed to vacuum database: ' + err.message);
      res.redirect('/admin/system');
    }
  },

  postCleanOrphans: (req, res) => {
    try {
      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
      let cleanedCount = 0;
      let freedBytes = 0;

      if (fs.existsSync(uploadsDir)) {
        // Collect active referenced file paths from firms
        const allFirms = db.prepare('SELECT logo_path, signature_path FROM firms').all();
        const activeFiles = new Set();
        allFirms.forEach(f => {
          if (f.logo_path) activeFiles.add(path.basename(f.logo_path));
          if (f.signature_path) activeFiles.add(path.basename(f.signature_path));
        });

        const filesOnDisk = fs.readdirSync(uploadsDir);
        filesOnDisk.forEach(file => {
          if (!activeFiles.has(file)) {
            const filePath = path.join(uploadsDir, file);
            const stat = fs.statSync(filePath);
            freedBytes += stat.size;
            fs.unlinkSync(filePath);
            cleanedCount++;
          }
        });
      }

      Admin.logAction(
        req.user.id,
        req.user.name,
        'CLEAN_ORPHAN_FILES',
        'Storage',
        'Uploads',
        `Purged ${cleanedCount} orphaned files, freed ${formatBytes(freedBytes)}`,
        req.ip
      );

      req.flash('success_msg', `Cleaned ${cleanedCount} orphaned files and reclaimed ${formatBytes(freedBytes)} of storage!`);
      res.redirect('/admin/system');
    } catch (err) {
      console.error('Clean orphans error:', err);
      req.flash('error_msg', 'Failed to clean orphaned files: ' + err.message);
      res.redirect('/admin/system');
    }
  },

  getDownloadDb: (req, res) => {
    try {
      const dbPath = path.join(__dirname, '..', 'data', 'biller.db');
      if (!fs.existsSync(dbPath)) {
        req.flash('error_msg', 'Database file not found.');
        return res.redirect('/admin/system');
      }

      Admin.logAction(
        req.user.id,
        req.user.name,
        'DOWNLOAD_DATABASE_BACKUP',
        'System',
        'biller.db',
        'Downloaded raw database backup snapshot',
        req.ip
      );

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      res.download(dbPath, `RACE_FINANCE_DB_SNAPSHOT_${timestamp}.db`);
    } catch (err) {
      console.error('Download DB error:', err);
      req.flash('error_msg', 'Failed to download database: ' + err.message);
      res.redirect('/admin/system');
    }
  },

  // 7. Global SaaS & Platform Governance Settings
  getSettings: (req, res) => {
    try {
      const settings = Admin.getAllPlatformSettings();
      res.render('admin/settings', {
        title: 'SaaS Platform Governance Settings',
        activeMenu: 'admin-settings',
        settings
      });
    } catch (err) {
      console.error('Admin getSettings error:', err);
      req.flash('error_msg', 'Failed to load platform settings: ' + err.message);
      res.redirect('/admin');
    }
  },

  postSettings: (req, res) => {
    try {
      const {
        max_firms_limit,
        max_upload_size_mb,
        platform_announcement,
        platform_announcement_type,
        enable_announcement,
        maintenance_mode
      } = req.body;

      Admin.setPlatformSetting('max_firms_limit', parseInt(max_firms_limit) || '2');
      Admin.setPlatformSetting('max_upload_size_mb', parseInt(max_upload_size_mb) || '2');
      Admin.setPlatformSetting('platform_announcement', platform_announcement ? platform_announcement.trim() : '');
      Admin.setPlatformSetting('platform_announcement_type', platform_announcement_type || 'info');
      Admin.setPlatformSetting('enable_announcement', enable_announcement === '1' ? '1' : '0');
      Admin.setPlatformSetting('maintenance_mode', maintenance_mode === '1' ? '1' : '0');

      Admin.logAction(
        req.user.id,
        req.user.name,
        'UPDATE_PLATFORM_SETTINGS',
        'Settings',
        'Global',
        `Updated platform governance settings: Max firms = ${max_firms_limit}, Announcement active = ${enable_announcement === '1'}`,
        req.ip
      );

      req.flash('success_msg', 'Platform governance settings updated successfully.');
      res.redirect('/admin/settings');
    } catch (err) {
      console.error('Admin postSettings error:', err);
      req.flash('error_msg', 'Failed to save settings: ' + err.message);
      res.redirect('/admin/settings');
    }
  }
};

module.exports = adminController;
