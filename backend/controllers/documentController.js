
import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";

import Document from "../models/Document.js";

import {
  isValidId,
  getDocumentFilter,
  findAccessiblePharmacy,
  findAccessibleDocument,
} from "../services/tenantService.js";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARACTERS = 200000;

const DOCUMENT_TYPES = [
  "license",
  "inspection",
  "sop",
  "quality",
  "other",
];

const UPLOAD_ROLES = [
  "super_admin",
  "organization_admin",
  "pharmacist",
];

// ==========================================
// DELETE TEMPORARY UPLOADED FILE
// ==========================================

const deleteUploadedFile = async (file) => {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "File cleanup error:",
        error.message
      );
    }
  }
};

// ==========================================
// ERROR HANDLER
// ==========================================

const handleError = (res, error, message) => {
  console.error(message, error.message);

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : message,
  });
};

// ==========================================
// UPLOAD DOCUMENT
// ==========================================

export const uploadDocument = async (req, res) => {
  let documentSaved = false;

  try {
    if (!UPLOAD_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to upload documents.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF document.",
      });
    }

    const {
      pharmacyId,
      documentName,
      documentType = "other",
    } = req.body || {};

    // Validate document name
    if (
      typeof documentName !== "string" ||
      !documentName.trim() ||
      documentName.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Document name is required and must not exceed 150 characters.",
      });
    }

    // Validate document type
    if (!DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type.",
      });
    }

    // Validate pharmacy ID
    if (
      typeof pharmacyId !== "string" ||
      !isValidId(pharmacyId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pharmacy ID.",
      });
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(413).json({
        success: false,
        message: "PDF must be 10MB or smaller.",
      });
    }

    // Verify tenant access before reading PDF
    const pharmacy = await findAccessiblePharmacy(
      req,
      pharmacyId
    );

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found.",
      });
    }

    if (pharmacy.status === "inactive") {
      return res.status(400).json({
        success: false,
        message:
          "Documents cannot be uploaded to an inactive pharmacy.",
      });
    }

    // Read uploaded PDF
    const buffer = await fs.readFile(req.file.path);

    // Validate actual PDF file signature
    const signature = buffer
      .subarray(0, 5)
      .toString("ascii");

    if (signature !== "%PDF-") {
      return res.status(400).json({
        success: false,
        message: "The uploaded file is not a valid PDF.",
      });
    }

    let extractedText = "";
    let extractionStatus = "failed";
    let parser = null;

    // ==========================================
    // PDF TEXT EXTRACTION
    // ==========================================

    try {
      parser = new PDFParse({
        data: buffer,
      });

      const result = await parser.getText();

      extractedText = String(result.text || "")
        .trim()
        .slice(0, MAX_EXTRACTED_CHARACTERS);

      extractionStatus = extractedText
        ? "completed"
        : "needs_ocr";
    } catch (error) {
      console.error(
        "PDF extraction error:",
        error.message
      );

      extractionStatus = "failed";
      extractedText = "";
    } finally {
      if (parser) {
        try {
          await parser.destroy();
        } catch (error) {
          console.error(
            "PDF parser cleanup error:",
            error.message
          );
        }
      }
    }

    // ==========================================
    // SAVE DOCUMENT
    // ==========================================

    const document = await Document.create({
      pharmacy: pharmacy._id,
      uploadedBy: req.user._id,

      documentName: documentName.trim(),
      documentType,

      fileName: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,

      extractedText,
      extractionStatus,
      analysisStatus: "pending",
    });

    documentSaved = true;

    let message = "Document uploaded successfully.";

    if (extractionStatus === "needs_ocr") {
      message =
        "Document uploaded successfully. OCR is required for text extraction.";
    }

    if (extractionStatus === "failed") {
      message =
        "Document uploaded, but text extraction failed.";
    }

    return res.status(201).json({
      success: true,
      message,

      document: {
        id: document._id,
        documentName: document.documentName,
        documentType: document.documentType,
        extractionStatus: document.extractionStatus,
        analysisStatus: document.analysisStatus,
        extractedCharacters: extractedText.length,
        textPreview: extractedText.slice(0, 500),
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to upload document."
    );
  } finally {
    // Remove rejected uploads and files
    // that were not successfully saved.
    if (!documentSaved) {
      await deleteUploadedFile(req.file);
    }
  }
};

// ==========================================
// GET ALL ACCESSIBLE DOCUMENTS
// ==========================================

export const getDocuments = async (req, res) => {
  try {
    const filter = await getDocumentFilter(req);

    const documents = await Document.find(filter)
      .select("-filePath -extractedText")
      .populate(
        "pharmacy",
        "pharmacyName"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      documents,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve documents."
    );
  }
};

// ==========================================
// GET DOCUMENT BY ID
// ==========================================

export const getDocumentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    // Tenant-scoped document retrieval
    const document = await findAccessibleDocument(
      req,
      id,
      true
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    await document.populate(
      "pharmacy",
      "pharmacyName organization"
    );

    const safeDocument = document.toObject();

    // Never expose internal storage paths
    delete safeDocument.filePath;

    return res.status(200).json({
      success: true,
      document: safeDocument,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve document."
    );
  }
};
