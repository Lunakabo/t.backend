const express = require("express");
const Course = require("../../../models/Course");
const Module = require("../../../models/Module");
const Question = require("../../../models/Question");
const auth = require("../../../middleware/auth");

const router = express.Router({ mergeParams: true });

// ==================== GET /api/roadmaps ====================
// Returns courses in "roadmap" format that the frontend expects
router.get("/", async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .populate({
        path: "modules",
        options: { sort: { order: 1 } },
      })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });

    // Transform courses to roadmap format
    const roadmaps = await Promise.all(
      courses.map(async (course) => {
        // Get questions for each module
        const steps = await Promise.all(
          course.modules.map(async (mod) => {
            const questions = await Question.find({ module: mod._id });

            // Transform questions to quiz format the frontend expects
            const quiz = questions.map((q) => ({
              _id: q._id,
              question: q.questionText,
              options: q.options.map((opt) => opt.text),
              correct: q.options.findIndex((opt) => opt.isCorrect),
              questionGroup: q.questionGroup,
            }));

            return {
              id: mod._id.toString(),
              order: mod.order,
              title: mod.title,
              description: mod.description || mod.content.substring(0, 200),
              resources: [],
              quiz,
            };
          })
        );

        return {
          id: course._id.toString(),
          title: course.title,
          titleEn: course.title,
          description: course.description,
          icon: getCourseIcon(course.category),
          color: getCourseColor(course.category),
          colorSecondary: getCourseColorSecondary(course.category),
          gradient: `linear-gradient(135deg, ${getCourseColor(course.category)}, ${getCourseColorSecondary(course.category)})`,
          steps,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: roadmaps,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب المسارات",
      error: error.message,
    });
  }
});

// ==================== GET /api/roadmaps/:id ====================
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate({
        path: "modules",
        options: { sort: { order: 1 } },
      })
      .populate("createdBy", "name");

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "المسار غير موجود",
      });
    }

    // Get questions for each module
    const steps = await Promise.all(
      course.modules.map(async (mod) => {
        const questions = await Question.find({ module: mod._id });

        const quiz = questions.map((q) => ({
          _id: q._id,
          question: q.questionText,
          options: q.options.map((opt) => opt.text),
          correct: q.options.findIndex((opt) => opt.isCorrect),
          questionGroup: q.questionGroup,
        }));

        return {
          id: mod._id.toString(),
          order: mod.order,
          title: mod.title,
          description: mod.description || mod.content.substring(0, 200),
          content: mod.content,
          resources: [],
          quiz,
          passingScore: mod.passingScore,
        };
      })
    );

    const roadmap = {
      id: course._id.toString(),
      title: course.title,
      titleEn: course.title,
      description: course.description,
      icon: getCourseIcon(course.category),
      color: getCourseColor(course.category),
      colorSecondary: getCourseColorSecondary(course.category),
      gradient: `linear-gradient(135deg, ${getCourseColor(course.category)}, ${getCourseColorSecondary(course.category)})`,
      steps,
    };

    res.status(200).json({
      success: true,
      data: roadmap,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ",
      error: error.message,
    });
  }
});

// Helper functions for roadmap styling
function getCourseIcon(category) {
  const icons = {
    "برمجة": "💻",
    "رياضيات": "📐",
    "لغات": "🌐",
    "علوم": "🔬",
    "عام": "📚",
  };
  return icons[category] || "📚";
}

function getCourseColor(category) {
  const colors = {
    "برمجة": "#6c5ce7",
    "رياضيات": "#00cec9",
    "لغات": "#fdcb6e",
    "علوم": "#e17055",
    "عام": "#0984e3",
  };
  return colors[category] || "#6c5ce7";
}

function getCourseColorSecondary(category) {
  const colors = {
    "برمجة": "#a29bfe",
    "رياضيات": "#55efc4",
    "لغات": "#ffeaa7",
    "علوم": "#fab1a0",
    "عام": "#74b9ff",
  };
  return colors[category] || "#a29bfe";
}

module.exports = router;
