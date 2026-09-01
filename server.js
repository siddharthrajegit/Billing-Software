require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const { ensureAuthenticated, ensureAdmin, ensureUserOnly, ensureActiveFirm } = require('./middleware/auth');
const reportController = require('./controllers/reportController');

// Route modules
const authRoutes = require('./routes/authRoutes');
const firmRoutes = require('./routes/firmRoutes');
const itemRoutes = require('./routes/itemRoutes');
const partyRoutes = require('./routes/partyRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const backupRoutes = require('./routes/backupRoutes');
const settingRoutes = require('./routes/settingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const legalRoutes = require('./routes/legalRoutes');
const { Admin, Firm } = require('./models');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'race_finance_super_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    }
  })
);

// Flash messages
app.use(flash());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Global template variables middleware
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isAdmin = req.user && req.user.role === 'admin';
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.info_msg = req.flash('info_msg');
  res.locals.currentUrl = req.originalUrl;
  res.locals.activeMenu = '';
  res.locals.activeFirm = null;
  res.locals.userFirms = [];
  if (req.user && req.user.role !== 'admin') {
    try {
      const userFirms = Firm.getByUserId(req.user.id);
      res.locals.userFirms = userFirms || [];
      let activeFirmId = req.session.activeFirmId;
      let activeFirm = null;
      if (activeFirmId && userFirms) {
        activeFirm = userFirms.find(f => f.id === parseInt(activeFirmId));
      }
      if (!activeFirm && userFirms && userFirms.length > 0) {
        activeFirm = userFirms.find(f => f.is_default === 1) || userFirms[0];
      }
      res.locals.activeFirm = activeFirm;
    } catch (err) {
      console.error('Error setting global firm variables:', err);
    }
  }
  try {
    res.locals.platformSettings = Admin.getAllPlatformSettings();
  } catch (e) {
    res.locals.platformSettings = {};
  }
  next();
});

// Routes
app.use('/admin', adminRoutes);
app.use('/auth', authRoutes);
app.use('/firms', firmRoutes);
app.use('/items', itemRoutes);
app.use('/parties', partyRoutes);
app.use('/payments', paymentRoutes);
app.use('/reports', reportRoutes);
app.use('/backup', backupRoutes);
app.use('/settings', settingRoutes);

// Legal & Public Policies
app.use('/legal', legalRoutes);
app.get('/about', (req, res) => res.redirect('/legal?tab=about'));
app.get('/terms', (req, res) => res.redirect('/legal?tab=terms'));
app.get('/privacy', (req, res) => res.redirect('/legal?tab=privacy'));
app.get('/refund-policy', (req, res) => res.redirect('/legal?tab=refund'));
app.get('/disclaimer', (req, res) => res.redirect('/legal?tab=disclaimer'));
app.get('/security', (req, res) => res.redirect('/legal?tab=security'));

app.use('/', invoiceRoutes);

// Dashboard Route (Root redirect / Dashboard)
app.get('/dashboard', ensureUserOnly, ensureActiveFirm, reportController.getDashboard);
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    if (req.user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/dashboard');
    }
  } else {
    res.redirect('/auth/login');
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).render('404', {
    title: '404 - Page Not Found',
    activeMenu: ''
  });
});

// General Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).render('error', {
    title: 'Error - Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : {},
    activeMenu: ''
  });
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 RACE FINANCE Server is running!`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

module.exports = app;
