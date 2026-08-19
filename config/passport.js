const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcryptjs');
const { User, Backup } = require('../models');

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser((id, done) => {
  try {
    const user = User.findById(id);
    if (!user) return done(null, false);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

// 1. Local Strategy (Email or Phone + Password)
passport.use(
  'local',
  new LocalStrategy(
    {
      usernameField: 'identifier', // Can be email or phone
      passwordField: 'password',
      passReqToCallback: true
    },
    async (req, identifier, password, done) => {
      try {
        const trimmed = (identifier || '').trim();
        const user = User.findByEmailOrPhone(trimmed);

        if (!user) {
          return done(null, false, { message: 'No account found with this email or phone number.' });
        }

        if (!user.password) {
          return done(null, false, {
            message: 'This account was created via Google Sign-In. Please sign in with Google.'
          });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Invalid password. Please check and try again.' });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// 2. Google OAuth 2.0 Strategy
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleCallbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback';

if (googleClientId && googleClientSecret && googleClientId !== 'your_google_client_id_here') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: googleCallbackUrl,
        scope: [
          'profile',
          'email',
          'https://www.googleapis.com/auth/drive.file' // Permission to upload backup files created by this app
        ],
        accessType: 'offline',
        prompt: 'consent'
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
          const name = profile.displayName || 'Google User';

          let user = User.findByGoogleId(profile.id);

          if (!user && email) {
            user = User.findByEmail(email);
            if (user) {
              user = User.updateGoogleId(user.id, profile.id, avatar);
            }
          }

          if (!user) {
            user = User.create({
              name,
              email,
              phone: null,
              password: null,
              google_id: profile.id,
              avatar
            });
          }

          // Save Google Drive API OAuth token for 1-click cloud backup
          if (accessToken) {
            const expiryDate = params.expires_in ? Date.now() + params.expires_in * 1000 : null;
            Backup.saveGoogleToken(user.id, {
              access_token: accessToken,
              refresh_token: refreshToken,
              scope: params.scope,
              token_type: params.token_type,
              expiry_date: expiryDate,
              email
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err, null);
        }
      }
    )
  );
}

module.exports = passport;
