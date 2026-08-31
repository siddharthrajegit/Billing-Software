const { Firm } = require('../models');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    if (req.user && req.user.status === 'suspended') {
      req.logout(() => {
        req.flash('error_msg', 'Your account has been suspended by the platform administrator.');
        res.redirect('/auth/login');
      });
      return;
    }
    return next();
  }
  req.flash('error_msg', 'Please sign in to access this page.');
  req.session.returnTo = req.originalUrl;
  res.redirect('/auth/login');
}

function ensureAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('error_msg', 'Please sign in with administrator credentials.');
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }

  if (req.user.status === 'suspended') {
    req.logout(() => {
      req.flash('error_msg', 'Your administrator account has been suspended.');
      res.redirect('/auth/login');
    });
    return;
  }

  if (req.user.role !== 'admin') {
    req.flash('error_msg', 'Access denied. Administrator privileges required.');
    return res.redirect('/dashboard');
  }

  res.locals.isAdmin = true;
  next();
}

function ensureUserOnly(req, res, next) {
  if (!req.isAuthenticated()) {
    req.flash('error_msg', 'Please sign in to access this page.');
    req.session.returnTo = req.originalUrl;
    return res.redirect('/auth/login');
  }

  if (req.user.status === 'suspended') {
    req.logout(() => {
      req.flash('error_msg', 'Your account has been suspended by the platform administrator.');
      res.redirect('/auth/login');
    });
    return;
  }

  if (req.user.role === 'admin') {
    req.flash('error_msg', 'Admins manage the platform and do not have access to individual business billing, party, item, or inventory features.');
    return res.redirect('/admin');
  }

  next();
}

function ensureActiveFirm(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }

  // Admins do not operate business firms
  if (req.user.role === 'admin') {
    return next();
  }

  const userId = req.user.id;
  const userFirms = Firm.getByUserId(userId);
  res.locals.userFirms = userFirms;

  if (!userFirms || userFirms.length === 0) {
    // If the user has no firms registered yet and isn't already on the firm creation route
    if (req.originalUrl !== '/firms/create' && !req.originalUrl.startsWith('/auth') && req.originalUrl !== '/firms' && !req.originalUrl.startsWith('/admin')) {
      req.flash('info_msg', 'Welcome! Please create your first business firm to get started.');
      return res.redirect('/firms/create');
    }
    return next();
  }

  // Check if session has a valid activeFirmId
  let activeFirmId = req.session.activeFirmId;
  let activeFirm = null;

  if (activeFirmId) {
    activeFirm = userFirms.find(f => f.id === parseInt(activeFirmId));
  }

  if (!activeFirm) {
    // Default to is_default = 1 or first firm
    activeFirm = userFirms.find(f => f.is_default === 1) || userFirms[0];
    req.session.activeFirmId = activeFirm.id;
  }

  req.activeFirm = activeFirm;
  res.locals.activeFirm = activeFirm;
  next();
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
  ensureUserOnly,
  ensureActiveFirm
};
