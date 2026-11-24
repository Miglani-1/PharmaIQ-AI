
import PDFDocument from "pdfkit";

import ComplianceAnalysis from "../models/ComplianceAnalysis.js";
import Pharmacy from "../models/Pharmacy.js";
import Organization from "../models/Organization.js";

import {
  isValidId,
  getAnalysisFilter,
  findAccessibleDocument,
} from "../services/tenantService.js";

// ==========================================
// DOWNLOAD COMPLIANCE REPORT
// ==========================================

export const downloadComplianceReport = async (
  req,
  res
) => {
  try {
    const { analysisId } = req.params;

    // Validate analysis ID
    if (!isValidId(analysisId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid analysis ID.",
      });
    }

    // ==========================================
    // TENANT ISOLATION
    // ==========================================

    const filter = await getAnalysisFilter(req);

    const analysis = await ComplianceAnalysis.findOne({
      $and: [
        { _id: analysisId },
        filter,
      ],
    })
      .populate("analyzedBy", "name")
      .populate("reviewedBy", "name");

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Compliance analysis not found.",
      });
    }

    // Verify document access
    const sourceDocument =
      await findAccessibleDocument(
        req,
        analysis.document
      );

    if (!sourceDocument) {
      return res.status(404).json({
        success: false,
        message: "Source document not found.",
      });
    }

    // Retrieve pharmacy information
    const pharmacy = await Pharmacy.findById(
      sourceDocument.pharmacy
    );

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found.",
      });
    }

    // Verify organization access
    const organizationFilter = {
      _id: pharmacy.organization,
    };

    if (!req.isSuperAdmin) {
      organizationFilter._id = req.tenantId;
      organizationFilter.isActive = true;

      if (
        String(pharmacy.organization) !==
        String(req.tenantId)
      ) {
        return res.status(404).json({
          success: false,
          message: "Report not found.",
        });
      }
    }

    const organization = await Organization.findOne(
      organizationFilter
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        message: "Organization not found.",
      });
    }

    // ==========================================
    // PDF CONFIGURATION
    // ==========================================

    const pdf = new PDFDocument({
      size: "A4",

      margins: {
        top: 50,
        bottom: 60,
        left: 50,
        right: 50,
      },

      bufferPages: true,

      info: {
        Title: "PharmaIQ AI Compliance Report",
        Author: "PharmaIQ AI",
        Subject: "AI-Assisted Pharmaceutical Compliance",
      },
    });

    const colors = {
      primary: "#0f766e",
      dark: "#0f172a",
      muted: "#64748b",
      border: "#e2e8f0",
      high: "#dc2626",
      medium: "#d97706",
      low: "#0d9488",
      unknown: "#64748b",
    };

    // ==========================================
    // RESPONSE HEADERS
    // ==========================================

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="PharmaIQ-Compliance-${analysisId}.pdf"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    pdf.on("error", (error) => {
      console.error(
        "PDF generation error:",
        error.message
      );

      res.destroy(error);
    });

    pdf.pipe(res);

    // ==========================================
    // PDF HELPER FUNCTIONS
    // ==========================================

    const formatValue = (value) => {
      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return "Not available";
      }

      return String(value);
    };

    const formatStatus = (value) => {
      if (!value) return "Unknown";

      return String(value)
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) =>
          char.toUpperCase()
        );
    };

    const formatDate = (value) => {
      if (!value) return "Not available";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "Not available";
      }

      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
      });
    };

    const ensureSpace = (height = 100) => {
      const bottom =
        pdf.page.height -
        pdf.page.margins.bottom;

      if (pdf.y + height > bottom) {
        pdf.addPage();
      }
    };

    const divider = () => {
      ensureSpace(20);

      pdf
        .moveTo(50, pdf.y)
        .lineTo(
          pdf.page.width - 50,
          pdf.y
        )
        .strokeColor(colors.border)
        .lineWidth(1)
        .stroke();

      pdf.moveDown(0.8);
    };

    const sectionTitle = (title) => {
      ensureSpace(70);

      pdf
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor(colors.primary)
        .text(title);

      pdf.moveDown(0.6);
    };

    const field = (
      label,
      value,
      valueColor = colors.dark
    ) => {
      ensureSpace(45);

      pdf
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(colors.muted)
        .text(`${label}:`);

      pdf
        .font("Helvetica")
        .fontSize(11)
        .fillColor(valueColor)
        .text(formatValue(value), {
          lineGap: 3,
        });

      pdf.moveDown(0.6);
    };

    // ==========================================
    // REPORT HEADER
    // ==========================================

    pdf
      .font("Helvetica-Bold")
      .fontSize(26)
      .fillColor(colors.primary)
      .text("PharmaIQ AI", {
        align: "center",
      });

    pdf.moveDown(0.3);

    pdf
      .font("Helvetica-Bold")
      .fontSize(15)
      .fillColor(colors.dark)
      .text(
        "AI-Assisted Compliance Review Report",
        {
          align: "center",
        }
      );

    pdf.moveDown(0.5);

    pdf
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.muted)
      .text(
        "Confidential | Internal Compliance Assessment",
        {
          align: "center",
        }
      );

    pdf.moveDown(1);

    divider();

    // ==========================================
    // REPORT INFORMATION
    // ==========================================

    sectionTitle("1. Report Information");

    field(
      "Organization",
      organization.name
    );

    field(
      "Pharmacy",
      pharmacy.pharmacyName
    );

    field(
      "Document Name",
      sourceDocument.documentName
    );

    field(
      "Document Type",
      formatStatus(sourceDocument.documentType)
    );

    field(
      "Analysis ID",
      analysis._id
    );

    field(
      "Analysis Date",
      formatDate(analysis.createdAt)
    );

    field(
      "Report Generated",
      formatDate(new Date())
    );

    field(
      "Analyzed By",
      analysis.analyzedBy?.name
    );

    field(
      "AI Model",
      analysis.modelUsed
    );

    field(
      "Overall Risk Level",
      formatStatus(analysis.riskLevel),
      colors[analysis.riskLevel] ||
        colors.unknown
    );

    field(
      "Human Review Status",
      formatStatus(analysis.reviewStatus)
    );

    divider();

    // ==========================================
    // EXECUTIVE SUMMARY
    // ==========================================

    sectionTitle("2. Executive Summary");

    pdf
      .font("Helvetica")
      .fontSize(11)
      .fillColor(colors.dark)
      .text(
        analysis.summary ||
          "No executive summary available.",
        {
          align: "left",
          lineGap: 5,
        }
      );

    pdf.moveDown(1);

    divider();

    // ==========================================
    // COMPLIANCE FINDINGS
    // ==========================================

    const findings = Array.isArray(
      analysis.findings
    )
      ? analysis.findings
      : [];

    sectionTitle(
      `3. Compliance Findings (${findings.length})`
    );

    if (findings.length === 0) {
      pdf
        .font("Helvetica")
        .fontSize(11)
        .fillColor(colors.muted)
        .text(
          "No findings were identified in this analysis. This does not establish regulatory compliance."
        );

      pdf.moveDown(1);
    }

    for (let i = 0; i < findings.length; i++) {
      const finding = findings[i];

      ensureSpace(130);

      pdf
        .font("Helvetica-Bold")
        .fontSize(13)
        .fillColor(colors.primary)
        .text(
          `${i + 1}. ${
            finding.title ||
            "Compliance Finding"
          }`
        );

      pdf.moveDown(0.7);

      field(
        "Severity",
        formatStatus(finding.severity),
        colors[finding.severity] ||
          colors.unknown
      );

      field(
        "Finding Status",
        formatStatus(finding.status)
      );

      field(
        "Document Evidence",
        finding.evidence
      );

      field(
        "Recommended Corrective Action",
        finding.recommendation
      );

      field(
        "Regulatory Reference (AI-suggested, unverified)",
        finding.ruleReference ||
          "No verified regulatory reference available."
      );

      divider();
    }

    // ==========================================
    // HUMAN REVIEW INFORMATION
    // ==========================================

    sectionTitle("4. Human Review");

    field(
      "Review Status",
      formatStatus(analysis.reviewStatus)
    );

    if (analysis.reviewStatus === "pending") {
      pdf
        .font("Helvetica")
        .fontSize(11)
        .fillColor(colors.medium)
        .text(
          "This analysis is awaiting independent human review."
        );

      pdf.moveDown(1);
    } else {
      field(
        "Reviewed By",
        analysis.reviewedBy?.name
      );

      field(
        "Review Date",
        formatDate(analysis.reviewedAt)
      );

      field(
        "Review Comments",
        analysis.reviewComments
      );
    }

    divider();

    // ==========================================
    // DISCLAIMER
    // ==========================================

    sectionTitle("5. Important Disclaimer");

    pdf
      .font("Helvetica")
      .fontSize(10)
      .fillColor(colors.muted)
      .text(
        "This report is generated using artificial intelligence to support pharmaceutical compliance assessment. AI-generated findings are advisory and require verification by qualified personnel. Missing information or unavailable evidence does not automatically constitute a regulatory violation. Regulatory references must be independently verified against applicable official sources. Human approval of this report does not constitute regulatory certification or legal authorization.",
        {
          lineGap: 4,
        }
      );

    pdf.moveDown(1);

    // ==========================================
    // PAGE FOOTERS
    // ==========================================

    const pages = pdf.bufferedPageRange();

    for (
      let i = pages.start;
      i < pages.start + pages.count;
      i++
    ) {
      pdf.switchToPage(i);

      const originalBottomMargin =
        pdf.page.margins.bottom;

      pdf.page.margins.bottom = 0;

      const footerY = pdf.page.height - 35;

      pdf
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(
          "PharmaIQ AI | Confidential Compliance Report",
          50,
          footerY,
          {
            width: pdf.page.width - 100,
            align: "left",
            lineBreak: false,
          }
        );

      pdf
        .font("Helvetica")
        .fontSize(8)
        .fillColor(colors.muted)
        .text(
          `Page ${i - pages.start + 1} of ${pages.count}`,
          50,
          footerY,
          {
            width: pdf.page.width - 100,
            align: "right",
            lineBreak: false,
          }
        );

      pdf.page.margins.bottom =
        originalBottomMargin;
    }

    pdf.end();
  } catch (error) {
    console.error(
      "Compliance report error:",
      error.message
    );

    if (!res.headersSent) {
      return res.status(error.status || 500).json({
        success: false,
        message:
          "Failed to generate compliance report.",
      });
    }

    res.destroy(error);
  }
};
