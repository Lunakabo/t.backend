const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../../../models/User");
const auth = require("../../../middleware/auth");

const router = express.Router({ mergeParams: true });

// ==================== POST /api/auth/register ====================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "جميع الحقول مطلوبة (الاسم، البريد الإلكتروني، كلمة المرور)",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني مسجل بالفعل",
      });
    }

    // Only allow admin creation by existing admins (default role is student)
    let userRole = role || "student";
    if (userRole === "admin") {
      // Check if there are any admins yet (first admin can self-register)
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount > 0) {
        return res.status(403).json({
          success: false,
          message: "لا يمكن إنشاء حساب مدير - تواصل مع مدير النظام",
        });
      }
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
    });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    res.status(500).json({
      success: false,
      message: "حدث خطأ في إنشاء الحساب",
      error: error.message,
    });
  }
});

// ==================== POST /api/auth/login ====================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني وكلمة المرور مطلوبان",
      });
    }

    // Find user with password
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "الحساب معطل - تواصل مع مدير النظام",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تسجيل الدخول",
      error: error.message,
    });
  }
});

// ==================== GET /api/auth/me ====================
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("enrolledCourses.course", "title description");

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ",
      error: error.message,
    });
  }
});

module.exports = router;
