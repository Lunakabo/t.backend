const express = require("express");
const User = require("../../../models/User");
const auth = require("../../../middleware/auth");

const router = express.Router({ mergeParams: true });

// ==================== GET /api/progress ====================
// Get user's roadmap progress (requires auth)
router.get("/", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("roadmapProgress");

    res.status(200).json({
      success: true,
      data: user.roadmapProgress || {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب التقدم",
      error: error.message,
    });
  }
});

// ==================== POST /api/progress ====================
// Save/update progress for a roadmap step (requires auth)
router.post("/", auth, async (req, res) => {
  try {
    const { roadmapId, stepId, completed } = req.body;

    if (!roadmapId || !stepId) {
      return res.status(400).json({
        success: false,
        message: "معرف المسار والخطوة مطلوبان",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user.roadmapProgress) {
      user.roadmapProgress = {};
    }

    if (!user.roadmapProgress[roadmapId]) {
      user.roadmapProgress[roadmapId] = {};
    }

    user.roadmapProgress[roadmapId][stepId] = completed !== false;

    // Award points for completing a step
    if (completed !== false) {
      user.points = (user.points || 0) + 10;

      // Level up every 100 points
      user.level = Math.floor(user.points / 100) + 1;
    }

    user.markModified("roadmapProgress");
    await user.save();

    res.status(200).json({
      success: true,
      message: "تم حفظ التقدم بنجاح",
      data: {
        progress: user.roadmapProgress,
        points: user.points,
        level: user.level,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في حفظ التقدم",
      error: error.message,
    });
  }
});

// ==================== PUT /api/progress/sync ====================
// Sync localStorage progress to backend (requires auth)
router.put("/sync", auth, async (req, res) => {
  try {
    const { progress } = req.body;

    if (!progress || typeof progress !== "object") {
      return res.status(400).json({
        success: false,
        message: "بيانات التقدم غير صالحة",
      });
    }

    const user = await User.findById(req.user._id);

    // Merge: keep backend progress, add any new from localStorage
    const merged = { ...(user.roadmapProgress || {}), ...progress };
    user.roadmapProgress = merged;

    // Recalculate points
    let totalSteps = 0;
    Object.values(merged).forEach((roadmap) => {
      totalSteps += Object.values(roadmap).filter((v) => v === true).length;
    });
    user.points = totalSteps * 10;
    user.level = Math.floor(user.points / 100) + 1;

    user.markModified("roadmapProgress");
    await user.save();

    res.status(200).json({
      success: true,
      message: "تم مزامنة التقدم بنجاح",
      data: {
        progress: user.roadmapProgress,
        points: user.points,
        level: user.level,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في المزامنة",
      error: error.message,
    });
  }
});

module.exports = router;
