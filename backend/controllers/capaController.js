
import CAPA from "../models/CAPA.js";

import {
  isValidId,
  getCAPAFilter,
  findAccessibleAudit,
} from "../services/tenantService.js";

const CAPA_ROLES = [
  "super_admin",
  "organization_admin",
  "pharmacist",
  "auditor",
];

const CAPA_STATUSES = [
  "open",
  "in_progress",
  "completed",
];

const CAPA_PRIORITIES = [
  "low",
  "medium",
  "high",
];

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
    message: error.status
      ? error.message
      : message,
  });
};

// ==========================================
// CREATE CAPA
// ==========================================

export const createCAPA = async (req, res) => {
  try {
    // Verify role permissions
    if (!CAPA_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create CAPAs.",
      });
    }

    const {
      audit,
      title,
      description,
      assignedTo,
      dueDate,
      priority = "medium",
    } = req.body || {};

    // Validate required fields
    const requiredFields = [
      audit,
      title,
      description,
      assignedTo,
      dueDate,
    ];

    if (
      requiredFields.some(
        (value) =>
          typeof value !== "string" ||
          !value.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "All CAPA fields are required.",
      });
    }

    // Validate audit ID
    if (!isValidId(audit)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit ID.",
      });
    }

    // Validate title
    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "CAPA title must not exceed 200 characters.",
      });
    }

    // Validate description
    if (description.trim().length > 10000) {
      return res.status(400).json({
        success: false,
        message:
          "Description must not exceed 10000 characters.",
      });
    }

    // Validate assigned person
    if (assignedTo.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message:
          "Assigned person name must not exceed 150 characters.",
      });
    }

    // Validate priority
    if (!CAPA_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message:
          "Priority must be low, medium or high.",
      });
    }

    // Validate due date
    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid CAPA due date.",
      });
    }

    // ==========================================
    // TENANT ISOLATION
    // ==========================================

    const accessibleAudit =
      await findAccessibleAudit(req, audit);

    if (!accessibleAudit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found.",
      });
    }

    // ==========================================
    // SAVE CAPA
    // ==========================================

    const capa = await CAPA.create({
      audit: accessibleAudit._id,

      title: title.trim(),

      description: description.trim(),

      assignedTo: assignedTo.trim(),

      dueDate: parsedDueDate,

      priority,

      status: "open",

      createdBy: req.user._id,
    });

    await capa.populate(
      "audit",
      "title auditDate status"
    );

    return res.status(201).json({
      success: true,
      message: "CAPA created successfully.",
      capa,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to create CAPA."
    );
  }
};

// ==========================================
// GET ALL ACCESSIBLE CAPAS
// ==========================================

export const getCAPAs = async (req, res) => {
  try {
    // Retrieve only tenant-accessible CAPAs
    const filter = await getCAPAFilter(req);

    const capas = await CAPA.find(filter)
      .populate(
        "audit",
        "title auditDate status"
      )
      .populate(
        "createdBy",
        "name"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      capas,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve CAPAs."
    );
  }
};

// ==========================================
// UPDATE CAPA STATUS
// ==========================================

export const updateCAPAStatus = async (req, res) => {
  try {
    // Verify role permissions
    if (!CAPA_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update CAPAs.",
      });
    }

    const { id } = req.params;
    const { status } = req.body || {};

    // Validate CAPA ID
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid CAPA ID.",
      });
    }

    // Validate CAPA status
    if (!CAPA_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "CAPA status must be open, in_progress or completed.",
      });
    }

    // ==========================================
    // TENANT-SCOPED ATOMIC UPDATE
    // ==========================================

    const filter = await getCAPAFilter(req);

    const capa = await CAPA.findOneAndUpdate(
      {
        $and: [
          { _id: id },
          filter,
        ],
      },
      {
        $set: {
          status,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        "audit",
        "title auditDate status"
      )
      .populate(
        "createdBy",
        "name"
      );

    if (!capa) {
      return res.status(404).json({
        success: false,
        message: "CAPA not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "CAPA status updated successfully.",
      capa,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update CAPA status."
    );
  }
};
