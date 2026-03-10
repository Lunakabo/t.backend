/**
 * Role-based access control middleware
 * Usage: roleCheck("admin", "trainer") — allows only admin and trainer roles
 */
const roleCheck = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح - يرجى تسجيل الدخول أولاً",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `غير مسموح - هذا الإجراء متاح فقط لـ: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

module.exports = roleCheck;
