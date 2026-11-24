
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Authentication configuration error.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ["HS256"],
      }
    );

    if (
      !decoded.id ||
      !mongoose.isValidObjectId(decoded.id)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token.",
      });
    }

    const user = await User.findById(decoded.id)
      .select("-password")
      .populate("organization", "name isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account not found.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    const allowedRoles = [
      "super_admin",
      "organization_admin",
      "pharmacist",
      "auditor",
    ];

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Account requires role migration.",
      });
    }

    if (user.role !== "super_admin") {
      if (!user.organization) {
        return res.status(403).json({
          success: false,
          message: "No organization assigned to your account.",
        });
      }

      if (user.organization.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Your organization is inactive.",
        });
      }
    }

    req.user = user;

    req.tenantId =
      user.organization?._id || null;

    req.isSuperAdmin =
      user.role === "super_admin";

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired authentication token.",
      });
    }

    console.error("Authentication error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Authentication failed.",
    });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
};

export const requireOrganization = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  if (req.isSuperAdmin) {
    return next();
  }

  if (!req.tenantId) {
    return res.status(403).json({
      success: false,
      message: "Organization access required.",
    });
  }

  next();
};
