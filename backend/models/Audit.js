import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    auditDate: {
      type: Date,
      required: true,
    },
    auditor: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed"],
      default: "planned",
    },
    notes: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Audit", auditSchema);