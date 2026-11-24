
import mongoose from "mongoose";

const findingSchema = new mongoose.Schema({
  title: String,
  severity: {
    type: String,
    enum: ["low", "medium", "high", "unknown"],
    default: "unknown",
  },
  status: {
    type: String,
    enum: ["potential_gap", "not_verified", "observation"],
    default: "observation",
  },
  evidence: String,
  recommendation: String,
  ruleReference: String,
});

const analysisSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    analyzedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    summary: String,

    riskLevel: {
      type: String,
      enum: ["low", "medium", "high", "unknown"],
      default: "unknown",
    },

    findings: [findingSchema],

    modelUsed: String,

    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "reviewed"],
      default: "pending",
    },

    reviewComments: {
      type: String,
      default: "",
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("ComplianceAnalysis", analysisSchema);
