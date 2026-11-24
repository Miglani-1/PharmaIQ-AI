
import express from "express";

import {
  getReviews,
  updateReview,
} from "../controllers/reviewController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All review routes require authentication
router.use(protect);
router.use(requireOrganization);

// View compliance reviews
router.get(
  "/get",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getReviews
);

// Approve or reject compliance analysis
// Only authorized independent reviewers
router.patch(
  "/:analysisId",
  authorize(
    "super_admin",
    "auditor"
  ),
  updateReview
);

export default router;
