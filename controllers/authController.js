const bcrypt = require('bcryptjs');
const passport = require('passport');
const { User } = require('../models');

const authController = {
  getLogin: (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect(req.user.role === 'admin' ? '/admin' : '/dashboard');
    }
    const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here');
    res.render('auth/login', {
      title: 'Sign In - RACE FINANCE',
      hasGoogleAuth
    });
  },

  postLogin: (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        req.flash('error_msg', info ? info.message : 'Invalid login credentials.');
        return res.redirect('/auth/login');
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        req.flash('success_msg', `Welcome back, ${user.name}!`);
        const defaultRedirect = user.role === 'admin' ? '/admin' : '/dashboard';
        const redirectUrl = req.session.returnTo || defaultRedirect;
        delete req.session.returnTo;
        res.redirect(redirectUrl);
      });
    })(req, res, next);
  },

  getRegister: (req, res) => {
    req.flash('info_msg', 'Direct online registration is disabled. Accounts are manually provisioned by the administrator. Please contact support on WhatsApp to request your trial credentials.');
    res.redirect('/auth/login');
  },

  postRegister: (req, res) => {
    req.flash('error_msg', 'Direct online registration is disabled. Please contact support on WhatsApp to request access.');
    res.redirect('/auth/login');
  },

  googleAuth: (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here') {
      req.flash('error_msg', 'Google OAuth is not configured yet. Please use Phone/Email login or add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env');
      return res.redirect('/auth/login');
    }
    passport.authenticate('google', {
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/drive.file'],
      accessType: 'offline',
      prompt: 'consent'
    })(req, res, next);
  },

  googleCallback: (req, res, next) => {
    passport.authenticate('google', {
      failureRedirect: '/auth/login',
      failureFlash: 'Google sign-in failed or was cancelled.'
    })(req, res, () => {
      req.flash('success_msg', `Signed in with Google successfully!`);
      const defaultRedirect = req.user.role === 'admin' ? '/admin' : '/dashboard';
      const redirectUrl = req.session.returnTo || defaultRedirect;
      delete req.session.returnTo;
      res.redirect(redirectUrl);
    });
  },

  logout: (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.flash('success_msg', 'You have been logged out successfully.');
      res.redirect('/auth/login');
    });
  }
};

module.exports = authController;
