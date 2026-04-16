const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ── Google OAuth (only wire up if credentials are provided) ────────────────
const googleCredsPresent =
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id';

if (googleCredsPresent) {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
          user.googleId = profile.id;
          user.avatar   = profile.photos[0]?.value;
          await user.save();
        } else {
          const count = await User.countDocuments();
          user = await User.create({
            googleId:   profile.id,
            email:      profile.emails[0].value,
            name:       profile.displayName,
            avatar:     profile.photos[0]?.value,
            role:       count === 0 ? 'system_admin' : 'viewer',
            siteAccess: ['all'],
          });
        }
      }
      user.lastLogin = new Date();
      await user.save();
      done(null, user);
    } catch (err) { done(err); }
  }));

  router.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

  router.get('/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    }),
    (req, res) => {
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
    }
  );
} else {
  // Stub routes so the frontend doesn't get 404s
  router.get('/google', (_req, res) =>
    res.redirect(`${process.env.FRONTEND_URL}/login?error=google_not_configured`));
  router.get('/google/callback', (_req, res) =>
    res.redirect(`${process.env.FRONTEND_URL}/login?error=google_not_configured`));
}

// ── Dev / Demo login (development only) ────────────────────────────────────
router.post('/dev-login', async (req, res) => {
  if (process.env.NODE_ENV === 'production')
    return res.status(403).json({ message: 'Dev login disabled in production' });

  const { name = 'Demo Admin', email = 'admin@cloudfi.dev', role = 'system_admin' } = req.body || {};

  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      email, name, role,
      siteAccess: ['all'],
      isActive:   true,
    });
  } else {
    // allow role override for demo purposes
    user.name = name; user.role = role; user.isActive = true;
    await user.save();
  }

  user.lastLogin = new Date();
  await user.save();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user });
});

// ── Status – tells the frontend whether Google OAuth is configured ──────────
router.get('/status', (_req, res) => {
  res.json({ googleConfigured: googleCredsPresent });
});

router.get('/me', require('../middleware/auth').protect, (req, res) => res.json(req.user));

module.exports = router;
