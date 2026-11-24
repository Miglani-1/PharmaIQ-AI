
import mongoose from "mongoose";

import Organization from "../models/Organization.js";
import Pharmacy from "../models/Pharmacy.js";
import Document from "../models/Document.js";
import Audit from "../models/Audit.js";

// ==========================================
// VALIDATE OBJECT ID
// ==========================================

export const isValidId = (id) => {
  return mongoose.isValidObjectId(id);
};

// ==========================================
// VALIDATE TENANT CONTEXT
// ==========================================

const validateTenantContext = (req) => {
  if (!req.user) {
    const error = new Error("Authentication required.");
    error.status = 401;
    throw error;
  }

  if (
    req.user.role === "super_admin" &&
    req.isSuperAdmin === true
  ) {
    return;
  }

  const allowedRoles = [
    "organization_admin",
    "pharmacist",
    "auditor",
  ];

  if (
    !allowedRoles.includes(req.user.role) ||
    !req.tenantId ||
    !isValidId(req.tenantId)
  ) {
    const error = new Error("Organization access denied.");
    error.status = 403;
    throw error;
  }
};

const hasPlatformAccess = (req) => {
  return (
    req.user?.role === "super_admin" &&
    req.isSuperAdmin === true
  );
};

// ==========================================
// ORGANIZATION SCOPE
// ==========================================

export const getOrganizationFilter = (req) => {
  validateTenantContext(req);

  if (hasPlatformAccess(req)) {
    return {};
  }

  return {
    _id: req.tenantId,
    isActive: true,
  };
};

export const getOrganizationIds = async (req) => {
  const organizations = await Organization.find(
    getOrganizationFilter(req)
  )
    .select("_id")
    .lean();

  return organizations.map((item) => item._id);
};

// ==========================================
// PHARMACY SCOPE
// ==========================================

export const getPharmacyFilter = async (req) => {
  const organizationIds = await getOrganizationIds(req);

  return {
    organization: {
      $in: organizationIds,
    },
  };
};

export const getPharmacyIds = async (req) => {
  const pharmacies = await Pharmacy.find(
    await getPharmacyFilter(req)
  )
    .select("_id")
    .lean();

  return pharmacies.map((item) => item._id);
};

// ==========================================
// DOCUMENT SCOPE
// ==========================================

export const getDocumentFilter = async (req) => {
  const pharmacyIds = await getPharmacyIds(req);

  return {
    pharmacy: {
      $in: pharmacyIds,
    },
  };
};

export const getDocumentIds = async (req) => {
  const documents = await Document.find(
    await getDocumentFilter(req)
  )
    .select("_id")
    .lean();

  return documents.map((item) => item._id);
};

// ==========================================
// COMPLIANCE ANALYSIS SCOPE
// ==========================================

export const getAnalysisFilter = async (req) => {
  const documentIds = await getDocumentIds(req);

  return {
    document: {
      $in: documentIds,
    },
  };
};

// ==========================================
// AUDIT SCOPE
// ==========================================

export const getAuditFilter = async (req) => {
  const pharmacyIds = await getPharmacyIds(req);

  return {
    pharmacy: {
      $in: pharmacyIds,
    },
  };
};

export const getAuditIds = async (req) => {
  const audits = await Audit.find(
    await getAuditFilter(req)
  )
    .select("_id")
    .lean();

  return audits.map((item) => item._id);
};

// ==========================================
// CAPA SCOPE
// ==========================================

export const getCAPAFilter = async (req) => {
  const auditIds = await getAuditIds(req);

  return {
    audit: {
      $in: auditIds,
    },
  };
};

// ==========================================
// FIND ACCESSIBLE ORGANIZATION
// ==========================================

export const findAccessibleOrganization = async (
  req,
  organizationId
) => {
  if (!isValidId(organizationId)) {
    return null;
  }

  return Organization.findOne({
    $and: [
      { _id: organizationId },
      getOrganizationFilter(req),
    ],
  });
};

// ==========================================
// FIND ACCESSIBLE PHARMACY
// ==========================================

export const findAccessiblePharmacy = async (
  req,
  pharmacyId
) => {
  if (!isValidId(pharmacyId)) {
    return null;
  }

  return Pharmacy.findOne({
    $and: [
      { _id: pharmacyId },
      await getPharmacyFilter(req),
    ],
  });
};

// ==========================================
// FIND ACCESSIBLE DOCUMENT
// ==========================================

export const findAccessibleDocument = async (
  req,
  documentId,
  includeText = false
) => {
  if (!isValidId(documentId)) {
    return null;
  }

  const query = Document.findOne({
    $and: [
      { _id: documentId },
      await getDocumentFilter(req),
    ],
  });

  if (includeText) {
    query.select("+extractedText");
  }

  return query;
};

// ==========================================
// FIND ACCESSIBLE AUDIT
// ==========================================

export const findAccessibleAudit = async (
  req,
  auditId
) => {
  if (!isValidId(auditId)) {
    return null;
  }

  return Audit.findOne({
    $and: [
      { _id: auditId },
      await getAuditFilter(req),
    ],
  });
};
