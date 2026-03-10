const express = require("express");
const Question = require("../../../../../../../models/Question");
const Module = require("../../../../../../../models/Module");
const Course = require("../../../../../../../models/Course");
const auth = require("../../../../../../../middleware/auth");
const roleCheck = require("../../../../../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);

// ==================== POST /api/courses/:courseId/modules/:moduleId/questions ====================
router.post("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    // Verify course and module exist
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    // Trainers can only add questions to their own courses
    if (
      req.user.role === "trainer" &&
      course.createdBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك إضافة أسئلة لكورس لم تقم بإنشائه",
      });
    }

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

    const { questionText, options, questionGroup, difficulty } = req.body;

    if (!questionText || !options || !questionGroup) {
      return res.status(400).json({
        success: false,
        message: "نص السؤال والخيارات ومجموعة السؤال مطلوبة",
      });
    }

    const question = await Question.create({
      module: module._id,
      questionText,
      options,
      questionGroup,
      difficulty: difficulty || "medium",
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء السؤال بنجاح",
      data: { question },
    });
  } catch (error) {
    if (error.message.includes("خيار") || error.message.includes("إجابة")) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      message: "حدث خطأ في إنشاء السؤال",
      error: error.message,
    });
  }
});

// ==================== GET /api/courses/:courseId/modules/:moduleId/questions ====================
router.get("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const questions = await Question.find({
      module: req.params.moduleId,
    }).sort({ questionGroup: 1 });

    // Group questions by questionGroup for better readability
    const grouped = {};
    questions.forEach((q) => {
      if (!grouped[q.questionGroup]) {
        grouped[q.questionGroup] = [];
      }
      grouped[q.questionGroup].push(q);
    });

    res.status(200).json({
      success: true,
      data: {
        questions,
        groupedQuestions: grouped,
        totalQuestions: questions.length,
        totalGroups: Object.keys(grouped).length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب الأسئلة",
      error: error.message,
    });
  }
});

// ==================== PUT /api/courses/:courseId/modules/:moduleId/questions/:questionId ====================
router.put("/:questionId", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const { questionText, options, questionGroup, difficulty } = req.body;
    const updateData = {};

    if (questionText) updateData.questionText = questionText;
    if (options) updateData.options = options;
    if (questionGroup) updateData.questionGroup = questionGroup;
    if (difficulty) updateData.difficulty = difficulty;

    const question = await Question.findOneAndUpdate(
      { _id: req.params.questionId, module: req.params.moduleId },
      updateData,
      { new: true, runValidators: true }
    );

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "السؤال غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم تحديث السؤال بنجاح",
      data: { question },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تحديث السؤال",
      error: error.message,
    });
  }
});

// ==================== DELETE /api/courses/:courseId/modules/:moduleId/questions/:questionId ====================
router.delete("/:questionId", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({
      _id: req.params.questionId,
      module: req.params.moduleId,
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "السؤال غير موجود",
      });
    }

    res.status(200).json({
      success: true,
      message: "تم حذف السؤال بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في حذف السؤال",
      error: error.message,
    });
  }
});

// ==================== POST /api/courses/:courseId/modules/:moduleId/questions/bulk ====================
// Bulk add questions for convenience
router.post("/bulk", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const { questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "يجب إرسال مصفوفة من الأسئلة",
      });
    }

    const questionsToCreate = questions.map((q) => ({
      ...q,
      module: req.params.moduleId,
    }));

    const createdQuestions = await Question.insertMany(questionsToCreate);

    res.status(201).json({
      success: true,
      message: `تم إنشاء ${createdQuestions.length} سؤال بنجاح`,
      data: { questions: createdQuestions },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في إنشاء الأسئلة",
      error: error.message,
    });
  }
});

module.exports = router;
