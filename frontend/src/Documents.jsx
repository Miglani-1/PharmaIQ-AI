import { useCallback, useEffect, useRef, useState } from "react";

import {
  UploadCloud,
  FileText,
  BrainCircuit,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Search,
  Filter,
  Download,
  FileCheck2,
  FileWarning,
  Sparkles,
  X,
  Building2,
  ShieldCheck,
  Clock3,
  ArrowRight,
} from "lucide-react";

import api from "./api";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const documentTypes = [
  { value: "license", label: "Drug License" },
  { value: "inspection", label: "Inspection Report" },
  { value: "sop", label: "Standard Operating Procedure" },
  { value: "quality", label: "Quality Record" },
  { value: "other", label: "Other" },
];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

const formatStatus = (value) =>
  String(value || "unknown").replaceAll("_", " ");

function StatusBadge({ value }) {
  const status = String(
    value || "unknown"
  ).toLowerCase();

  const styles = {
    completed:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    analyzed:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    approved:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    pending:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    not_analyzed:
      "bg-slate-500/10 text-slate-500 dark:text-slate-400",

    needs_ocr:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    failed:
      "bg-red-500/10 text-red-600 dark:text-red-400",

    rejected:
      "bg-red-500/10 text-red-600 dark:text-red-400",

    high:
      "bg-red-500/10 text-red-600 dark:text-red-400",

    medium:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    low:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    potential_gap:
      "bg-orange-500/10 text-orange-600 dark:text-orange-400",

    not_verified:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    observation:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize ${
        styles[status] ||
        "bg-slate-500/10 text-slate-500 dark:text-slate-400"
      }`}
    >
      {formatStatus(value)}
    </span>
  );
}

function MetricCard({
  title,
  value,
  Icon,
  color,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-[#142033]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <h3 className="mt-4 text-3xl font-extrabold text-slate-900 dark:text-white">
        {value}
      </h3>
    </div>
  );
}

export default function Documents({
  user,
  onBack,
}) {
  // Role-based permissions

  const canUpload = [
    "super_admin",
    "organization_admin",
    "pharmacist",
  ].includes(user?.role);

  const canAnalyze = canUpload;

  const canViewReports = [
    "super_admin",
    "organization_admin",
    "pharmacist",
    "auditor",
  ].includes(user?.role);

  const roleLabel =
    ROLE_LABELS[user?.role] || "Unknown Role";

  const isSuperAdmin =
    user?.role === "super_admin";

  // Document states

  const [pharmacies, setPharmacies] =
    useState([]);

  const [documents, setDocuments] =
    useState([]);

  const [analyses, setAnalyses] =
    useState([]);

  const [pharmacyId, setPharmacyId] =
    useState("");

  const [documentName, setDocumentName] =
    useState("");

  const [documentType, setDocumentType] =
    useState("license");

  const [file, setFile] = useState(null);

  // Request states

  const [uploading, setUploading] =
    useState(false);

  const [analyzingId, setAnalyzingId] =
    useState(null);

  const [downloadingId, setDownloadingId] =
    useState(null);

  const [analysis, setAnalysis] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  // Search and filter states

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState("all");

  const [dragActive, setDragActive] =
    useState(false);

  const fileInputRef = useRef(null);

  const reportRef = useRef(null);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  // Only active pharmacies can receive documents

  const activePharmacies = pharmacies.filter(
    (pharmacy) =>
      pharmacy.status !== "inactive"
  );

  // Load tenant-scoped data

  const loadData = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const [
          pharmacyResponse,
          documentResponse,
          analysisResponse,
        ] = await Promise.all([
          api.get("/pharmacy/get", {
            signal,
          }),

          api.get("/documents/get", {
            signal,
          }),

          api.get("/analysis/get", {
            signal,
          }),
        ]);

        if (signal?.aborted) return;

        setPharmacies(
          pharmacyResponse.data.pharmacies ||
            []
        );

        setDocuments(
          documentResponse.data.documents ||
            []
        );

        setAnalyses(
          analysisResponse.data.analyses ||
            []
        );
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setPharmacies([]);
        setDocuments([]);
        setAnalyses([]);
        setAnalysis(null);

        setError(
          err.response?.data?.message ||
            "Unable to load pharmacies and documents."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Initial data loading

  useEffect(() => {
    const controller =
      new AbortController();

    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadData]);

  // Scroll to selected analysis report

  useEffect(() => {
    if (analysis) {
      reportRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [analysis]);

  // Remove selected PDF

  const clearFile = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Validate selected PDF

  const validateFile = (selectedFile) => {
    if (!canUpload || uploading) {
      return false;
    }

    if (!selectedFile) return false;

    const hasPdfExtension =
      selectedFile.name
        .toLowerCase()
        .endsWith(".pdf");

    const hasValidMimeType =
      selectedFile.type === "application/pdf" ||
      selectedFile.type === "";

    if (
      !hasPdfExtension ||
      !hasValidMimeType
    ) {
      clearFile();

      setError(
        "Only PDF files are allowed."
      );

      return false;
    }

    if (selectedFile.size === 0) {
      clearFile();

      setError(
        "The selected PDF is empty."
      );

      return false;
    }

    if (
      selectedFile.size > MAX_FILE_SIZE
    ) {
      clearFile();

      setError(
        "PDF must be 10 MB or smaller."
      );

      return false;
    }

    setError("");
    setFile(selectedFile);

    return true;
  };

  // Drag and drop

  const handleDrop = (event) => {
    event.preventDefault();

    setDragActive(false);

    if (!canUpload || uploading) {
      return;
    }

    const selectedFile =
      event.dataTransfer.files?.[0];

    validateFile(selectedFile);
  };

  // Upload document

  const handleUpload = async (event) => {
    event.preventDefault();

    if (uploading) return;

    setError("");
    setSuccess("");

    // Role permission check

    if (!canUpload) {
      setError(
        "You do not have permission to upload documents."
      );

      return;
    }

    // Required fields

    if (
      !pharmacyId ||
      !documentName.trim() ||
      !file
    ) {
      setError(
        "Please fill all fields and select a PDF."
      );

      return;
    }

    // Document name validation

    if (
      documentName.trim().length > 150
    ) {
      setError(
        "Document name must not exceed 150 characters."
      );

      return;
    }

    // Pharmacy validation

    const selectedPharmacy =
      activePharmacies.find(
        (pharmacy) =>
          pharmacy._id === pharmacyId
      );

    if (!selectedPharmacy) {
      setError(
        "Please select an accessible active pharmacy."
      );

      return;
    }

    // Document type validation

    if (
      !documentTypes.some(
        (type) =>
          type.value === documentType
      )
    ) {
      setError(
        "Please select a valid document type."
      );

      return;
    }

    if (!validateFile(file)) return;

    const formData = new FormData();

    formData.append("file", file);

    formData.append(
      "pharmacyId",
      pharmacyId
    );

    formData.append(
      "documentName",
      documentName.trim()
    );

    formData.append(
      "documentType",
      documentType
    );

    try {
      setUploading(true);

      const response = await api.post(
        "/documents/upload",
        formData
      );

      const uploaded =
        response.data.document;

      setDocumentName("");

      clearFile();

      setAnalysis(null);

      await loadData();

      setSuccess(
        `Document uploaded successfully. Extraction: ${formatStatus(
          uploaded?.extractionStatus
        )}`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "PDF upload failed. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  // Run AI analysis

  const handleAnalyze = async (
    documentId
  ) => {
    if (analyzingId !== null) return;

    setError("");
    setSuccess("");

    // Role permission check

    if (!canAnalyze) {
      setError(
        "You do not have permission to run AI analysis."
      );

      return;
    }

    // Document access check

    const selectedDocument =
      documents.find(
        (doc) => doc._id === documentId
      );

    if (!selectedDocument) {
      setError(
        "Document is not accessible."
      );

      return;
    }

    if (
      selectedDocument.extractionStatus !==
      "completed"
    ) {
      setError(
        "Document text extraction must be completed before AI analysis."
      );

      return;
    }

    setAnalysis(null);

    try {
      setAnalyzingId(documentId);

      const response = await api.post(
        `/analysis/analyze/${documentId}`
      );

      const result =
        response.data.analysis;

      await loadData();

      setAnalysis(result);

      setSuccess(
        "Gemini AI analysis completed successfully!"
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "AI analysis failed. Please try again."
      );
    } finally {
      setAnalyzingId(null);
    }
  };

  // Resolve analysis document ID

  const getAnalysisDocumentId = (
    item
  ) => {
    if (
      item.document &&
      typeof item.document === "object"
    ) {
      return (
        item.document._id ||
        item.document.id
      );
    }

    return item.document;
  };

  // Get latest analysis for a document

  const getLatestAnalysis = (
    documentId
  ) => {
    return analyses
      .filter(
        (item) =>
          String(
            getAnalysisDocumentId(item)
          ) === String(documentId)
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) -
          new Date(a.createdAt || 0)
      )[0];
  };

  // View existing AI analysis

  const handleViewAnalysis = (
    analysisId
  ) => {
    if (!canViewReports) {
      setError(
        "You do not have permission to view reports."
      );

      return;
    }

    const selectedAnalysis =
      analyses.find(
        (item) =>
          item._id === analysisId
      );

    if (!selectedAnalysis) {
      setError(
        "Analysis report is not available."
      );

      return;
    }

    setError("");
    setSuccess("");

    setAnalysis(selectedAnalysis);
  };

  // Download compliance PDF report

  const downloadReport = async (
    analysisId
  ) => {
    if (downloadingId !== null) return;

    if (!canViewReports) {
      setError(
        "You do not have permission to download reports."
      );

      return;
    }

    if (!analysisId) {
      setError(
        "Invalid analysis report."
      );

      return;
    }

    try {
      setDownloadingId(analysisId);
      setError("");

      const response = await api.get(
        `/reports/${analysisId}/download`,
        {
          responseType: "blob",
        }
      );

      const contentType =
        response.headers["content-type"] ||
        "";

      if (
        !contentType.includes(
          "application/pdf"
        )
      ) {
        throw new Error(
          "Invalid PDF response."
        );
      }

      const url =
        window.URL.createObjectURL(
          response.data
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `PharmaIQ-Compliance-${analysisId}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch {
      setError(
        "Failed to download compliance report."
      );
    } finally {
      setDownloadingId(null);
    }
  };

  // Search and filter documents

  const filteredDocuments =
    documents.filter((doc) => {
      const text = [
        doc.documentName,
        doc.documentType,
        doc.pharmacy?.pharmacyName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        text.includes(
          search.trim().toLowerCase()
        );

      let matchesFilter = true;

      if (filter === "completed") {
        matchesFilter =
          doc.extractionStatus ===
          "completed";
      } else if (
        filter === "needs_ocr"
      ) {
        matchesFilter =
          doc.extractionStatus ===
          "needs_ocr";
      } else if (
        filter === "analyzed"
      ) {
        matchesFilter =
          doc.analysisStatus ===
          "completed";
      } else if (
        filter === "pending"
      ) {
        matchesFilter =
          doc.analysisStatus !==
            "completed" &&
          doc.extractionStatus ===
            "completed";
      } else if (
        filter === "failed"
      ) {
        matchesFilter =
          doc.extractionStatus ===
            "failed" ||
          doc.analysisStatus ===
            "failed";
      }

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  // Document statistics

  const analyzedCount =
    documents.filter(
      (doc) =>
        doc.analysisStatus ===
        "completed"
    ).length;

  const readyCount =
    documents.filter(
      (doc) =>
        doc.extractionStatus ===
        "completed"
    ).length;

  const needsAttention =
    documents.filter(
      (doc) =>
        doc.extractionStatus ===
          "needs_ocr" ||
        doc.extractionStatus ===
          "failed" ||
        doc.analysisStatus ===
          "failed"
    ).length;

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">
      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Document Intelligence
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Compliance Documents
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {canAnalyze
              ? "Manage pharmaceutical records and run AI-assisted compliance analysis."
              : "Browse pharmaceutical records and review existing AI compliance reports."}
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
        >
          <ArrowLeft size={17} />

          Dashboard
        </button>
      </div>

      {/* Hero section */}

      <section className="relative overflow-hidden rounded-3xl bg-[#103b46] text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c2935] to-[#146b6a]" />

        <div className="relative flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100">
              <Sparkles size={14} />

              Intelligent Document Workspace
            </div>

            <h2 className="text-2xl font-extrabold sm:text-3xl">
              Your documents.

              <br />

              <span className="text-teal-200">
                Smarter insights.
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              {canUpload
                ? "Upload pharmacy documents, extract their content, and identify potential compliance gaps using AI."
                : "Access your organization's documents and existing AI-assisted compliance findings."}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
              <ShieldCheck size={15} />

              {roleLabel}
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10 backdrop-blur-md">
            <FileCheck2
              size={64}
              className="text-teal-100"
            />
          </div>
        </div>
      </section>

      {/* Workspace permissions */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
            <ShieldCheck size={22} />
          </div>

          <div>
            <p className="text-sm font-bold">
              {isSuperAdmin
                ? "Platform-wide Document Access"
                : "Organization-level Document Access"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {canUpload
                ? "You can upload documents, run AI analysis and access available reports within your authorized workspace."
                : "You can view documents and download existing reports. Upload and AI analysis are restricted."}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
          {canUpload
            ? "Upload & Analysis Enabled"
            : "Read-only Access"}
        </span>
      </section>

      {/* Metrics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Documents"
          value={documents.length}
          Icon={FileText}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Extraction Ready"
          value={readyCount}
          Icon={CheckCircle2}
          color="bg-teal-500/10 text-teal-500"
        />

        <MetricCard
          title="AI Analyzed"
          value={analyzedCount}
          Icon={BrainCircuit}
          color="bg-violet-500/10 text-violet-500"
        />

        <MetricCard
          title="Needs Attention"
          value={needsAttention}
          Icon={FileWarning}
          color="bg-amber-500/10 text-amber-500"
        />
      </div>

      {/* Error notification */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle
            size={19}
            className="shrink-0"
          />

          <span className="flex-1">
            {error}
          </span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Success notification */}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 text-sm text-teal-600 dark:text-teal-400"
        >
          <CheckCircle2
            size={19}
            className="shrink-0"
          />

          <span className="flex-1">
            {success}
          </span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss notification"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Upload section - authorized roles only */}

      {canUpload && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
              <UploadCloud size={24} />
            </div>

            <div>
              <h3 className="text-lg font-bold">
                Upload New Document
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Add a PDF to your compliance
                workspace.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleUpload}
            className="space-y-5"
          >
            <div className="grid gap-5 md:grid-cols-2">
              {/* Pharmacy selection */}

              <div>
                <label
                  htmlFor="document-pharmacy"
                  className="mb-2 block text-sm font-semibold"
                >
                  Select Pharmacy
                </label>

                <select
                  id="document-pharmacy"
                  required
                  disabled={
                    uploading || loading
                  }
                  value={pharmacyId}
                  onChange={(e) =>
                    setPharmacyId(
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  <option value="">
                    Choose pharmacy
                  </option>

                  {activePharmacies.map(
                    (pharmacy) => (
                      <option
                        key={pharmacy._id}
                        value={pharmacy._id}
                      >
                        {pharmacy.pharmacyName}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Document type */}

              <div>
                <label
                  htmlFor="document-type"
                  className="mb-2 block text-sm font-semibold"
                >
                  Document Type
                </label>

                <select
                  id="document-type"
                  value={documentType}
                  disabled={uploading}
                  onChange={(e) =>
                    setDocumentType(
                      e.target.value
                    )
                  }
                  className={inputClass}
                >
                  {documentTypes.map(
                    (type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            {/* Document name */}

            <div>
              <label
                htmlFor="document-name"
                className="mb-2 block text-sm font-semibold"
              >
                Document Name
              </label>

              <input
                id="document-name"
                type="text"
                required
                maxLength={150}
                disabled={uploading}
                value={documentName}
                onChange={(e) =>
                  setDocumentName(
                    e.target.value
                  )
                }
                placeholder="e.g. Drug License 2026"
                className={inputClass}
              />
            </div>

            {/* Drag and drop upload */}

            <div>
              <label
                htmlFor="pdf-file"
                className="mb-2 block text-sm font-semibold"
              >
                Upload PDF File
              </label>

              <div
                onDragEnter={(e) => {
                  e.preventDefault();

                  if (!uploading) {
                    setDragActive(true);
                  }
                }}
                onDragOver={(e) =>
                  e.preventDefault()
                }
                onDragLeave={(e) => {
                  e.preventDefault();

                  setDragActive(false);
                }}
                onDrop={handleDrop}
                className={`rounded-2xl border-2 border-dashed p-7 text-center transition ${
                  dragActive
                    ? "border-teal-500 bg-teal-500/10"
                    : "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/60"
                }`}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-500">
                  <UploadCloud size={28} />
                </div>

                <p className="break-all font-semibold">
                  {file
                    ? file.name
                    : "Drag & drop your PDF here"}
                </p>

                {file && (
                  <p className="mt-2 text-xs text-teal-600 dark:text-teal-400">
                    {(
                      file.size /
                      (1024 * 1024)
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                )}

                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  PDF files only · Maximum 10 MB
                </p>

                <input
                  ref={fileInputRef}
                  id="pdf-file"
                  type="file"
                  disabled={uploading}
                  accept=".pdf,application/pdf"
                  onChange={(e) =>
                    validateFile(
                      e.target.files?.[0]
                    )
                  }
                  className="sr-only"
                />

                <button
                  type="button"
                  disabled={uploading}
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="mt-5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-5 py-2.5 text-sm font-bold text-teal-600 hover:bg-teal-500/20 disabled:opacity-50 dark:text-teal-400"
                >
                  Browse Files
                </button>

                {file && (
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={clearFile}
                    className="ml-3 text-sm font-semibold text-red-500 disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Upload button */}

            <button
              type="submit"
              disabled={
                uploading ||
                loading ||
                activePharmacies.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <RefreshCw
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <UploadCloud size={18} />
              )}

              {uploading
                ? "Uploading PDF..."
                : "Upload Document"}
            </button>

            {activePharmacies.length === 0 &&
              !loading && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  No active pharmacies are
                  available. Contact your
                  administrator to register or
                  activate a pharmacy.
                </p>
              )}
          </form>
        </section>
      )}

      {/* Document library */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              Document Library
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {documents.length} accessible
              documents
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={
              loading ||
              uploading ||
              analyzingId !== null
            }
            title="Refresh documents"
            aria-label="Refresh documents"
            className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={18}
              className={
                loading ? "animate-spin" : ""
              }
            />
          </button>
        </div>

        {/* Search and filters */}

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search documents or pharmacies..."
              aria-label="Search documents"
              className={`${inputClass} pl-11`}
            />
          </div>

          <div className="relative">
            <Filter
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value)
              }
              aria-label="Filter documents"
              className={`${inputClass} pl-11`}
            >
              <option value="all">
                All Documents
              </option>

              <option value="completed">
                Extraction Ready
              </option>

              <option value="needs_ocr">
                Needs OCR
              </option>

              <option value="analyzed">
                AI Analyzed
              </option>

              <option value="pending">
                Pending Analysis
              </option>

              <option value="failed">
                Failed
              </option>
            </select>
          </div>
        </div>

        {/* Loading state */}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <RefreshCw
              size={20}
              className="animate-spin"
            />

            Loading documents...
          </div>
        ) : filteredDocuments.length === 0 ? (
          /* Empty state */

          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <FileText size={32} />
            </div>

            <h4 className="font-bold">
              {error
                ? "Unable to load documents"
                : documents.length === 0
                ? "No documents uploaded yet"
                : "No matching documents"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error
                ? "Refresh the document library to try again."
                : documents.length === 0
                ? canUpload
                  ? "Upload your first PDF to get started."
                  : "No documents are available in your assigned workspace."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          /* Document cards */

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredDocuments.map((doc) => {
              const latestAnalysis =
                getLatestAnalysis(doc._id);

              return (
                <article
                  key={doc._id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
                >
                  {/* Document heading */}

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                      <FileText size={25} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="break-words font-bold">
                        {doc.documentName}
                      </h4>

                      <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">
                        {formatStatus(
                          doc.documentType
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Pharmacy information */}

                  <div className="mt-5 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <Building2 size={16} />

                    <span className="truncate">
                      {doc.pharmacy
                        ?.pharmacyName ||
                        "Unknown Pharmacy"}
                    </span>
                  </div>

                  {/* Document statuses */}

                  <div className="mt-4 flex flex-wrap gap-4">
                    <div>
                      <p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                        Text Extraction
                      </p>

                      <StatusBadge
                        value={
                          doc.extractionStatus
                        }
                      />
                    </div>

                    <div>
                      <p className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">
                        AI Analysis
                      </p>

                      <StatusBadge
                        value={
                          doc.analysisStatus
                        }
                      />
                    </div>
                  </div>

                  {/* OCR warning */}

                  {doc.extractionStatus ===
                    "needs_ocr" && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-600 dark:text-amber-400">
                      <FileWarning
                        size={16}
                        className="shrink-0"
                      />

                      This document requires OCR
                      before AI analysis.
                    </div>
                  )}

                  {/* Latest analysis details */}

                  {latestAnalysis && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-semibold">
                        Latest Analysis
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          value={
                            latestAnalysis.riskLevel
                          }
                        />

                        <StatusBadge
                          value={
                            latestAnalysis.reviewStatus
                          }
                        />
                      </div>
                    </div>
                  )}

                  {/* Document actions */}

                  <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {/* Analyze - authorized roles */}

                    {canAnalyze && (
                      <button
                        type="button"
                        onClick={() =>
                          handleAnalyze(
                            doc._id
                          )
                        }
                        disabled={
                          analyzingId !== null ||
                          uploading ||
                          doc.extractionStatus !==
                            "completed"
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {analyzingId ===
                        doc._id ? (
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <BrainCircuit
                            size={17}
                          />
                        )}

                        {analyzingId ===
                        doc._id
                          ? "Analyzing..."
                          : doc.analysisStatus ===
                            "completed"
                          ? "Analyze Again"
                          : "Analyze with AI"}

                        {analyzingId !==
                          doc._id && (
                          <ArrowRight
                            size={16}
                          />
                        )}
                      </button>
                    )}

                    {/* View and download existing report */}

                    {canViewReports &&
                      latestAnalysis && (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleViewAnalysis(
                                latestAnalysis._id
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-teal-500/30 px-3 py-3 text-sm font-semibold text-teal-600 hover:bg-teal-500/10 dark:text-teal-400"
                          >
                            <FileCheck2
                              size={17}
                            />

                            View Report
                          </button>

                          <button
                            type="button"
                            disabled={
                              downloadingId !==
                              null
                            }
                            onClick={() =>
                              downloadReport(
                                latestAnalysis._id
                              )
                            }
                            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            {downloadingId ===
                            latestAnalysis._id ? (
                              <RefreshCw
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Download
                                size={17}
                              />
                            )}

                            Download PDF
                          </button>
                        </div>
                      )}

                    {/* Read-only role information */}

                    {!canAnalyze &&
                      !latestAnalysis && (
                        <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <ShieldCheck
                            size={15}
                          />

                          No analysis report
                          available yet.
                        </p>
                      )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* AI analysis report */}

      {analysis && canViewReports && (
        <section
          ref={reportRef}
          className="scroll-mt-28 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7"
        >
          {/* Report heading */}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-violet-500/10 p-3 text-violet-500">
                <BrainCircuit size={24} />
              </div>

              <div>
                <h3 className="text-xl font-extrabold">
                  AI Compliance Report
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Gemini AI-assisted document
                  assessment
                </p>

                {analysis.document
                  ?.documentName && (
                  <p className="mt-1 text-xs text-teal-600 dark:text-teal-400">
                    {
                      analysis.document
                        .documentName
                    }
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadReport(
                    analysis._id
                  )
                }
                disabled={
                  downloadingId !== null
                }
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {downloadingId ===
                analysis._id ? (
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={17} />
                )}

                {downloadingId ===
                analysis._id
                  ? "Downloading..."
                  : "Download PDF Report"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setAnalysis(null)
                }
                aria-label="Close report"
                title="Close report"
                className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Risk and review statuses */}

          <div className="mt-6 flex flex-wrap gap-5">
            <div>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                Risk Level
              </p>

              <StatusBadge
                value={analysis.riskLevel}
              />
            </div>

            <div>
              <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                Human Review
              </p>

              <StatusBadge
                value={analysis.reviewStatus}
              />
            </div>

            {analysis.modelUsed && (
              <div>
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">
                  AI Model
                </p>

                <p className="text-xs font-semibold">
                  {analysis.modelUsed}
                </p>
              </div>
            )}
          </div>

          {/* Executive summary */}

          <div className="mt-6 rounded-xl bg-slate-50 p-5 dark:bg-slate-900">
            <h4 className="mb-2 flex items-center gap-2 font-bold">
              <ShieldCheck
                size={18}
                className="text-teal-500"
              />

              Executive Summary
            </h4>

            <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
              {analysis.summary ||
                "No summary available."}
            </p>
          </div>

          {/* Compliance findings */}

          <div className="mt-7">
            <h4 className="mb-4 text-lg font-bold">
              Compliance Findings (
              {analysis.findings?.length ||
                0}
              )
            </h4>

            <div className="space-y-4">
              {(analysis.findings || []).map(
                (finding, index) => (
                  <article
                    key={
                      finding._id || index
                    }
                    className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-900/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <h5 className="font-bold">
                        {index + 1}.{" "}
                        {finding.title}
                      </h5>

                      <StatusBadge
                        value={
                          finding.severity
                        }
                      />
                    </div>

                    <div className="mt-3">
                      <StatusBadge
                        value={
                          finding.status
                        }
                      />
                    </div>

                    <div className="mt-4 space-y-4 text-sm">
                      {/* Evidence */}

                      <div>
                        <p className="mb-1 font-semibold">
                          Evidence
                        </p>

                        <p className="whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">
                          {finding.evidence ||
                            "Not provided"}
                        </p>
                      </div>

                      {/* Recommendation */}

                      <div>
                        <p className="mb-1 font-semibold">
                          Recommendation
                        </p>

                        <p className="whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">
                          {finding.recommendation ||
                            "Not provided"}
                        </p>
                      </div>

                      {/* Regulatory reference */}

                      <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                        <Clock3
                          size={15}
                          className="shrink-0"
                        />

                        <div>
                          <p className="font-semibold">
                            AI-suggested rule
                            reference (unverified)
                          </p>

                          <p className="mt-1">
                            {finding.ruleReference ||
                              "Not specified"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              )}

              {!analysis.findings?.length && (
                <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  No findings returned by the
                  analysis. This does not
                  establish regulatory
                  compliance.
                </p>
              )}
            </div>
          </div>

          {/* Human review information */}

          <div className="mt-7 rounded-xl border border-slate-200 p-5 dark:border-slate-700">
            <h4 className="mb-4 flex items-center gap-2 font-bold">
              <ShieldCheck
                size={18}
                className="text-teal-500"
              />

              Human Review
            </h4>

            <StatusBadge
              value={analysis.reviewStatus}
            />

            {analysis.reviewStatus ===
            "pending" ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                This analysis is awaiting
                authorized human review.
              </p>
            ) : (
              <div className="mt-4 space-y-3 text-sm">
                <p>
                  <strong>Reviewed by:</strong>{" "}
                  {analysis.reviewedBy?.name ||
                    "Not available"}
                </p>

                <p>
                  <strong>Reviewed on:</strong>{" "}
                  {analysis.reviewedAt
                    ? new Date(
                        analysis.reviewedAt
                      ).toLocaleString(
                        "en-IN"
                      )
                    : "Not available"}
                </p>

                <div>
                  <p className="font-semibold">
                    Review Comments
                  </p>

                  <p className="mt-2 whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">
                    {analysis.reviewComments ||
                      "No comments available."}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Compliance disclaimer */}

          <p className="mt-7 border-t border-slate-200 pt-5 text-xs leading-6 text-slate-500 dark:border-slate-700 dark:text-slate-400">
            AI-generated findings are advisory
            and require independent human
            review. Missing evidence does not
            establish a regulatory violation.
            This report is not an official
            compliance certification.
          </p>
        </section>
      )}
    </div>
  );
}