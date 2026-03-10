const express = require("express");
const Course = require("../../../models/Course");
const auth = require("../../../middleware/auth");
const roleCheck = require("../../../middleware/roleCheck");

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(auth);

// ==================== POST /api/courses ====================
router.post("/", roleCheck("admin", "trainer"), async (req, res) => {
  try {
    const { title, description, category, difficulty, isPublished } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "عنوان ووصف الكورس مطلوبان",
      });
    }

    const course = await Course.create({
      title,
      description,
      category,
      difficulty,
      isPublished: isPublished || false,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء الكورس بنجاح",
      data: { course },
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
      message: "حدث خطأ في إنشاء الكورس",
      error: error.message,
    });
  }
});

// ==================== GET /api/courses ====================
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, category, difficulty, search } = req.query;
    const query = {};

    // Students only see published courses
    if (req.user.role === "student") {
      query.isPublished = true;
    }

    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const courses = await Course.find(query)
      .populate("createdBy", "name email")
      .populate("modules", "title order")
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        courses,
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
      message: "حدث خطأ في جلب الكورسات",
      error: error.message,
    });
  }
});

module.exports = router;
