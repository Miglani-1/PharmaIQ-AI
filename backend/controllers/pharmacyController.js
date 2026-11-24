
import Pharmacy from "../models/Pharmacy.js";

import {
  isValidId,
  getPharmacyFilter,
  findAccessibleOrganization,
  findAccessiblePharmacy,
} from "../services/tenantService.js";

const ADMIN_ROLES = [
  "super_admin",
  "organization_admin",
];

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

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Pharmacy already exists.",
    });
  }

  return res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : message,
  });
};

// ==========================================
// CREATE PHARMACY
// ==========================================

export const createPharmacy = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Permission denied.",
      });
    }

    const {
      organization,
      pharmacyName,
      ownerName,
      pharmacistName,
      licenseNumber,
      licenseExpiryDate,
      address,
      city,
    } = req.body || {};

    const requiredFields = [
      organization,
      pharmacyName,
      ownerName,
      pharmacistName,
      licenseNumber,
      licenseExpiryDate,
      address,
      city,
    ];

    if (
      requiredFields.some(
        (value) =>
          typeof value !== "string" || !value.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "All pharmacy fields are required.",
      });
    }

    if (!isValidId(organization)) {
      return res.status(400).json({
        success: false,
        message: "Invalid organization ID.",
      });
    }

    // Verify tenant access before creating pharmacy
    const accessibleOrganization =
      await findAccessibleOrganization(
        req,
        organization
      );

    if (!accessibleOrganization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    if (!accessibleOrganization.isActive) {
      return res.status(400).json({
        success: false,
        message: "Organization is inactive.",
      });
    }

    const expiryDate = new Date(licenseExpiryDate);

    if (Number.isNaN(expiryDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid license expiry date.",
      });
    }

    const pharmacy = await Pharmacy.create({
      organization: accessibleOrganization._id,
      pharmacyName: pharmacyName.trim(),
      ownerName: ownerName.trim(),
      pharmacistName: pharmacistName.trim(),
      licenseNumber: licenseNumber.trim(),
      licenseExpiryDate: expiryDate,
      address: address.trim(),
      city: city.trim(),
      status: "active",
    });

    await pharmacy.populate(
      "organization",
      "name"
    );

    return res.status(201).json({
      success: true,
      message: "Pharmacy created successfully.",
      pharmacy,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to create pharmacy."
    );
  }
};

// ==========================================
// GET ALL ACCESSIBLE PHARMACIES
// ==========================================

export const getPharmacies = async (req, res) => {
  try {
    const filter = await getPharmacyFilter(req);

    const pharmacies = await Pharmacy.find(filter)
      .populate("organization", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      pharmacies,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve pharmacies."
    );
  }
};

// ==========================================
// GET PHARMACY BY ID
// ==========================================

export const getPharmacyById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pharmacy ID.",
      });
    }

    const pharmacy = await findAccessiblePharmacy(
      req,
      id
    );

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found.",
      });
    }

    await pharmacy.populate(
      "organization",
      "name"
    );

    return res.status(200).json({
      success: true,
      pharmacy,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve pharmacy."
    );
  }
};

// ==========================================
// UPDATE PHARMACY
// ==========================================

export const updatePharmacy = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Permission denied.",
      });
    }

    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pharmacy ID.",
      });
    }

    const body = req.body || {};

    // Prevent pharmacy transfer between tenants
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "organization"
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pharmacy organization cannot be changed.",
      });
    }

    const allowedFields = [
      "pharmacyName",
      "ownerName",
      "pharmacistName",
      "licenseNumber",
      "address",
      "city",
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(
          body,
          field
        )
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

    // Validate license expiry date
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "licenseExpiryDate"
      )
    ) {
      if (
        typeof body.licenseExpiryDate !== "string" ||
        !body.licenseExpiryDate.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid license expiry date.",
        });
      }

      const expiryDate = new Date(
        body.licenseExpiryDate
      );

      if (Number.isNaN(expiryDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid license expiry date.",
        });
      }

      updates.licenseExpiryDate = expiryDate;
    }

    // Validate pharmacy status
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "status"
      )
    ) {
      if (
        !["active", "inactive"].includes(body.status)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid pharmacy status.",
        });
      }

      updates.status = body.status;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const filter = await getPharmacyFilter(req);

    const pharmacy = await Pharmacy.findOneAndUpdate(
      {
        $and: [
          { _id: id },
          filter,
        ],
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("organization", "name");

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pharmacy updated successfully.",
      pharmacy,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update pharmacy."
    );
  }
};

// ==========================================
// DEACTIVATE PHARMACY
// ==========================================

export const deactivatePharmacy = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Permission denied.",
      });
    }

    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid pharmacy ID.",
      });
    }

    const filter = await getPharmacyFilter(req);

    const pharmacy = await Pharmacy.findOneAndUpdate(
      {
        $and: [
          { _id: id },
          filter,
        ],
      },
      {
        $set: {
          status: "inactive",
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("organization", "name");

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Pharmacy deactivated successfully. Existing compliance records have been preserved.",
      pharmacy,
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to deactivate pharmacy."
    );
  }
};
