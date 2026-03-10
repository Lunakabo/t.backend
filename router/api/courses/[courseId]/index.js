const express = require("express");
const Course = require("../../../../models/Course");
const User = require("../../../../models/User");
const auth = require("../../../../middleware/auth");
const roleCheck = require("../../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);

// ==================== GET /api/courses/:courseId ====================
router.get("/", async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate("createdBy", "name email")
      .populate({
        path: "modules",
        options: { sort: { order: 1 } },
      })
      .populate("students", "name email");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    // Students can only see published courses
    if (req.user.role === "student" && !course.isPublished) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      data: { course },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ",
      error: error.message,
    });
  }
});

// ==================== PUT /api/courses/:courseId ====================
router.put("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    // Trainers can only edit their own courses
    if (
      req.user.role === "trainer" &&
      course.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك تعديل كورس لم تقم بإنشائه",
      });
    }

    const { title, description, category, difficulty, isPublished } = req.body;

    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (difficulty) course.difficulty = difficulty;
    if (typeof isPublished === "boolean") course.isPublished = isPublished;

    await course.save();

    res.status(200).json({
      success: true,
      message: "تم تحديث الكورس بنجاح",
      data: { course },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تحديث الكورس",
      error: error.message,
    });
  }
});

// ==================== DELETE /api/courses/:courseId ====================
router.delete("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    // Trainers can only delete their own courses
    if (
      req.user.role === "trainer" &&
      course.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك حذف كورس لم تقم بإنشائه",
      });
    }

    await Course.findByIdAndDelete(req.params.courseId);

    res.status(200).json({
      success: true,
      message: "تم حذف الكورس بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في حذف الكورس",
      error: error.message,
    });
  }
});

module.exports = router;
