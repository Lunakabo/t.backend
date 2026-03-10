const mongoose = require("mongoose");

const quizAttemptSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    questions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question",
      },
    ],
    answers: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
        selectedOption: {
          type: Number,
          required: true,
        },
        isCorrect: {
          type: Boolean,
          required: true,
        },
      },
    ],
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    passed: {
      type: Boolean,
      required: true,
    },
    totalQuestions: {
      type: Number,
      required: true,
    },
    correctAnswers: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
quizAttemptSchema.index({ student: 1, module: 1, attemptNumber: -1 });

module.exports = mongoose.model("QuizAttempt", quizAttemptSchema);
