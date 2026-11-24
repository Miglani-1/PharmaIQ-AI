
import Organization from "../models/Organization.js";
import Pharmacy from "../models/Pharmacy.js";
import User from "../models/User.js";

import {
  isValidId,
  getOrganizationFilter,
} from "../services/tenantService.js";

const ORGANIZATION_TYPES = [
  "Pharmacy",
  "Manufacturer",
  "Distributor",
  "Other",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const handleError = (res, error, message) => {
  console.error(message, error.message);

  if (error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Organization already exists.",
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : message,
  });
};

// ==========================================
// CREATE ORGANIZATION
// Super Admin only
// ==========================================

export const createOrganization = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only Super Admin can create organizations.",
      });
    }

    const {
      name,
      licenseNumber,
      organizationType,
      address,
      city,
      contactEmail,
    } = req.body || {};

    const fields = [
      name,
      licenseNumber,
      organizationType,
      address,
      city,
      contactEmail,
    ];

    if (
      fields.some(
        (value) =>
          typeof value !== "string" || !value.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "All organization fields are required.",
      });
    }

    if (
      !ORGANIZATION_TYPES.includes(
        organizationType.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization type.",
      });
    }

    if (
      !EMAIL_REGEX.test(contactEmail.trim()) ||
      contactEmail.trim().length > 254
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid contact email.",
      });
    }

    const organization = await Organization.create({
      name: name.trim(),
      licenseNumber: licenseNumber.trim(),
      organizationType: organizationType.trim(),
      address: address.trim(),
      city: city.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      createdBy: req.user._id,
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "Organization created successfully.",
      organization,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to create organization."
    );
  }
};

// ==========================================
// GET ORGANIZATIONS
// Tenant-scoped access
// ==========================================

export const getOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find(
      getOrganizationFilter(req)
    ).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      organizations,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve organizations."
    );
  }
};

// ==========================================
// GET ORGANIZATION BY ID
// ==========================================

export const getOrganizationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    const organization = await Organization.findOne({
      $and: [
        { _id: id },
        getOrganizationFilter(req),
      ],
    });

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.status(200).json({
      success: true,
      organization,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve organization."
    );
  }
};

// ==========================================
// UPDATE ORGANIZATION
// Super Admin / Organization Admin
// ==========================================

export const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !["super_admin", "organization_admin"].includes(
        req.user.role
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Permission denied.",
      });
    }

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    const body = req.body || {};

    const allowedFields = [
      "name",
      "licenseNumber",
      "organizationType",
      "address",
      "city",
      "contactEmail",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(body, field)
      ) {
        if (
          typeof body[field] !== "string" ||
          !body[field].trim()
        ) {
          return res.status(400).json({
            success: false,
            message: `Invalid value for ${field}.`,
          });
        }

        updates[field] = body[field].trim();
      }
    }

    if (
      updates.organizationType &&
      !ORGANIZATION_TYPES.includes(
        updates.organizationType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization type.",
      });
    }

    if (updates.contactEmail) {
      updates.contactEmail =
        updates.contactEmail.toLowerCase();

      if (
        !EMAIL_REGEX.test(updates.contactEmail) ||
        updates.contactEmail.length > 254
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid contact email.",
        });
      }
    }

    // Only Super Admin can activate/deactivate tenants.

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "isActive"
      )
    ) {
      if (req.user.role !== "super_admin") {
        return res.status(403).json({
          success: false,
          message:
            "Only Super Admin can change organization status.",
        });
      }

      if (typeof body.isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message: "isActive must be a boolean.",
        });
      }

      updates.isActive = body.isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const organization =
      await Organization.findOneAndUpdate(
        {
          $and: [
            { _id: id },
            getOrganizationFilter(req),
          ],
        },
        {
          $set: updates,
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Organization updated successfully.",
      organization,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update organization."
    );
  }
};

// ==========================================
// DELETE ORGANIZATION
// Super Admin only
// Safe deactivation instead of permanent deletion
// ==========================================

export const deleteOrganization = async (req, res) => {
  try {
    if (req.user.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message:
          "Only Super Admin can deactivate organizations.",
      });
    }

    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    const organization = await Organization.findById(id);

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    const [pharmacyCount, userCount] = await Promise.all([
      Pharmacy.countDocuments({
        organization: id,
      }),

      User.countDocuments({
        organization: id,
      }),
    ]);

    // Preserve compliance history and relationships.
    // Never permanently delete tenant records here.

    organization.isActive = false;

    await organization.save();

    return res.status(200).json({
      success: true,
      message:
        "Organization deactivated successfully. Existing records have been preserved.",
      organization,
      preservedRecords: {
        pharmacies: pharmacyCount,
        users: userCount,
      },
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to deactivate organization."
    );
  }
};
