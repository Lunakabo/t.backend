const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    questionText: {
      type: String,
      required: [true, "نص السؤال مطلوب"],
      trim: true,
    },
    options: [
      {
        text: {
          type: String,
          required: [true, "نص الاختيار مطلوب"],
        },
        isCorrect: {
          type: Boolean,
          default: false,
        },
      },
    ],
    questionGroup: {
      type: Number,
      required: [true, "مجموعة السؤال مطلوبة - الأسئلة في نفس المجموعة تختبر نفس المفهوم"],
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  {
    timestamps: true,
  }
);

// Validate that at least 2 options exist and exactly one is correct
questionSchema.pre("save", function (next) {
  if (this.options.length < 2) {
    return next(new Error("يجب أن يكون هناك خياران على الأقل"));
  }
  const correctOptions = this.options.filter((opt) => opt.isCorrect);
  if (correctOptions.length !== 1) {
    return next(new Error("يجب أن يكون هناك إجابة صحيحة واحدة بالضبط"));
  }
  next();
});

module.exports = mongoose.model("Question", questionSchema);
