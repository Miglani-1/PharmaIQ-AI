
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

// ==========================================
// ROUTE IMPORTS
// ==========================================

import authRoutes from "./routes/authRoutes.js";
import organizationRoutes from "./routes/organizationRoutes.js";
import pharmacyRoutes from "./routes/pharmacyRoutes.js";
import documentRoutes from "./routes/documentRoutes.js";
import analysisRoutes from "./routes/analysisRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import auditRoutes from "./routes/auditRoutes.js";
import capaRoutes from "./routes/capaRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// New RBAC user management routes
import userRoutes from "./routes/userRoutes.js";

// ==========================================
// EXPRESS APPLICATION
// ==========================================

const app = express();

const isProduction =
  process.env.NODE_ENV === "production";

app.disable("x-powered-by");

// Enable only when deployed behind
// a trusted reverse proxy
if (
  isProduction &&
  process.env.TRUST_PROXY === "1"
) {
  app.set("trust proxy", 1);
}

// ==========================================
// SECURITY HEADERS
// ==========================================

app.use(helmet());

// ==========================================
// CORS CONFIGURATION
// ==========================================

const allowedOrigins = (
  process.env.CLIENT_URL ||
  "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients
    // such as Postman
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    const error = new Error(
      "CORS origin not allowed."
    );

    error.status = 403;

    return callback(error);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
  ],

  exposedHeaders: [
    "Content-Disposition",
  ],

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// ==========================================
// CSRF PROTECTION
// ==========================================

const csrfProtection = (req, res, next) => {
  const safeMethods = [
    "GET",
    "HEAD",
    "OPTIONS",
  ];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const origin = req.get("origin");

  const referer = req.get("referer");

  const fetchSite = req.get("sec-fetch-site");

  // Reject unauthorized browser origins
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      return res.status(403).json({
        success: false,
        message:
          "Request blocked by CSRF protection.",
      });
    }

    return next();
  }

  // Fallback to Referer validation
  if (referer) {
    try {
      const refererOrigin =
        new URL(referer).origin;

      if (
        !allowedOrigins.includes(refererOrigin)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid request origin.",
        });
      }

      return next();
    } catch {
      return res.status(403).json({
        success: false,
        message: "Invalid request referer.",
      });
    }
  }

  // Block browser requests without
  // a verifiable origin
  if (fetchSite) {
    return res.status(403).json({
      success: false,
      message:
        "Request origin could not be verified.",
    });
  }

  // In production, require an origin for
  // state-changing requests
  if (isProduction) {
    return res.status(403).json({
      success: false,
      message:
        "Request origin is required.",
    });
  }

  // Allow local Postman testing
  return next();
};

app.use("/api", csrfProtection);

// ==========================================
// RATE LIMITING
// ==========================================

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 300,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 20,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  skipSuccessfulRequests: true,

  message: {
    success: false,
    message:
      "Too many authentication attempts. Please try again after 15 minutes.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,

  limit: 10,

  standardHeaders: "draft-7",

  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many registration requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

app.use(
  "/api/auth/login",
  authLimiter
);

app.use(
  "/api/auth/register",
  registerLimiter
);

// ==========================================
// REQUEST PARSING
// ==========================================

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

app.use(cookieParser());

// ==========================================
// API CACHE PROTECTION
// ==========================================

app.use("/api", (req, res, next) => {
  res.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  next();
});

// ==========================================
// HEALTH CHECK
// ==========================================

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,

    message:
      "PharmaIQ AI backend is running.",

    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

// ==========================================
// ORGANIZATION ROUTES
// ==========================================

app.use(
  "/api/organization",
  organizationRoutes
);

// ==========================================
// PHARMACY ROUTES
// ==========================================

app.use(
  "/api/pharmacy",
  pharmacyRoutes
);

// ==========================================
// DOCUMENT ROUTES
// ==========================================

app.use(
  "/api/documents",
  documentRoutes
);

// ==========================================
// AI ANALYSIS ROUTES
// ==========================================

app.use(
  "/api/analysis",
  analysisRoutes
);

// ==========================================
// DASHBOARD ROUTES
// ==========================================

app.use(
  "/api/dashboard",
  dashboardRoutes
);

// ==========================================
// AUDIT ROUTES
// ==========================================

app.use(
  "/api/audits",
  auditRoutes
);

// ==========================================
// CAPA ROUTES
// ==========================================

app.use(
  "/api/capas",
  capaRoutes
);

// ==========================================
// PDF REPORT ROUTES
// ==========================================

app.use(
  "/api/reports",
  reportRoutes
);

// ==========================================
// HUMAN REVIEW ROUTES
// ==========================================

app.use(
  "/api/reviews",
  reviewRoutes
);

// ==========================================
// NEW USER MANAGEMENT ROUTES
// ==========================================

app.use(
  "/api/users",
  userRoutes
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  return res.status(404).json({
    success: false,

    message: "API route not found.",
  });
});

// ==========================================
// CENTRALIZED ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  console.error(
    "Application error:",
    error.message
  );

  if (res.headersSent) {
    return next(error);
  }

  if (
    error.message ===
    "CORS origin not allowed."
  ) {
    return res.status(403).json({
      success: false,
      message:
        "Request origin is not allowed.",
    });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large.",
    });
  }

  if (
    error instanceof SyntaxError &&
    error.status === 400
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON request body.",
    });
  }

  const requestedStatus =
    error.status || error.statusCode || 500;

  const statusCode =
    Number.isInteger(requestedStatus) &&
    requestedStatus >= 400 &&
    requestedStatus <= 599
      ? requestedStatus
      : 500;

  return res.status(statusCode).json({
    success: false,

    message:
      isProduction && statusCode >= 500
        ? "Internal server error."
        : error.message ||
          "Something went wrong.",
  });
});

export default app;
