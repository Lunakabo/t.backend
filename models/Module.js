const mongoose = require("mongoose");

const moduleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "عنوان الوحدة مطلوب"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    content: {
      type: String,
      required: [true, "محتوى الوحدة مطلوب"],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    passingScore: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },
    questionsPerQuiz: {
      type: Number,
      default: 5,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Module", moduleSchema);
