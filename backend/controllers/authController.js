
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const VALID_ROLES = [
  "super_admin",
  "organization_admin",
  "pharmacist",
  "auditor",
];

// Cookie configuration
const getCookieOptions = () => {
  const sameSite = process.env.COOKIE_SAME_SITE || "lax";

  return {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      sameSite === "none",
    sameSite,
    path: "/",
  };
};

// Generate JWT
const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign(
    {
      id: userId.toString(),
    },
    process.env.JWT_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "1d",
    }
  );
};

// Safe user response
const formatUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  organization: user.organization || null,
  isActive: user.isActive !== false,
});

// Send authentication response
const sendAuthResponse = (res, user) => {
  const token = generateToken(user._id);

  res.cookie("token", token, {
    ...getCookieOptions(),
    maxAge: 24 * 60 * 60 * 1000,
  });

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    user: formatUser(user),
  });
};

// ==========================================
// REGISTER USER
// ==========================================

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required.",
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (
      cleanName.length < 2 ||
      cleanName.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Name must contain 2 to 100 characters.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(cleanEmail) ||
      cleanEmail.length > 254
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (
      password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain at least 8 characters and must not exceed 72 bytes.",
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Never accept role or organization
    // directly from public registration.

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: "pharmacist",
      organization: null,
      isActive: false,
      createdBy: null,
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Contact your administrator for account activation and organization assignment.",
      user: formatUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Registration failed.",
    });
  }
};

// ==========================================
// LOGIN USER
// ==========================================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      Buffer.byteLength(password, "utf8") > 72
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid email and password are required.",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail,
    })
      .select("+password")
      .populate("organization", "name isActive");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const isPasswordValid =
      await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Account activation check
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message:
          "Your account is inactive. Contact your administrator.",
      });
    }

    // Legacy account migration check
    if (!VALID_ROLES.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "Your account requires role migration. Contact your administrator.",
      });
    }

    // Tenant validation
    if (user.role !== "super_admin") {
      if (!user.organization) {
        return res.status(403).json({
          success: false,
          message:
            "No organization has been assigned to your account.",
        });
      }

      if (user.organization.isActive === false) {
        return res.status(403).json({
          success: false,
          message: "Your organization is inactive.",
        });
      }
    }

    return sendAuthResponse(res, user);
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Login failed.",
    });
  }
};

// ==========================================
// LOGOUT USER
// ==========================================

export const logout = async (req, res) => {
  try {
    res.clearCookie("token", getCookieOptions());

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Logout failed.",
    });
  }
};

// ==========================================
// GET CURRENT USER
// ==========================================

export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    return res.status(200).json({
      success: true,
      user: formatUser(req.user),
    });
  } catch (error) {
    console.error("Get user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve user details.",
    });
  }
};
