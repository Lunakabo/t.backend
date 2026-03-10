const express = require("express");
const Group = require("../../../models/Group");
const User = require("../../../models/User");
const auth = require("../../../middleware/auth");

const router = express.Router({ mergeParams: true });

// ==================== POST /api/groups ====================
router.post("/", auth, async (req, res) => {
  try {
    const { name, description, icon, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "اسم المجموعة مطلوب",
      });
    }

    const group = await Group.create({
      name,
      description,
      icon: icon || "🏆",
      isPublic: isPublic !== false,
      owner: req.user._id,
      members: [req.user._id],
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المجموعة بنجاح",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في إنشاء المجموعة",
      error: error.message,
    });
  }
});

// ==================== POST /api/groups/join/code ====================
router.post("/join/code", auth, async (req, res) => {
  try {
    const { inviteCode } = req.body;

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "رمز الدعوة غير صالح",
      });
    }

    if (group.members.includes(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: "أنت عضو في هذه المجموعة بالفعل",
      });
    }

    group.members.push(req.user._id);
    await group.save();

    res.status(200).json({
      success: true,
      message: "تم الانضمام للمجموعة بنجاح",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في الانضمام",
      error: error.message,
    });
  }
});

// ==================== POST /api/groups/join/username ====================
router.post("/join/username", auth, async (req, res) => {
  try {
    const { username, groupId } = req.body;

    const userToAdd = await User.findOne({ username });
    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: "المستخدم غير موجود",
      });
    }

    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "المجموعة غير موجودة",
      });
    }

    // Only owner can add members by username
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "فقط مالك المجموعة يمكنه إضافة أعضاء",
      });
    }

    if (group.members.includes(userToAdd._id)) {
      return res.status(400).json({
        success: false,
        message: "المستخدم عضو في المجموعة بالفعل",
      });
    }

    group.members.push(userToAdd._id);
    await group.save();

    res.status(200).json({
      success: true,
      message: "تم إضافة المستخدم بنجاح",
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ",
      error: error.message,
    });
  }
});

// ==================== GET /api/groups/my ====================
router.get("/my", auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("members", "name username avatar points")
      .populate("owner", "name username");

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في جلب المجموعات",
      error: error.message,
    });
  }
});

// ==================== GET /api/groups/search ====================
router.get("/search", auth, async (req, res) => {
  try {
    const { q } = req.query;
    const query = { isPublic: true };

    if (q) {
      query.name = { $regex: q, $options: "i" };
    }

    const groups = await Group.find(query)
      .populate("members", "name username")
      .populate("owner", "name username")
      .limit(20);

    res.status(200).json({
      success: true,
      data: groups,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ في البحث",
      error: error.message,
    });
  }
});

// ==================== GET /api/groups/:id ====================
router.get("/:id", auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate("members", "name username avatar points level")
      .populate("owner", "name username");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "المجموعة غير موجودة",
      });
    }

    res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "حدث خطأ",
      error: error.message,
    });
  }
});

module.exports = router;
