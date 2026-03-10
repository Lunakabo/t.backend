const express = require("express");
const Question = require("../../../../../../../models/Question");
const Module = require("../../../../../../../models/Module");
const Course = require("../../../../../../../models/Course");
const QuizAttempt = require("../../../../../../../models/QuizAttempt");
const auth = require("../../../../../../../middleware/auth");
const roleCheck = require("../../../../../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);

/**
 * Smart Question Selection Algorithm
 * -----------------------------------
 * 1. Get all questions for this module, grouped by questionGroup
 * 2. Check student's last failed attempt (if any)
 * 3. For each questionGroup, pick a question that was NOT used in the last failed attempt
 * 4. If all questions in a group were already used, reset and pick randomly
 * 5. This ensures students see different questions when they retry after failing
 */
async function selectQuestionsForQuiz(moduleId, studentId, questionsPerQuiz) {
  // Get all questions for this module
  const allQuestions = await Question.find({ module: moduleId });

  if (allQuestions.length === 0) {
    return { questions: [], error: "لا توجد أسئلة في هذه الوحدة" };
  }

  // Group questions by questionGroup
  const questionGroups = {};
  allQuestions.forEach((q) => {
    if (!questionGroups[q.questionGroup]) {
      questionGroups[q.questionGroup] = [];
    }
    questionGroups[q.questionGroup].push(q);
  });

  const groupKeys = Object.keys(questionGroups);

  // Get the student's last failed attempt for this module
  const lastFailedAttempt = await QuizAttempt.findOne({
    student: studentId,
    module: moduleId,
    passed: false,
  }).sort({ createdAt: -1 });

  // Get IDs of questions used in the last failed attempt
  const previousQuestionIds = lastFailedAttempt
    ? lastFailedAttempt.questions.map((id) => id.toString())
    : [];

  // Count how many consecutive failures (for tracking)
  const failedAttempts = await QuizAttempt.countDocuments({
    student: studentId,
    module: moduleId,
    passed: false,
  });

  // Select one question per group, avoiding previously used questions
  const selectedQuestions = [];

  for (const groupKey of groupKeys) {
    const groupQuestions = questionGroups[groupKey];

    // Filter out questions used in the last failed attempt
    let availableQuestions = groupQuestions.filter(
      (q) => !previousQuestionIds.includes(q._id.toString())
    );

    // If no unused questions available in this group, reset and use all
    if (availableQuestions.length === 0) {
      availableQuestions = groupQuestions;
    }

    // Randomly select one question from available pool
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    selectedQuestions.push(availableQuestions[randomIndex]);
  }

  // If we have more groups than questionsPerQuiz, randomly sample
  let finalQuestions = selectedQuestions;
  if (selectedQuestions.length > questionsPerQuiz) {
    finalQuestions = [];
    const shuffled = selectedQuestions.sort(() => 0.5 - Math.random());
    finalQuestions = shuffled.slice(0, questionsPerQuiz);
  }

  return {
    questions: finalQuestions,
    attemptNumber: failedAttempts + 1,
    previousFailures: failedAttempts,
    error: null,
  };
}

// ==================== POST /api/courses/:courseId/modules/:moduleId/quiz/start ====================
router.post("/start", roleCheck("student"), async (req, res) => {
  try {
    // Verify course and enrollment
    const course = await Course.findById(req.params.courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    if (!course.students.includes(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "يجب أن تكون مسجلاً في الكورس أولاً",
      });
    }

    // Verify module exists
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

    // Check if student already passed this module
    const passedAttempt = await QuizAttempt.findOne({
      student: req.user._id,
      module: module._id,
      passed: true,
    });

    if (passedAttempt) {
      return res.status(200).json({
        success: true,
        message: "لقد اجتزت هذه الوحدة بالفعل!",
        data: {
          alreadyPassed: true,
          score: passedAttempt.score,
          attemptNumber: passedAttempt.attemptNumber,
        },
      });
    }

    // Select questions using smart rotation
    const result = await selectQuestionsForQuiz(
      module._id,
      req.user._id,
      module.questionsPerQuiz
    );

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Return questions WITHOUT correct answers
    const questionsForStudent = result.questions.map((q) => ({
      _id: q._id,
      questionText: q.questionText,
      options: q.options.map((opt, index) => ({
        index,
        text: opt.text,
      })),
      questionGroup: q.questionGroup,
    }));

    res.status(200).json({
      success: true,
      message:
        result.previousFailures > 0
          ? `محاولة رقم ${result.attemptNumber} - أسئلة جديدة!`
          : "بدء الاختبار",
      data: {
        moduleTitle: module.title,
        passingScore: module.passingScore,
        totalQuestions: questionsForStudent.length,
        attemptNumber: result.attemptNumber,
        previousFailures: result.previousFailures,
        questions: questionsForStudent,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في بدء الاختبار",
      error: error.message,
    });
  }
});

// ==================== POST /api/courses/:courseId/modules/:moduleId/quiz/submit ====================
router.post("/submit", roleCheck("student"), async (req, res) => {
  try {
    const { answers } = req.body;
    // answers format: [{ questionId: "...", selectedOption: 0 }, ...]

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "يجب إرسال الإجابات",
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

    // Check if already passed
    const passedAttempt = await QuizAttempt.findOne({
      student: req.user._id,
      module: module._id,
      passed: true,
    });

    if (passedAttempt) {
      return res.status(400).json({
        success: false,
        message: "لقد اجتزت هذه الوحدة بالفعل",
      });
    }

    // Get the questions and check answers
    const questionIds = answers.map((a) => a.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "الأسئلة غير موجودة",
      });
    }

    // Grade the quiz
    let correctCount = 0;
    const gradedAnswers = answers.map((answer) => {
      const question = questions.find(
        (q) => q._id.toString() === answer.questionId
      );

      if (!question) {
        return {
          question: answer.questionId,
          selectedOption: answer.selectedOption,
          isCorrect: false,
        };
      }

      const isCorrect =
        question.options[answer.selectedOption]?.isCorrect === true;
      if (isCorrect) correctCount++;

      return {
        question: question._id,
        selectedOption: answer.selectedOption,
        isCorrect,
      };
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= module.passingScore;

    // Count previous attempts
    const previousAttempts = await QuizAttempt.countDocuments({
      student: req.user._id,
      module: module._id,
    });

    // Save the attempt
    const quizAttempt = await QuizAttempt.create({
      student: req.user._id,
      module: module._id,
      course: req.params.courseId,
      attemptNumber: previousAttempts + 1,
      questions: questionIds,
      answers: gradedAnswers,
      score,
      passed,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
    });

    // If passed, update student progress
    if (passed) {
      const course = await Course.findById(req.params.courseId);
      const totalModules = course.modules.length;

      // Count how many modules the student has passed
      const passedModules = await QuizAttempt.distinct("module", {
        student: req.user._id,
        course: req.params.courseId,
        passed: true,
      });

      const progress = Math.round(
        ((passedModules.length) / totalModules) * 100
      );

      // Update user's enrolled course progress
      const User = require("../../../../../../../models/User");
      await User.updateOne(
        {
          _id: req.user._id,
          "enrolledCourses.course": req.params.courseId,
        },
        {
          $set: { "enrolledCourses.$.progress": progress },
        }
      );
    }

    // Build response
    const responseData = {
      score,
      passed,
      correctAnswers: correctCount,
      totalQuestions: questions.length,
      passingScore: module.passingScore,
      attemptNumber: previousAttempts + 1,
      details: gradedAnswers.map((a, index) => ({
        questionId: a.question,
        yourAnswer: a.selectedOption,
        isCorrect: a.isCorrect,
      })),
    };

    if (!passed) {
      // Count total failed attempts
      const totalFails = await QuizAttempt.countDocuments({
        student: req.user._id,
        module: module._id,
        passed: false,
      });

      responseData.message = `رسبت (${score}%). لديك ${totalFails} محاولات فاشلة. عند الإعادة ستظهر لك أسئلة مختلفة!`;
      responseData.totalFailedAttempts = totalFails;
    } else {
      responseData.message = `مبروك! اجتزت الاختبار بنجاح بنتيجة ${score}%`;
    }

    res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في تسليم الاختبار",
      error: error.message,
    });
  }
});

// ==================== GET /api/courses/:courseId/modules/:moduleId/quiz/attempts ====================
router.get("/attempts", roleCheck("student"), async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({
      student: req.user._id,
      module: req.params.moduleId,
      course: req.params.courseId,
    })
      .sort({ createdAt: -1 })
      .populate("questions", "questionText questionGroup");

    res.status(200).json({
      success: true,
      data: {
        attempts,
        totalAttempts: attempts.length,
        passed: attempts.some((a) => a.passed),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب المحاولات",
      error: error.message,
    });
  }
});

module.exports = router;
