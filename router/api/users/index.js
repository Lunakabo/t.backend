const express = require("express");
const User = require("../../../models/User");
const auth = require("../../../middleware/auth");
const roleCheck = require("../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

// ==================== PUT /api/users/profile ====================
// Must come before /:id routes
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, username, email } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    if (username) {
      // Check if username is taken by another user
      const existing = await User.findOne({
        username,
        _id: { $ne: req.user._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "اسم المستخدم مسجل بالفعل",
        });
      }
      updateData.username = username;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.status(200).json({
      success: true,
      message: "تم تحديث الملف الشخصي بنجاح",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تحديث الملف الشخصي",
      error: error.message,
    });
  }
});

// ==================== PUT /api/users/avatar ====================
router.put("/avatar", auth, async (req, res) => {
  try {
    const { skinColor, hairStyle, hairColor, eyeColor, outfit, outfitColor } = req.body;
    const avatarData = {};

    if (skinColor) avatarData["avatar.skinColor"] = skinColor;
    if (hairStyle) avatarData["avatar.hairStyle"] = hairStyle;
    if (hairColor) avatarData["avatar.hairColor"] = hairColor;
    if (eyeColor) avatarData["avatar.eyeColor"] = eyeColor;
    if (outfit) avatarData["avatar.outfit"] = outfit;
    if (outfitColor) avatarData["avatar.outfitColor"] = outfitColor;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: avatarData },
      { new: true }
    ).select("-password");

    // Update localStorage on frontend
    res.status(200).json({
      success: true,
      message: "تم تحديث الشخصية بنجاح",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تحديث الشخصية",
      error: error.message,
    });
  }
});

// ==================== GET /api/users/leaderboard ====================
router.get("/leaderboard", auth, async (req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select("name username avatar points level streak")
      .sort({ points: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب الترتيب",
      error: error.message,
    });
  }
});

// ==================== Admin routes ====================
// GET /api/users (admin only)
router.get("/", auth, roleCheck("admin"), async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) query.role = role;

    const users = await User.find(query)
      .select("-password")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب المستخدمين",
      error: error.message,
    });
  }
});

// GET /api/users/:id
router.get("/:id", auth, roleCheck("admin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("enrolledCourses.course", "title description");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

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

// PUT /api/users/:id
router.put("/:id", auth, roleCheck("admin"), async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (typeof isActive === "boolean") updateData.isActive = isActive;

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث المستخدم بنجاح",
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تحديث المستخدم",
      error: error.message,
    });
  }
});

// DELETE /api/users/:id
router.delete("/:id", auth, roleCheck("admin"), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "لا يمكنك حذف حسابك الخاص",
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم حذف المستخدم بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في حذف المستخدم",
      error: error.message,
    });
  }
});

module.exports = router;
