
import Audit from "../models/Audit.js";
import Organization from "../models/Organization.js";

import {
  isValidId,
  getAuditFilter,
  findAccessiblePharmacy,
} from "../services/tenantService.js";

const AUDIT_ROLES = [
  "super_admin",
  "organization_admin",
  "auditor",
];

const AUDIT_STATUSES = [
  "planned",
  "in_progress",
  "completed",
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
// CREATE AUDIT
// ==========================================

export const createAudit = async (req, res) => {
  try {
    // Verify role permissions
    if (!AUDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create audits.",
      });
    }

    const {
      pharmacy,
      title,
      auditDate,
      auditor,
      notes = "",
    } = req.body || {};

    // Validate required fields
    const requiredFields = [
      pharmacy,
      title,
      auditDate,
      auditor,
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
        message:
          "Pharmacy, title, audit date and auditor are required.",
      });
    }

    if (!isValidId(pharmacy)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pharmacy ID.",
      });
    }

    if (title.trim().length > 200) {
      return res.status(400).json({
        success: false,
        message:
          "Audit title must not exceed 200 characters.",
      });
    }

    if (auditor.trim().length > 150) {
      return res.status(400).json({
        success: false,
        message:
          "Auditor name must not exceed 150 characters.",
      });
    }

    if (
      typeof notes !== "string" ||
      notes.length > 5000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Audit notes must be text and must not exceed 5000 characters.",
      });
    }

    const parsedAuditDate = new Date(auditDate);

    if (Number.isNaN(parsedAuditDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit date.",
      });
    }

    // ==========================================
    // TENANT ISOLATION
    // ==========================================

    const accessiblePharmacy =
      await findAccessiblePharmacy(
        req,
        pharmacy
      );

    if (!accessiblePharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found.",
      });
    }

    if (accessiblePharmacy.status === "inactive") {
      return res.status(400).json({
        success: false,
        message:
          "Cannot create an audit for an inactive pharmacy.",
      });
    }

    const activeOrganization =
      await Organization.exists({
        _id: accessiblePharmacy.organization,
        isActive: true,
      });

    if (!activeOrganization) {
      return res.status(400).json({
        success: false,
        message: "Organization is inactive.",
      });
    }

    // ==========================================
    // SAVE AUDIT
    // ==========================================

    const audit = await Audit.create({
      pharmacy: accessiblePharmacy._id,

      title: title.trim(),

      auditDate: parsedAuditDate,

      auditor: auditor.trim(),

      notes: notes.trim(),

      status: "planned",

      createdBy: req.user._id,
    });

    await audit.populate(
      "pharmacy",
      "pharmacyName city"
    );

    return res.status(201).json({
      success: true,
      message: "Audit created successfully.",
      audit,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to create audit."
    );
  }
};

// ==========================================
// GET ALL ACCESSIBLE AUDITS
// ==========================================

export const getAudits = async (req, res) => {
  try {
    // Retrieve audits within authorized tenants
    const filter = await getAuditFilter(req);

    const audits = await Audit.find(filter)
      .populate(
        "pharmacy",
        "pharmacyName city"
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
      audits,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve audits."
    );
  }
};

// ==========================================
// UPDATE AUDIT STATUS
// ==========================================

export const updateAuditStatus = async (req, res) => {
  try {
    // Verify role permissions
    if (!AUDIT_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to update audits.",
      });
    }

    const { id } = req.params;
    const { status } = req.body || {};

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit ID.",
      });
    }

    // Validate audit status
    if (!AUDIT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Audit status must be planned, in_progress or completed.",
      });
    }

    // ==========================================
    // TENANT-SCOPED ATOMIC UPDATE
    // ==========================================

    const filter = await getAuditFilter(req);

    const audit = await Audit.findOneAndUpdate(
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
        "pharmacy",
        "pharmacyName city"
      )
      .populate(
        "createdBy",
        "name"
      );

    if (!audit) {
      return res.status(404).json({
        success: false,
        message: "Audit not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Audit status updated successfully.",
      audit,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update audit status."
    );
  }
};
