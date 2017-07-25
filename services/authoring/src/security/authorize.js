function authorize({ permission }) {
  return function (req, res, next) {
    if (req.user.isTweekService) {
      return next();
    } else if (
      permission !== 'admin' &&
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
