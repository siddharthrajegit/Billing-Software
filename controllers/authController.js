const bcrypt = require('bcryptjs');
const passport = require('passport');
const { User } = require('../models');

const authController = {
  getLogin: (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
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
        const redirectUrl = req.session.returnTo || '/dashboard';
        delete req.session.returnTo;
        res.redirect(redirectUrl);
      });
    })(req, res, next);
  },

  getRegister: (req, res) => {
    if (req.isAuthenticated()) {
      return res.redirect('/dashboard');
    }
    const hasGoogleAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here');
    res.render('auth/register', {
      title: 'Create Business Account - RACE FINANCE',
      hasGoogleAuth
    });
  },

  postRegister: async (req, res) => {
    try {
      const { name, email, phone, password, confirm_password } = req.body;

      if (!name || !password || (!email && !phone)) {
        req.flash('error_msg', 'Please provide your name, password, and at least an email or phone number.');
        return res.redirect('/auth/register');
      }

      if (password !== confirm_password) {
        req.flash('error_msg', 'Passwords do not match.');
        return res.redirect('/auth/register');
      }

      if (password.length < 6) {
        req.flash('error_msg', 'Password must be at least 6 characters long.');
        return res.redirect('/auth/register');
      }

      // Check existing email
      if (email && email.trim()) {
        const existingEmail = User.findByEmail(email.trim());
        if (existingEmail) {
          req.flash('error_msg', 'An account with this email address already exists. Please login.');
          return res.redirect('/auth/login');
        }
      }

      // Check existing phone
      if (phone && phone.trim()) {
        const existingPhone = User.findByPhone(phone.trim());
        if (existingPhone) {
          req.flash('error_msg', 'An account with this phone number already exists. Please login.');
          return res.redirect('/auth/login');
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = User.create({
        name: name.trim(),
        email: email ? email.trim() : null,
        phone: phone ? phone.trim() : null,
        password: hashedPassword
      });

      req.logIn(newUser, (err) => {
        if (err) {
          req.flash('error_msg', 'Registration successful, but automatic sign-in failed. Please log in.');
          return res.redirect('/auth/login');
        }
        req.flash('success_msg', 'Account created successfully! Please register your first firm to begin.');
        res.redirect('/firms/create');
      });
    } catch (err) {
      console.error('Registration error:', err);
      req.flash('error_msg', 'An error occurred during registration. Please try again.');
      res.redirect('/auth/register');
    }
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
      const redirectUrl = req.session.returnTo || '/dashboard';
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
