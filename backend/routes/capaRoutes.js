
import express from "express";

import {
  createCAPA,
  getCAPAs,
  updateCAPAStatus,
} from "../controllers/capaController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All CAPA routes require authentication
router.use(protect);
router.use(requireOrganization);

// Allowed CAPA management roles
const CAPA_ROLES = [
  "super_admin",
  "organization_admin",
  "pharmacist",
  "auditor",
];

// Create CAPA
router.post(
  "/create",
  authorize(...CAPA_ROLES),
  createCAPA
);

// Get all accessible CAPAs
router.get(
  "/get",
  authorize(...CAPA_ROLES),
  getCAPAs
);

// Update CAPA status
router.patch(
  "/:id/status",
  authorize(...CAPA_ROLES),
  updateCAPAStatus
);

export default router;
