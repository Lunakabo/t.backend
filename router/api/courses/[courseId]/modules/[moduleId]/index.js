const express = require("express");
const Module = require("../../../../../../models/Module");
const Course = require("../../../../../../models/Course");
const auth = require("../../../../../../middleware/auth");
const roleCheck = require("../../../../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);

// ==================== GET /api/courses/:courseId/modules/:moduleId ====================
router.get("/", async (req, res) => {
  try {
    const module = await Module.findOne({
      _id: req.params.moduleId,
      course: req.params.courseId,
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "الوحدة غير موجودة",
      });
    }

    res.status(200).json({
      success: true,
      data: { module },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ",
      error: error.message,
    });
  }
});

// ==================== PUT /api/courses/:courseId/modules/:moduleId ====================
router.put("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    // Trainers can only edit modules in their own courses
    if (
      req.user.role === "trainer" &&
      course.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك تعديل وحدات كورس لم تقم بإنشائه",
      });
    }

    const { title, description, content, order, passingScore, questionsPerQuiz } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content) updateData.content = content;
    if (order) updateData.order = order;
    if (passingScore) updateData.passingScore = passingScore;
    if (questionsPerQuiz) updateData.questionsPerQuiz = questionsPerQuiz;

    const module = await Module.findOneAndUpdate(
      { _id: req.params.moduleId, course: req.params.courseId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "الوحدة غير موجودة",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث الوحدة بنجاح",
      data: { module },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تحديث الوحدة",
      error: error.message,
    });
  }
});

// ==================== DELETE /api/courses/:courseId/modules/:moduleId ====================
router.delete("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    if (
      req.user.role === "trainer" &&
      course.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك حذف وحدات كورس لم تقم بإنشائه",
      });
    }

    const module = await Module.findOneAndDelete({
      _id: req.params.moduleId,
      course: req.params.courseId,
    });

    if (!module) {
      return res.status(404).json({
        success: false,
        message: "الوحدة غير موجودة",
      });
    }

    // Remove module from course
    course.modules = course.modules.filter(
      (m) => m.toString() !== req.params.moduleId
    );
    await course.save();

    res.status(200).json({
      success: true,
      message: "تم حذف الوحدة بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في حذف الوحدة",
      error: error.message,
    });
  }
});

module.exports = router;
