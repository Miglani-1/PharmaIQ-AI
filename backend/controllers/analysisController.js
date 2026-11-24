
import ComplianceAnalysis from "../models/ComplianceAnalysis.js";

import {
  analyzeWithGemini,
} from "../services/geminiService.js";

import {
  isValidId,
  getAnalysisFilter,
  findAccessibleDocument,
} from "../services/tenantService.js";

const ANALYSIS_ROLES = [
  "super_admin",
  "organization_admin",
  "pharmacist",
];

// ==========================================
// CHECK RETRYABLE AI ERRORS
// ==========================================

const isRetryableError = (error) => {
  const status = Number(
    error.status || error.statusCode || error.code
  );

  const message = String(error.message || "");

  return (
    [429, 500, 502, 503, 504].includes(status) ||
    /RESOURCE_EXHAUSTED|UNAVAILABLE|high demand/i.test(
      message
    ) ||
    /\b(429|500|502|503|504)\b/.test(message)
  );
};

// ==========================================
// DELAY HELPER
// ==========================================

const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// GEMINI RETRY MECHANISM
// ==========================================

const analyzeWithRetry = async (
  documentText,
  maxAttempts = 3
) => {
  let lastError;

  for (
    let attempt = 1;
    attempt <= maxAttempts;
    attempt++
  ) {
    try {
      return await analyzeWithGemini(documentText);
    } catch (error) {
      lastError = error;

      if (
        !isRetryableError(error) ||
        attempt === maxAttempts
      ) {
        throw error;
      }

      const waitTime = 2000 * attempt;

      console.warn(
        `AI attempt ${attempt} failed. Retrying in ${waitTime}ms.`
      );

      await delay(waitTime);
    }
  }

  throw lastError;
};

// ==========================================
// ANALYZE DOCUMENT
// ==========================================

export const analyzeDocument = async (req, res) => {
  try {
    // Role-based permission check
    if (!ANALYSIS_ROLES.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to analyze documents.",
      });
    }

    const { documentId } = req.params;

    // Validate document ID
    if (!isValidId(documentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    // Tenant-scoped document retrieval
    const document = await findAccessibleDocument(
      req,
      documentId,
      true
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // Validate extracted text
    if (
      document.extractionStatus !== "completed" ||
      typeof document.extractedText !== "string" ||
      !document.extractedText.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Document text extraction must be completed before AI analysis.",
      });
    }

    // ==========================================
    // GEMINI AI ANALYSIS
    // ==========================================

    const { result, model } =
      await analyzeWithRetry(
        document.extractedText
      );

    // Validate AI response
    if (
      !result ||
      typeof result.summary !== "string" ||
      !result.summary.trim() ||
      !Array.isArray(result.findings)
    ) {
      return res.status(502).json({
        success: false,
        message:
          "AI returned an invalid analysis response.",
      });
    }

    const validRiskLevels = [
      "low",
      "medium",
      "high",
      "unknown",
    ];

    const riskLevel = validRiskLevels.includes(
      result.riskLevel
    )
      ? result.riskLevel
      : "unknown";

    // ==========================================
    // SAVE COMPLIANCE ANALYSIS
    // ==========================================

    const analysis = await ComplianceAnalysis.create({
      document: document._id,

      analyzedBy: req.user._id,

      summary: result.summary,

      riskLevel,

      findings: result.findings,

      modelUsed: model,

      reviewStatus: "pending",

      reviewComments: "",

      reviewedBy: null,

      reviewedAt: null,
    });

    // Update document analysis status
    document.analysisStatus = "completed";

    await document.save();

    // ==========================================
    // RETURN ANALYSIS RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,

      message:
        "AI compliance analysis completed successfully.",

      analysis,

      disclaimer:
        "This AI-generated analysis is advisory and requires independent human review. Missing information does not automatically establish a regulatory violation.",
    });
  } catch (error) {
    console.error(
      "Compliance analysis error:",
      error.message
    );

    if (isRetryableError(error)) {
      return res.status(503).json({
        success: false,
        message:
          "AI service is temporarily busy. Please try again later.",
      });
    }

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status === 403
          ? "Organization access denied."
          : "Failed to analyze document.",
    });
  }
};

// ==========================================
// GET ALL ACCESSIBLE ANALYSES
// ==========================================

export const getAnalyses = async (req, res) => {
  try {
    // Retrieve only analyses belonging
    // to accessible organization documents.
    const filter = await getAnalysisFilter(req);

    const analyses = await ComplianceAnalysis.find(
      filter
    )
      .populate(
        "document",
        "documentName documentType"
      )
      .populate(
        "analyzedBy",
        "name"
      )
      .populate(
        "reviewedBy",
        "name"
      )
      .sort({
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      analyses,
    });
  } catch (error) {
    console.error(
      "Get analyses error:",
      error.message
    );

    return res.status(error.status || 500).json({
      success: false,
      message:
        error.status === 403
          ? "Organization access denied."
          : "Failed to retrieve compliance analyses.",
    });
  }
};
