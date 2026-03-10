const express = require("express");
const User = require("../../../models/User");
const Course = require("../../../models/Course");
const QuizAttempt = require("../../../models/QuizAttempt");
const Module = require("../../../models/Module");
const auth = require("../../../middleware/auth");
const roleCheck = require("../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);
router.use(roleCheck("student"));

// ==================== GET /api/my/courses ====================
router.get("/courses", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "enrolledCourses.course",
      populate: {
        path: "modules",
        select: "title order",
        options: { sort: { order: 1 } },
      },
    });

    const courses = user.enrolledCourses.map((enrollment) => ({
      course: enrollment.course,
      enrolledAt: enrollment.enrolledAt,
      progress: enrollment.progress,
    }));

    res.status(200).json({
      success: true,
      data: { courses },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب الكورسات",
      error: error.message,
    });
  }
});

// ==================== GET /api/my/progress ====================
router.get("/progress", async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "enrolledCourses.course",
      "title modules"
    );

    const progressData = [];

    for (const enrollment of user.enrolledCourses) {
      if (!enrollment.course) continue;

      const courseId = enrollment.course._id;

      // Get all modules for this course
      const modules = await Module.find({ course: courseId }).sort({ order: 1 });

      // Get quiz attempts for each module
      const moduleProgress = [];

      for (const mod of modules) {
        const attempts = await QuizAttempt.find({
          student: req.user._id,
          module: mod._id,
        }).sort({ createdAt: -1 });

        const passed = attempts.some((a) => a.passed);
        const bestScore = attempts.length > 0
          ? Math.max(...attempts.map((a) => a.score))
          : 0;

        moduleProgress.push({
          moduleId: mod._id,
          moduleTitle: mod.title,
          order: mod.order,
          passed,
          bestScore,
          totalAttempts: attempts.length,
          lastAttemptDate:
            attempts.length > 0 ? attempts[0].createdAt : null,
        });
      }

      const passedModules = moduleProgress.filter((m) => m.passed).length;
      const totalModules = modules.length;
      const overallProgress =
        totalModules > 0
          ? Math.round((passedModules / totalModules) * 100)
          : 0;

      progressData.push({
        courseId,
        courseTitle: enrollment.course.title,
        enrolledAt: enrollment.enrolledAt,
        overallProgress,
        passedModules,
        totalModules,
        modules: moduleProgress,
      });
    }

    res.status(200).json({
      success: true,
      data: { progress: progressData },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب التقدم",
      error: error.message,
    });
  }
});

module.exports = router;
