
import express from "express";

import {
  createOrganization,
  getOrganizations,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
} from "../controllers/organizationController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All organization routes require authentication
router.use(protect);
router.use(requireOrganization);

// Create organization - Super Admin only
router.post(
  "/create",
  authorize("super_admin"),
  createOrganization
);

// Get organizations - All authorized roles
router.get(
  "/get",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getOrganizations
);

// Get organization by ID
router.get(
  "/get/:id",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getOrganizationById
);

// Update organization - Admin roles only
router.put(
  "/update/:id",
  authorize(
    "super_admin",
    "organization_admin"
  ),
  updateOrganization
);

// Deactivate organization - Super Admin only
router.delete(
  "/delete/:id",
  authorize("super_admin"),
  deleteOrganization
);

export default router;
