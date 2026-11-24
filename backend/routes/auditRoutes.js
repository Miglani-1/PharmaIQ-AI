
import express from "express";

import {
  createAudit,
  getAudits,
  updateAuditStatus,
} from "../controllers/auditController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All audit routes require authentication
router.use(protect);
router.use(requireOrganization);

// Create audit
router.post(
  "/create",
  authorize(
    "super_admin",
    "organization_admin",
    "auditor"
  ),
  createAudit
);

// Get all accessible audits
router.get(
  "/get",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getAudits
);

// Update audit status
router.patch(
  "/:id/status",
  authorize(
    "super_admin",
    "organization_admin",
    "auditor"
  ),
  updateAuditStatus
);

export default router;
