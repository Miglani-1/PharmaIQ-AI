
import express from "express";

import {
  downloadComplianceReport,
} from "../controllers/reportController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Authentication and tenant validation
router.use(protect);
router.use(requireOrganization);

// Download tenant-specific compliance report
router.get(
  "/:analysisId/download",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  downloadComplianceReport
);

export default router;
