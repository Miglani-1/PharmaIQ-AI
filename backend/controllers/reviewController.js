
import ComplianceAnalysis from "../models/ComplianceAnalysis.js";

import {
  isValidId,
  getAnalysisFilter,
} from "../services/tenantService.js";

const REVIEW_ROLES = [
  "super_admin",
  "auditor",
];

const REVIEW_STATUSES = [
  "approved",
  "rejected",
];

// ==========================================
// ERROR HANDLER
// ==========================================

const handleError = (res, error, message) => {
  console.error(message, error.message);

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.status
      ? error.message
      : message,
  });
};

// ==========================================
// GET ALL ACCESSIBLE REVIEWS
// ==========================================

export const getReviews = async (req, res) => {
  try {
    // Retrieve analyses within authorized tenants
    const filter = await getAnalysisFilter(req);

    const analyses = await ComplianceAnalysis.find(
      filter
    )
      .populate(
        "document",
        "documentName documentType"
      )
      .populate(
        "analyzedBy",
        "name"
      )
      .populate(
        "reviewedBy",
        "name email"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      analyses,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve compliance reviews."
    );
  }
};

// ==========================================
// UPDATE HUMAN REVIEW
// ==========================================

export const updateReview = async (req, res) => {
  try {
    // Verify reviewer permissions
    if (!REVIEW_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to review compliance analyses.",
      });
    }

    const { analysisId } = req.params;

    const {
      reviewStatus,
      reviewComments,
    } = req.body || {};

    // Validate analysis ID
    if (!isValidId(analysisId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid analysis ID.",
      });
    }

    // Validate review decision
    if (!REVIEW_STATUSES.includes(reviewStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "Review status must be approved or rejected.",
      });
    }

    // Review comments are mandatory
    if (
      typeof reviewComments !== "string" ||
      !reviewComments.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Review comments are required.",
      });
    }

    const cleanComments = reviewComments.trim();

    if (cleanComments.length > 5000) {
      return res.status(400).json({
        success: false,
        message:
          "Review comments must not exceed 5000 characters.",
      });
    }

    // ==========================================
    // TENANT ISOLATION
    // ==========================================

    const filter = await getAnalysisFilter(req);

    const analysis =
      await ComplianceAnalysis.findOne({
        $and: [
          { _id: analysisId },
          filter,
        ],
      });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Compliance analysis not found.",
      });
    }

    // ==========================================
    // INDEPENDENT HUMAN REVIEW
    // ==========================================

    // Prevent users from reviewing their own analysis
    if (
      String(analysis.analyzedBy) ===
      String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot review an analysis that you generated. An independent reviewer is required.",
      });
    }

    // Prevent modification of completed reviews
    if (analysis.reviewStatus !== "pending") {
      return res.status(409).json({
        success: false,
        message:
          "This analysis has already been reviewed.",
      });
    }

    // ==========================================
    // ATOMIC REVIEW UPDATE
    // ==========================================

    const updatedAnalysis =
      await ComplianceAnalysis.findOneAndUpdate(
        {
          $and: [
            {
              _id: analysisId,
              reviewStatus: "pending",
              analyzedBy: {
                $ne: req.user._id,
              },
            },
            filter,
          ],
        },
        {
          $set: {
            reviewStatus,
            reviewComments: cleanComments,
            reviewedBy: req.user._id,
            reviewedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      )
        .populate(
          "document",
          "documentName documentType"
        )
        .populate(
          "analyzedBy",
          "name"
        )
        .populate(
          "reviewedBy",
          "name email"
        );

    // Handle simultaneous review requests
    if (!updatedAnalysis) {
      return res.status(409).json({
        success: false,
        message:
          "The review could not be completed. Refresh the page and check the latest review status.",
      });
    }

    return res.status(200).json({
      success: true,

      message:
        reviewStatus === "approved"
          ? "Compliance analysis approved successfully."
          : "Compliance analysis rejected successfully.",

      analysis: updatedAnalysis,

      disclaimer:
        "Human review approval represents an internal assessment and does not constitute regulatory certification.",
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update compliance review."
    );
  }
};
