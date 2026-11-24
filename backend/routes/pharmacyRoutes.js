
import express from "express";

import {
  createPharmacy,
  getPharmacies,
  getPharmacyById,
  updatePharmacy,
  deactivatePharmacy,
} from "../controllers/pharmacyController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All pharmacy routes require authentication
router.use(protect);
router.use(requireOrganization);

// Create pharmacy - Admin roles only
router.post(
  "/create",
  authorize(
    "super_admin",
    "organization_admin"
  ),
  createPharmacy
);

// Get all accessible pharmacies
router.get(
  "/get",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getPharmacies
);

// Get pharmacy by ID
router.get(
  "/get/:id",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getPharmacyById
);

// Update pharmacy - Admin roles only
router.put(
  "/update/:id",
  authorize(
    "super_admin",
    "organization_admin"
  ),
  updatePharmacy
);

// Deactivate pharmacy - Admin roles only
router.patch(
  "/deactivate/:id",
  authorize(
    "super_admin",
    "organization_admin"
  ),
  deactivatePharmacy
);

export default router;
