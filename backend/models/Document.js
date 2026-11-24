import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    pharmacy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pharmacy",
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentName: {
      type: String,
      required: true,
    },
    documentType: {
      type: String,
      enum: [
        "license",
        "inspection",
        "sop",
        "quality",
        "other",
      ],
      default: "other",
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
      select: false,
    },
    fileSize: Number,
    extractedText: {
      type: String,
      default: "",
      select: false,
    },
    extractionStatus: {
      type: String,
      enum: ["completed", "needs_ocr", "failed"],
      default: "failed",
    },
    analysisStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);