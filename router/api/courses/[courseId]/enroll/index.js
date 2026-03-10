const express = require("express");
const Course = require("../../../../../models/Course");
const User = require("../../../../../models/User");
const auth = require("../../../../../middleware/auth");
const roleCheck = require("../../../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

router.use(auth);

// ==================== POST /api/courses/:courseId/enroll ====================
router.post("/", roleCheck("student"), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "الكورس غير موجود",
      });
    }

    if (!course.isPublished) {
      return res.status(400).json({
        success: false,
        message: "لا يمكن التسجيل في كورس غير منشور",
      });
    }

    // Check if already enrolled
    const isEnrolled = course.students.includes(req.user._id);
    if (isEnrolled) {
      return res.status(400).json({
        success: false,
        message: "أنت مسجل بالفعل في هذا الكورس",
      });
    }

    // Add student to course
    course.students.push(req.user._id);
    await course.save();

    // Add course to user's enrolled courses
    const user = await User.findById(req.user._id);
    user.enrolledCourses.push({
      course: course._id,
      enrolledAt: new Date(),
      progress: 0,
    });
    await user.save();

    res.status(200).json({
      success: true,
      message: "تم التسجيل في الكورس بنجاح",
      data: {
        courseId: course._id,
        courseTitle: course.title,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في التسجيل",
      error: error.message,
    });
  }
});

module.exports = router;
