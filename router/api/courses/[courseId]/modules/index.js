const express = require("express");
const Module = require("../../../../../models/Module");
const Course = require("../../../../../models/Course");
const auth = require("../../../../../middleware/auth");
const roleCheck = require("../../../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);

// ==================== POST /api/courses/:courseId/modules ====================
router.post("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    // Trainers can only add modules to their own courses
    if (
      req.user.role === "trainer" &&
      course.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك إضافة وحدات لكورس لم تقم بإنشائه",
      });
    }

    const { title, description, content, order, passingScore, questionsPerQuiz } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: "عنوان ومحتوى الوحدة مطلوبان",
      });
    }

    // Auto-set order if not provided
    const moduleOrder = order || course.modules.length + 1;

    const module = await Module.create({
      title,
      description,
      content,
      course: course._id,
      order: moduleOrder,
      passingScore: passingScore || 60,
      questionsPerQuiz: questionsPerQuiz || 5,
    });

    // Add module to course
    course.modules.push(module._id);
    await course.save();

    res.status(201).json({
      success: true,
      message: "تم إنشاء الوحدة بنجاح",
      data: { module },
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
      message: "حدث خطأ في إنشاء الوحدة",
      error: error.message,
    });
  }
});

// ==================== GET /api/courses/:courseId/modules ====================
router.get("/", async (req, res) => {
  try {
    const modules = await Module.find({ course: req.params.courseId }).sort({
      order: 1,
    });

    res.status(200).json({
      success: true,
      data: { modules },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب الوحدات",
      error: error.message,
    });
  }
});

module.exports = router;
