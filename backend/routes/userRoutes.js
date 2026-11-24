
import express from "express";

import {
  getUsers,
  createUser,
  updateUser,
} from "../controllers/userController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Authentication and tenant validation
router.use(protect);
router.use(requireOrganization);

// Only administrators can manage users
router.use(
  authorize(
    "super_admin",
    "organization_admin"
  )
);

// ==========================================
// GET USERS
// ==========================================

router.get(
  "/get",
  getUsers
);

// ==========================================
// CREATE USER
// ==========================================

router.post(
  "/create",
  createUser
);

// ==========================================
// UPDATE USER ACCESS
// ==========================================

router.patch(
  "/:id",
  updateUser
);

export default router;
