
import express from "express";

import {
  uploadDocument,
  getDocuments,
  getDocumentById,
} from "../controllers/documentController.js";

import {
  protect,
  authorize,
  requireOrganization,
} from "../middleware/authMiddleware.js";

import {
  uploadPDF,
} from "../middleware/uploadMiddleware.js";

const router = express.Router();

// All document routes require authentication
router.use(protect);
router.use(requireOrganization);

// Upload PDF document
// Authorization must run before file upload
router.post(
  "/upload",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist"
  ),
  uploadPDF,
  uploadDocument
);

// Get all accessible documents
router.get(
  "/get",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getDocuments
);

// Get document by ID
router.get(
  "/get/:id",
  authorize(
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor"
  ),
  getDocumentById
);

export default router;
