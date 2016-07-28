import passport from 'passport';
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

module.exports = function (server, config) {
  const oidcStrategy = new OIDCStrategy({
    identityMetadata: 'https://login.microsoftonline.com/common/.well-known/openid-configuration',
    clientID: config.get('AZUREAD_CLIENT_ID'),
    clientSecret: config.get('AZUREAD_CLIENT_SECRET'),
    skipUserProfile: true,
    loggingLevel: 'info',
    responseType: 'code',
    responseMode: 'query',
    scope: ['profile'],
    callbackURL: config.get('AZUREAD_CALLBACK_URL'),
  },
    function (token, done) {
      return done(null, { name: token.sub }, token);
    }
);


  server.get('/auth/openid', passport.authenticate('azuread-openidconnect'));
  server.get('/auth/openid/callback', passport.authenticate('azuread-openidconnect'), function (req, res) {
    res.redirect('/');
  });

  passport.use(oidcStrategy);
  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    done(null, user);
  });
  return {
    url: '/auth/openid',
    name: 'Azure open id connect',
  };
};

