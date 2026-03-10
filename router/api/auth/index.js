const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../../../models/User");
const QuizAttempt = require("../../../models/QuizAttempt");
const auth = require("../../../middleware/auth");

const router = express.Router({ mergeParams: true });

// ==================== POST /api/auth/register ====================
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

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

    // Check if username is taken
    if (username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          message: "اسم المستخدم مسجل بالفعل",
        });
      }
    }

    // Only allow admin creation by existing admins
    let userRole = role || "student";
    if (userRole === "admin") {
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
      username: username || email.split("@")[0],
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

    // Return flat format matching frontend expectations
    res.status(201).json({
      success: true,
      message: "تم إنشاء الحساب بنجاح",
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "البريد الإلكتروني أو اسم المستخدم مسجل بالفعل",
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

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "بيانات الدخول غير صحيحة",
      });
    }

    // Update streak
    const now = new Date();
    const lastActive = user.lastActiveDate;
    if (lastActive) {
      const diffDays = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        user.streak += 1;
      } else if (diffDays > 1) {
        user.streak = 1;
      }
    } else {
      user.streak = 1;
    }
    user.lastActiveDate = now;
    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Return flat format matching frontend expectations
    res.status(200).json({
      success: true,
      message: "تم تسجيل الدخول بنجاح",
      token,
      user: user.toJSON(),
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

    // Get quiz stats
    const totalAttempts = await QuizAttempt.countDocuments({ student: user._id });
    const passedAttempts = await QuizAttempt.countDocuments({ student: user._id, passed: true });

    const allAttempts = await QuizAttempt.find({ student: user._id });
    let totalCorrect = 0;
    let totalQuestions = 0;
    allAttempts.forEach((a) => {
      totalCorrect += a.correctAnswers;
      totalQuestions += a.totalQuestions;
    });

    const averageAccuracy = totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0;

    // Return flat format matching frontend expectations
    res.status(200).json({
      success: true,
      user: user.toJSON(),
      stats: {
        totalAttempts,
        passedAttempts,
        totalPoints: user.points,
        averageAccuracy,
      },
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
