require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('./config/passport');
const { ensureAuthenticated, ensureActiveFirm } = require('./middleware/auth');
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
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.info_msg = req.flash('info_msg');
  res.locals.currentUrl = req.originalUrl;
  res.locals.activeMenu = '';
  res.locals.activeFirm = null;
  res.locals.userFirms = [];
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/firms', firmRoutes);
app.use('/items', itemRoutes);
app.use('/parties', partyRoutes);
app.use('/payments', paymentRoutes);
app.use('/reports', reportRoutes);
app.use('/backup', backupRoutes);
app.use('/settings', settingRoutes);
app.use('/', invoiceRoutes);

// Dashboard Route (Root redirect / Dashboard)
app.get('/dashboard', ensureAuthenticated, ensureActiveFirm, reportController.getDashboard);
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect('/dashboard');
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
