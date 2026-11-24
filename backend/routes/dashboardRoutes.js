
import express from "express";

import {
  getDashboardStats,
} from "../controllers/dashboardController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Authentication and tenant validation
router.use(protect);
router.use(requireOrganization);

// Get role-based dashboard statistics
router.get(
  "/stats",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getDashboardStats
);

export default router;
