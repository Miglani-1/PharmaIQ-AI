
import Organization from "../models/Organization.js";
import Pharmacy from "../models/Pharmacy.js";
import Document from "../models/Document.js";
import ComplianceAnalysis from "../models/ComplianceAnalysis.js";
import Audit from "../models/Audit.js";
import CAPA from "../models/CAPA.js";

import {
  getOrganizationFilter,
} from "../services/tenantService.js";

// ==========================================
// DASHBOARD STATISTICS
// ==========================================

export const getDashboardStats = async (req, res) => {
  try {
    // ==========================================
    // ORGANIZATION SCOPE
    // ==========================================

    const organizations = await Organization.find(
      getOrganizationFilter(req)
    )
      .select("_id")
      .lean();

    const organizationIds = organizations.map(
      (organization) => organization._id
    );

    // ==========================================
    // PHARMACY SCOPE
    // ==========================================

    const pharmacies = await Pharmacy.find({
      organization: {
        $in: organizationIds,
      },
    })
      .select("_id licenseExpiryDate status")
      .lean();

    const pharmacyIds = pharmacies.map(
      (pharmacy) => pharmacy._id
    );

    // ==========================================
    // DOCUMENTS AND AUDITS
    // ==========================================

    const [documents, audits] = await Promise.all([
      Document.find({
        pharmacy: {
          $in: pharmacyIds,
        },
      })
        .select("_id extractionStatus analysisStatus")
        .lean(),

      Audit.find({
        pharmacy: {
          $in: pharmacyIds,
        },
      })
        .select("_id status")
        .lean(),
    ]);

    const documentIds = documents.map(
      (document) => document._id
    );

    const auditIds = audits.map(
      (audit) => audit._id
    );

    // ==========================================
    // COMPLIANCE ANALYSES AND CAPAS
    // ==========================================

    const [analyses, capas] = await Promise.all([
      ComplianceAnalysis.find({
        document: {
          $in: documentIds,
        },
      })
        .select(
          "document riskLevel reviewStatus findings createdAt"
        )
        .sort({
          createdAt: -1,
        })
        .lean(),

      CAPA.find({
        audit: {
          $in: auditIds,
        },
      })
        .select("_id status dueDate priority")
        .lean(),
    ]);

    // ==========================================
    // RISK BREAKDOWN
    // ==========================================

    const riskBreakdown = {
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0,
    };

    // ==========================================
    // FINDING BREAKDOWN
    // ==========================================

    const findingBreakdown = {
      potential_gap: 0,
      not_verified: 0,
      observation: 0,
    };

    // ==========================================
    // HUMAN REVIEW BREAKDOWN
    // ==========================================

    const reviewBreakdown = {
      pending: 0,
      approved: 0,
      rejected: 0,
      reviewed: 0,
    };

    // ==========================================
    // AUDIT BREAKDOWN
    // ==========================================

    const auditBreakdown = {
      planned: 0,
      in_progress: 0,
      completed: 0,
    };

    // ==========================================
    // CAPA BREAKDOWN
    // ==========================================

    const capaBreakdown = {
      open: 0,
      in_progress: 0,
      completed: 0,
    };

    let totalFindings = 0;

    // ==========================================
    // CALCULATE ANALYSIS STATISTICS
    // ==========================================

    for (const analysis of analyses) {
      const riskLevel = analysis.riskLevel;

      if (
        Object.hasOwn(riskBreakdown, riskLevel)
      ) {
        riskBreakdown[riskLevel]++;
      } else {
        riskBreakdown.unknown++;
      }

      const reviewStatus = analysis.reviewStatus;

      if (
        Object.hasOwn(
          reviewBreakdown,
          reviewStatus
        )
      ) {
        reviewBreakdown[reviewStatus]++;
      }

      const findings = Array.isArray(
        analysis.findings
      )
        ? analysis.findings
        : [];

      totalFindings += findings.length;

      for (const finding of findings) {
        if (
          Object.hasOwn(
            findingBreakdown,
            finding.status
          )
        ) {
          findingBreakdown[finding.status]++;
        }
      }
    }

    // ==========================================
    // CALCULATE AUDIT STATISTICS
    // ==========================================

    for (const audit of audits) {
      if (
        Object.hasOwn(
          auditBreakdown,
          audit.status
        )
      ) {
        auditBreakdown[audit.status]++;
      }
    }

    // ==========================================
    // CALCULATE CAPA STATISTICS
    // ==========================================

    for (const capa of capas) {
      if (
        Object.hasOwn(
          capaBreakdown,
          capa.status
        )
      ) {
        capaBreakdown[capa.status]++;
      }
    }

    // ==========================================
    // DATE-BASED STATISTICS
    // ==========================================

    const today = new Date()
      .toLocaleDateString("en-CA", {
        timeZone: "Asia/Kolkata",
      });

    const isPastDate = (value) => {
      if (!value) return false;

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return false;
      }

      return (
        date.toISOString().slice(0, 10) < today
      );
    };

    // Expired pharmacy licenses
    const expiredLicenses = pharmacies.filter(
      (pharmacy) =>
        isPastDate(pharmacy.licenseExpiryDate)
    ).length;

    // Overdue CAPAs
    const overdueCAPAs = capas.filter(
      (capa) =>
        capa.status !== "completed" &&
        isPastDate(capa.dueDate)
    ).length;

    // ==========================================
    // DOCUMENT STATISTICS
    // ==========================================

    const analyzedDocuments = documents.filter(
      (document) =>
        document.analysisStatus === "completed"
    ).length;

    const pendingDocuments = documents.filter(
      (document) =>
        document.analysisStatus === "pending"
    ).length;

    const documentsNeedingAttention =
      documents.filter(
        (document) =>
          document.extractionStatus !== "completed" ||
          document.analysisStatus === "failed"
      ).length;

    // ==========================================
    // RECENT COMPLIANCE ANALYSES
    // ==========================================

    const recentAnalyses = analyses
      .slice(0, 5)
      .map((analysis) => ({
        id: analysis._id,

        documentId: analysis.document,

        riskLevel: analysis.riskLevel,

        reviewStatus: analysis.reviewStatus,

        findingsCount: Array.isArray(
          analysis.findings
        )
          ? analysis.findings.length
          : 0,

        createdAt: analysis.createdAt,
      }));

    // ==========================================
    // DASHBOARD RESPONSE
    // ==========================================

    return res.status(200).json({
      success: true,

      scope: {
        type: req.isSuperAdmin
          ? "platform"
          : "organization",

        organizationId: req.isSuperAdmin
          ? null
          : req.tenantId,

        role: req.user.role,
      },

      stats: {
        // Organization and pharmacy statistics
        totalOrganizations: organizations.length,

        totalPharmacies: pharmacies.length,

        // Document statistics
        totalDocuments: documents.length,

        analyzedDocuments,

        pendingDocuments,

        documentsNeedingAttention,

        // AI analysis statistics
        totalAnalyses: analyses.length,

        totalFindings,

        // Human review statistics
        pendingReviews: reviewBreakdown.pending,

        approvedReviews: reviewBreakdown.approved,

        rejectedReviews: reviewBreakdown.rejected,

        legacyReviewed: reviewBreakdown.reviewed,

        // Audit statistics
        totalAudits: audits.length,

        plannedAudits: auditBreakdown.planned,

        inProgressAudits:
          auditBreakdown.in_progress,

        completedAudits:
          auditBreakdown.completed,

        // CAPA statistics
        totalCAPAs: capas.length,

        openCAPAs: capaBreakdown.open,

        inProgressCAPAs:
          capaBreakdown.in_progress,

        completedCAPAs:
          capaBreakdown.completed,

        overdueCAPAs,

        // License statistics
        expiredLicenses,

        // Chart data
        riskBreakdown,

        findingBreakdown,

        reviewBreakdown,

        auditBreakdown,

        capaBreakdown,
      },

      recentAnalyses,
    });
  } catch (error) {
    console.error(
      "Dashboard statistics error:",
      error.message
    );

    return res.status(error.status || 500).json({
      success: false,

      message:
        error.status === 403
          ? "Organization access denied."
          : "Failed to retrieve dashboard statistics.",
    });
  }
};
