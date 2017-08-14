const PERMISSIONS = require('./permissions/consts');

function authorize({ permission }) {
  return function (req, res, next) {
    if (req.user.isTweekService) {
      return next();
    }
    if (
      permission !== PERMISSIONS.ADMIN &&
      req.user &&
      req.user.permissions &&
      req.user.permissions.includes(permission)
    ) {
      return next();
    }
    res.send(403);
  };
}

module.exports = authorize;
