function allowRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    if (!allowedRoles.includes(req.user.roleKey)) {
      return res.status(403).json({ message: "You do not have permission to perform this action." });
    }

    next();
  };
}

function allowLeadersOnly(req, res, next) {
  const leaderRoles = ["captain", "vice_captain", "manager", "strategist"];

  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }

  if (!leaderRoles.includes(req.user.roleKey)) {
    return res.status(403).json({ message: "Leader access required." });
  }

  next();
}

module.exports = { allowRoles, allowLeadersOnly };
