const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "غير مصرح - يرجى تسجيل الدخول",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "الحساب معطل",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "التوكن غير صالح",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "التوكن منتهي الصلاحية",
      });
    }
    return res.status(500).json({
      success: false,
      message: "خطأ في المصادقة",
    });
  }
};

module.exports = auth;
