
import User from "../models/User.js";
import Organization from "../models/Organization.js";

import {
  isValidId,
} from "../services/tenantService.js";

const MANAGEMENT_ROLES = [
  "super_admin",
  "organization_admin",
];

const TENANT_ROLES = [
  "organization_admin",
  "pharmacist",
  "auditor",
];

const STAFF_ROLES = [
  "pharmacist",
  "auditor",
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const isManager = (req) => {
  return MANAGEMENT_ROLES.includes(
    req.user?.role
  );
};

const getUserFilter = (req) => {
  if (req.isSuperAdmin) {
    return {};
  }

  return {
    organization: req.tenantId,
    role: {
      $in: STAFF_ROLES,
    },
  };
};

const formatUser = (user) => ({
  _id: user._id,
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.organization || null,
  isActive: user.isActive === true,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const handleError = (res, error, message) => {
  console.error(message, error.message);

  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: "Email is already registered.",
    });
  }

  if (
    error.name === "ValidationError" ||
    error.name === "CastError"
  ) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  return res.status(500).json({
    success: false,
    message,
  });
};

// ==========================================
// GET USERS
// ==========================================

export const getUsers = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const users = await User.find(
      getUserFilter(req)
    )
      .select("-password")
      .populate(
        "organization",
        "name isActive"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      users: users.map(formatUser),
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to retrieve users."
    );
  }
};

// ==========================================
// CREATE USER
// ==========================================

export const createUser = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to create users.",
      });
    }

    const {
      name,
      email,
      password,
      role = "pharmacist",
      organization,
    } = req.body || {};

    // Validate name
    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name must contain 2 to 100 characters.",
      });
    }

    // Validate email
    if (
      typeof email !== "string" ||
      email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email is required.",
      });
    }

    // Validate password
    if (
      typeof password !== "string" ||
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters and must not exceed 72 bytes.",
      });
    }

    // ==========================================
    // ROLE ASSIGNMENT SECURITY
    // ==========================================

    const allowedRoles = req.isSuperAdmin
      ? TENANT_ROLES
      : STAFF_ROLES;

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot assign this role.",
      });
    }

    // ==========================================
    // ORGANIZATION ASSIGNMENT
    // ==========================================

    const organizationId = req.isSuperAdmin
      ? organization
      : req.tenantId;

    if (!isValidId(organizationId)) {
      return res.status(400).json({
        success: false,
        message:
          "Valid organization is required.",
      });
    }

    if (
      !req.isSuperAdmin &&
      organization !== undefined &&
      String(organization) !==
        String(req.tenantId)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Cross-organization user creation is not allowed.",
      });
    }

    const accessibleOrganization =
      await Organization.findOne({
        _id: organizationId,
        isActive: true,
      });

    if (!accessibleOrganization) {
      return res.status(404).json({
        success: false,
        message:
          "Active organization not found.",
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message:
          "Email is already registered.",
      });
    }

    // Password hashing is handled by User model
    const user = await User.create({
      name: name.trim(),

      email: normalizedEmail,

      password,

      role,

      organization:
        accessibleOrganization._id,

      isActive: true,

      createdBy: req.user._id,
    });

    await user.populate(
      "organization",
      "name isActive"
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to create user."
    );
  }
};

// ==========================================
// UPDATE USER ACCESS
// ==========================================

export const updateUser = async (req, res) => {
  try {
    if (!isManager(req)) {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const { id } = req.params;

    const {
      role,
      organization,
      isActive,
    } = req.body || {};

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID.",
      });
    }

    // Prevent modification of own privileges
    if (
      String(id) === String(req.user._id)
    ) {
      return res.status(403).json({
        success: false,
        message:
          "You cannot modify your own access permissions.",
      });
    }

    const filter = getUserFilter(req);

    const targetUser = await User.findOne({
      $and: [
        { _id: id },
        filter,
      ],
    }).select("-password");

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Protect Super Admin accounts
    if (targetUser.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message:
          "Super Admin accounts cannot be modified through this endpoint.",
      });
    }

    const updates = {};

    // ==========================================
    // ROLE UPDATE
    // ==========================================

    if (role !== undefined) {
      const allowedRoles = req.isSuperAdmin
        ? TENANT_ROLES
        : STAFF_ROLES;

      if (!allowedRoles.includes(role)) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot assign this role.",
        });
      }

      updates.role = role;
    }

    // ==========================================
    // ORGANIZATION UPDATE
    // ==========================================

    if (organization !== undefined) {
      if (!req.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          message:
            "Only Super Admin can assign organizations.",
        });
      }

      if (!isValidId(organization)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid organization ID.",
        });
      }

      // Existing tenant accounts cannot be
      // transferred through this endpoint.
      if (
        targetUser.organization &&
        String(targetUser.organization) !==
          String(organization)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Existing users cannot be transferred between organizations.",
        });
      }

      const activeOrganization =
        await Organization.exists({
          _id: organization,
          isActive: true,
        });

      if (!activeOrganization) {
        return res.status(404).json({
          success: false,
          message:
            "Active organization not found.",
        });
      }

      updates.organization = organization;
    }

    // ==========================================
    // ACCOUNT ACTIVATION
    // ==========================================

    if (isActive !== undefined) {
      if (typeof isActive !== "boolean") {
        return res.status(400).json({
          success: false,
          message:
            "isActive must be a boolean.",
        });
      }

      updates.isActive = isActive;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No valid updates were provided.",
      });
    }

    const finalRole =
      updates.role ?? targetUser.role;

    const finalOrganization =
      updates.organization ??
      targetUser.organization;

    const finalIsActive =
      updates.isActive ??
      targetUser.isActive;

    // Active accounts must have valid
    // tenant roles and active organizations
    if (finalIsActive) {
      if (!TENANT_ROLES.includes(finalRole)) {
        return res.status(400).json({
          success: false,
          message:
            "Assign a valid role before activating this account.",
        });
      }

      if (!isValidId(finalOrganization)) {
        return res.status(400).json({
          success: false,
          message:
            "Assign an organization before activating this account.",
        });
      }

      const activeOrganization =
        await Organization.exists({
          _id: finalOrganization,
          isActive: true,
        });

      if (!activeOrganization) {
        return res.status(400).json({
          success: false,
          message:
            "User must belong to an active organization.",
        });
      }
    }

    // ==========================================
    // SECURE ATOMIC UPDATE
    // ==========================================

    const user = await User.findOneAndUpdate(
      {
        $and: [
          {
            _id: id,

            role: targetUser.role,

            organization:
              targetUser.organization || null,

            updatedAt: targetUser.updatedAt,
          },
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
    )
      .select("-password")
      .populate(
        "organization",
        "name isActive"
      );

    if (!user) {
      return res.status(409).json({
        success: false,
        message:
          "User information changed. Refresh and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "User access updated successfully.",
      user: formatUser(user),
    });
  } catch (error) {
    return handleError(
      res,
      error,
      "Failed to update user."
    );
  }
};
