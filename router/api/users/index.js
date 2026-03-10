const express = require("express");
const User = require("../../../models/User");
const auth = require("../../../middleware/auth");
const roleCheck = require("../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

// All routes require auth + admin role
router.use(auth);
router.use(roleCheck("admin"));

// ==================== GET /api/users ====================
router.get("/", async (req, res) => {
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

// ==================== GET /api/users/:id ====================
router.get("/:id", async (req, res) => {
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

// ==================== PUT /api/users/:id ====================
router.put("/:id", async (req, res) => {
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

// ==================== DELETE /api/users/:id ====================
router.delete("/:id", async (req, res) => {
  try {
    // Prevent admin from deleting themselves
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
