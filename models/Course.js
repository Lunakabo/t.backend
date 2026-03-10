const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "عنوان الكورس مطلوب"],
      trim: true,
      minlength: [3, "العنوان يجب أن يكون 3 أحرف على الأقل"],
      maxlength: [200, "العنوان يجب ألا يتجاوز 200 حرف"],
    },
    description: {
      type: String,
      required: [true, "وصف الكورس مطلوب"],
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Module",
      },
    ],
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    category: {
      type: String,
      trim: true,
      default: "عام",
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Course", courseSchema);
