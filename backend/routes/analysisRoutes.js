
import express from "express";

import {
  analyzeDocument,
  getAnalyses,
} from "../controllers/analysisController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All analysis routes require authentication
router.use(protect);
router.use(requireOrganization);

// Run AI compliance analysis
router.post(
  "/analyze/:documentId",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist"
  ),
  analyzeDocument
);

// Get all accessible compliance analyses
router.get(
  "/get",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getAnalyses
);

export default router;
