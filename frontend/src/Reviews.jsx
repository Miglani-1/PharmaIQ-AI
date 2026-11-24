import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  RefreshCw,
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  FileText,
  UserRound,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Lock,
  X,
} from "lucide-react";

import api from "./api";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function ReviewBadge({ status }) {
  const normalized = String(
    status || "pending"
  ).toLowerCase();

  const styles = {
    pending:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    approved:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    rejected:
      "bg-red-500/10 text-red-600 dark:text-red-400",

    reviewed:
      "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize ${
        styles[normalized] ||
        "bg-slate-500/10 text-slate-500"
      }`}
    >
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function RiskBadge({ level }) {
  const normalized = String(
    level || "unknown"
  ).toLowerCase();

  const styles = {
    low:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    medium:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    high:
      "bg-red-500/10 text-red-600 dark:text-red-400",

    unknown:
      "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold capitalize ${
        styles[normalized] ||
        styles.unknown
      }`}
    >
      {normalized} risk
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </span>

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

function FindingCard({ finding, index }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h5 className="flex-1 font-semibold">
          {index + 1}.{" "}
          {finding.title || "Untitled Finding"}
        </h5>

        <RiskBadge level={finding.severity} />
      </div>

      {finding.status && (
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Finding Status:{" "}

          <span className="font-semibold capitalize text-slate-700 dark:text-slate-200">
            {String(finding.status).replaceAll(
              "_",
              " "
            )}
          </span>
        </p>
      )}

      {finding.evidence && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Evidence
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
            {finding.evidence}
          </p>
        </div>
      )}

      {finding.recommendation && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recommendation
          </p>

          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">
            {finding.recommendation}
          </p>
        </div>
      )}

      {finding.ruleReference && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
          <p className="font-semibold text-slate-500 dark:text-slate-400">
            AI-suggested Rule Reference
            (Unverified)
          </p>

          <p className="mt-2 whitespace-pre-wrap leading-6">
            {finding.ruleReference}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Reviews({
  user,
  onBack,
}) {
  // Role-based permissions

  const canReview = [
    "super_admin",
    "auditor",
  ].includes(user?.role);

  const isSuperAdmin =
    user?.role === "super_admin";

  const currentUserId = getId(user);

  const roleLabel =
    ROLE_LABELS[user?.role] || "Unknown Role";

  // Application states

  const [analyses, setAnalyses] =
    useState([]);

  const [comments, setComments] =
    useState({});

  const [loading, setLoading] =
    useState(true);

  const [savingId, setSavingId] =
    useState(null);

  const [savingDecision, setSavingDecision] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [riskFilter, setRiskFilter] =
    useState("all");

  const [expandedIds, setExpandedIds] =
    useState({});

  // Load tenant-scoped reviews

  const loadReviews = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/reviews/get",
          { signal }
        );

        if (signal?.aborted) return;

        setAnalyses(
          response.data.analyses || []
        );
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setAnalyses([]);

        setError(
          err.response?.data?.message ||
            "Failed to load reviews."
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

    loadReviews(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadReviews]);

  // Prevent self-review

  const isOwnAnalysis = (analysis) => {
    const analyzedById = getId(
      analysis.analyzedBy
    );

    return Boolean(
      currentUserId &&
      analyzedById &&
      currentUserId === analyzedById
    );
  };

  // Check whether analysis can be reviewed

  const canReviewAnalysis = (analysis) => {
    return (
      canReview &&
      Boolean(currentUserId) &&
      Boolean(getId(analysis.analyzedBy)) &&
      !isOwnAnalysis(analysis) &&
      analysis.reviewStatus === "pending"
    );
  };

  // Submit human review

  const submitReview = async (
    analysisId,
    reviewStatus
  ) => {
    if (savingId !== null) return;

    setError("");
    setSuccess("");

    // Check role permissions

    if (!canReview) {
      setError(
        "Only Super Admins and Auditors can submit reviews."
      );

      return;
    }

    // Validate review decision

    if (
      !["approved", "rejected"].includes(
        reviewStatus
      )
    ) {
      setError("Invalid review decision.");

      return;
    }

    // Check accessible analysis

    const selectedAnalysis =
      analyses.find(
        (analysis) =>
          analysis._id === analysisId
      );

    if (!selectedAnalysis) {
      setError(
        "Analysis is not accessible."
      );

      return;
    }

    // Prevent reviewing own analysis

    if (isOwnAnalysis(selectedAnalysis)) {
      setError(
        "You cannot review an analysis that you generated yourself."
      );

      return;
    }

    // Check reviewer and author identities

    if (
      !currentUserId ||
      !getId(selectedAnalysis.analyzedBy)
    ) {
      setError(
        "Reviewer or analysis author identity could not be verified."
      );

      return;
    }

    // Prevent modifying completed reviews

    if (
      selectedAnalysis.reviewStatus !==
      "pending"
    ) {
      setError(
        "Only pending analyses can be reviewed."
      );

      return;
    }

    // Validate review comments

    const reviewComments =
      comments[analysisId]?.trim();

    if (!reviewComments) {
      setError(
        "Please enter review comments first."
      );

      return;
    }

    if (reviewComments.length > 5000) {
      setError(
        "Review comments must not exceed 5000 characters."
      );

      return;
    }

    try {
      setSavingId(analysisId);

      setSavingDecision(reviewStatus);

      const response = await api.patch(
        `/reviews/${analysisId}`,
        {
          reviewStatus,
          reviewComments,
        }
      );

      const updatedAnalysis =
        response.data.analysis;

      // Update the reviewed analysis locally

      if (updatedAnalysis?._id) {
        setAnalyses((previous) =>
          previous.map((analysis) =>
            analysis._id === analysisId
              ? {
                  ...analysis,
                  ...updatedAnalysis,
                }
              : analysis
          )
        );
      }

      setComments((previous) => ({
        ...previous,
        [analysisId]: "",
      }));

      await loadReviews();

      setSuccess(
        `Analysis ${reviewStatus} successfully.`
      );
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to submit review.";

      // Refresh if another reviewer
      // already completed the review.

      if (err.response?.status === 409) {
        await loadReviews();
      }

      setError(message);
    } finally {
      setSavingId(null);
      setSavingDecision("");
    }
  };

  // Expand or collapse findings

  const toggleFindings = (id) => {
    setExpandedIds((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  };

  // Review statistics

  const pendingCount = analyses.filter(
    (analysis) =>
      analysis.reviewStatus === "pending"
  ).length;

  const approvedCount = analyses.filter(
    (analysis) =>
      analysis.reviewStatus === "approved"
  ).length;

  const rejectedCount = analyses.filter(
    (analysis) =>
      analysis.reviewStatus === "rejected"
  ).length;

  const eligibleReviewCount =
    analyses.filter(canReviewAnalysis).length;

  // Search and filter analyses

  const filteredAnalyses =
    analyses.filter((analysis) => {
      const searchableText = [
        analysis.document?.documentName,
        analysis.summary,
        analysis.riskLevel,
        analysis.analyzedBy?.name,
        analysis.reviewedBy?.name,
        ...(analysis.findings || []).map(
          (finding) => finding.title
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(
          search.trim().toLowerCase()
        );

      const matchesStatus =
        statusFilter === "all" ||
        analysis.reviewStatus ===
          statusFilter;

      const matchesRisk =
        riskFilter === "all" ||
        String(
          analysis.riskLevel || "unknown"
        ).toLowerCase() === riskFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesRisk
      );
    });

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">
      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            AI Compliance Governance
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Human Review & Approval
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {canReview
              ? "Review AI-generated compliance findings and record independent human decisions."
              : "View AI-generated findings and recorded human review decisions."}
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
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b2935] to-[#146b6a]" />

        <div className="relative flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100">
              <Sparkles size={14} />

              Human-in-the-Loop AI
            </span>

            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
              AI identifies.

              <br />

              <span className="text-teal-200">
                Humans decide.
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Evaluate AI-generated findings,
              document reviewer observations
              and maintain independent human
              oversight of compliance decisions.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
              <ShieldCheck size={15} />

              {roleLabel}
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
            <ClipboardCheck
              size={62}
              className="text-teal-100"
            />
          </div>
        </div>
      </section>

      {/* Workspace permissions */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
            {canReview ? (
              <ShieldCheck size={22} />
            ) : (
              <Lock size={22} />
            )}
          </div>

          <div>
            <p className="text-sm font-bold">
              {isSuperAdmin
                ? "Platform-wide Review Access"
                : "Organization-level Review Access"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {canReview
                ? "You can approve or reject eligible pending analyses. Reviewing your own analysis is prohibited."
                : "You can view analyses and human review records. Approval and rejection are restricted to authorized reviewers."}
            </p>

            {canReview && (
              <p className="mt-2 text-xs font-semibold text-teal-600 dark:text-teal-400">
                {eligibleReviewCount} analyses
                eligible for your review
              </p>
            )}
          </div>
        </div>

        <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
          {canReview
            ? "Review Enabled"
            : "View Only"}
        </span>
      </section>

      {/* Metrics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Analyses"
          value={analyses.length}
          Icon={FileText}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Pending Review"
          value={pendingCount}
          Icon={Clock3}
          color="bg-amber-500/10 text-amber-500"
        />

        <MetricCard
          title="Approved"
          value={approvedCount}
          Icon={CheckCircle2}
          color="bg-teal-500/10 text-teal-500"
        />

        <MetricCard
          title="Rejected"
          value={rejectedCount}
          Icon={XCircle}
          color="bg-red-500/10 text-red-500"
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
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Review directory */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              Compliance Review Queue
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {analyses.length} accessible
              analyses
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadReviews()}
            disabled={
              loading || savingId !== null
            }
            title="Refresh reviews"
            aria-label="Refresh reviews"
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

        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_190px_190px]">
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
              placeholder="Search documents, summaries, findings..."
              aria-label="Search reviews"
              className={`${inputClass} pl-11`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            aria-label="Filter reviews by status"
            className={inputClass}
          >
            <option value="all">
              All Reviews
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="approved">
              Approved
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="reviewed">
              Legacy Reviewed
            </option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) =>
              setRiskFilter(e.target.value)
            }
            aria-label="Filter reviews by risk level"
            className={inputClass}
          >
            <option value="all">
              All Risk Levels
            </option>

            <option value="low">
              Low Risk
            </option>

            <option value="medium">
              Medium Risk
            </option>

            <option value="high">
              High Risk
            </option>

            <option value="unknown">
              Unknown Risk
            </option>
          </select>
        </div>

        {/* Loading state */}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
            <RefreshCw
              size={20}
              className="animate-spin"
            />

            Loading reviews...
          </div>
        ) : filteredAnalyses.length === 0 ? (
          /* Empty state */

          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <ClipboardCheck size={32} />
            </div>

            <h4 className="font-bold">
              {error
                ? "Unable to load reviews"
                : analyses.length === 0
                ? "No analyses available for review"
                : "No matching reviews"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error
                ? "Refresh the review queue to try again."
                : analyses.length === 0
                ? "No compliance analyses are currently available in your workspace."
                : "Try changing the search or filters."}
            </p>
          </div>
        ) : (
          /* Analysis cards */

          <div className="space-y-5">
            {filteredAnalyses.map(
              (analysis) => {
                const status =
                  analysis.reviewStatus ||
                  "unknown";

                const findings =
                  Array.isArray(
                    analysis.findings
                  )
                    ? analysis.findings
                    : [];

                const expanded = Boolean(
                  expandedIds[analysis._id]
                );

                const ownAnalysis =
                  isOwnAnalysis(analysis);

                const reviewAllowed =
                  canReviewAnalysis(analysis);

                const currentComment =
                  comments[analysis._id] ||
                  "";

                const isSaving =
                  savingId === analysis._id;

                return (
                  <article
                    key={analysis._id}
                    className="rounded-2xl border border-slate-200 p-5 dark:border-slate-700 dark:bg-slate-900/40 sm:p-6"
                  >
                    {/* Analysis heading */}

                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                          <FileText size={23} />
                        </div>

                        <div className="min-w-0">
                          <h4 className="break-words text-lg font-bold">
                            {analysis.document
                              ?.documentName ||
                              "Compliance Analysis"}
                          </h4>

                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            AI Compliance Analysis
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <RiskBadge
                          level={
                            analysis.riskLevel
                          }
                        />

                        <ReviewBadge
                          status={status}
                        />
                      </div>
                    </div>

                    {/* Analysis author information */}

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-2">
                        <UserRound size={15} />

                        Analyzed by:{" "}

                        <strong>
                          {analysis.analyzedBy
                            ?.name ||
                            "Unknown"}
                        </strong>
                      </span>

                      <span className="flex items-center gap-2">
                        <CalendarDays
                          size={15}
                        />

                        {formatDate(
                          analysis.createdAt
                        )}
                      </span>

                      {ownAnalysis && (
                        <span className="rounded-full bg-sky-500/10 px-2.5 py-1 font-semibold text-sky-600 dark:text-sky-400">
                          Your Analysis
                        </span>
                      )}
                    </div>

                    {/* Analysis summary */}

                    <div className="mt-5 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        AI Analysis Summary
                      </p>

                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-200">
                        {analysis.summary ||
                          "No analysis summary available."}
                      </p>
                    </div>

                    {/* Findings */}

                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() =>
                          toggleFindings(
                            analysis._id
                          )
                        }
                        aria-expanded={
                          expanded
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <AlertTriangle
                            size={18}
                            className="text-amber-500"
                          />

                          Findings (
                          {findings.length})
                        </span>

                        {expanded ? (
                          <ChevronUp
                            size={19}
                          />
                        ) : (
                          <ChevronDown
                            size={19}
                          />
                        )}
                      </button>

                      {expanded && (
                        <div className="mt-3 space-y-3">
                          {findings.length ===
                          0 ? (
                            <p className="rounded-xl border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700">
                              No findings
                              recorded. This
                              does not establish
                              compliance.
                            </p>
                          ) : (
                            findings.map(
                              (
                                finding,
                                index
                              ) => (
                                <FindingCard
                                  key={
                                    finding._id ||
                                    index
                                  }
                                  finding={
                                    finding
                                  }
                                  index={
                                    index
                                  }
                                />
                              )
                            )
                          )}
                        </div>
                      )}
                    </div>

                    {/* Authorized review actions */}

                    {status === "pending" ? (
                      reviewAllowed ? (
                        <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-700">
                          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-600 dark:text-teal-400">
                            <ShieldCheck
                              size={18}
                            />

                            Independent Human
                            Review
                          </div>

                          <label
                            htmlFor={`review-comment-${analysis._id}`}
                            className="mb-2 block text-sm font-semibold"
                          >
                            Human Review
                            Comments *
                          </label>

                          <textarea
                            id={`review-comment-${analysis._id}`}
                            value={
                              currentComment
                            }
                            disabled={
                              savingId !== null
                            }
                            maxLength={5000}
                            onChange={(
                              event
                            ) =>
                              setComments(
                                (
                                  previous
                                ) => ({
                                  ...previous,

                                  [analysis._id]:
                                    event
                                      .target
                                      .value,
                                })
                              )
                            }
                            placeholder="Document your assessment, observations and decision rationale..."
                            rows={4}
                            className={`${inputClass} resize-y`}
                          />

                          <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <p>
                              Review comments
                              are mandatory for
                              both approval and
                              rejection.
                            </p>

                            <span>
                              {
                                currentComment.length
                              }
                              /5000
                            </span>
                          </div>

                          <p className="mt-3 text-xs leading-5 text-amber-600 dark:text-amber-400">
                            Review decisions
                            cannot be changed
                            after submission.
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3">
                            {/* Approve button */}

                            <button
                              type="button"
                              onClick={() =>
                                submitReview(
                                  analysis._id,
                                  "approved"
                                )
                              }
                              disabled={
                                savingId !==
                                  null ||
                                !currentComment.trim()
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving &&
                              savingDecision ===
                                "approved" ? (
                                <RefreshCw
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <CheckCircle2
                                  size={17}
                                />
                              )}

                              {isSaving &&
                              savingDecision ===
                                "approved"
                                ? "Approving..."
                                : "Approve Analysis"}
                            </button>

                            {/* Reject button */}

                            <button
                              type="button"
                              onClick={() =>
                                submitReview(
                                  analysis._id,
                                  "rejected"
                                )
                              }
                              disabled={
                                savingId !==
                                  null ||
                                !currentComment.trim()
                              }
                              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSaving &&
                              savingDecision ===
                                "rejected" ? (
                                <RefreshCw
                                  size={17}
                                  className="animate-spin"
                                />
                              ) : (
                                <XCircle
                                  size={17}
                                />
                              )}

                              {isSaving &&
                              savingDecision ===
                                "rejected"
                                ? "Rejecting..."
                                : "Reject Analysis"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Restricted review */

                        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                          <Lock
                            size={19}
                            className="mt-0.5 shrink-0 text-amber-500"
                          />

                          <div>
                            <h5 className="text-sm font-bold">
                              {ownAnalysis
                                ? "Self-review Restricted"
                                : "Awaiting Authorized Review"}
                            </h5>

                            <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                              {ownAnalysis
                                ? "You generated this analysis. An independent authorized reviewer must approve or reject it."
                                : !canReview
                                ? "Only Super Admins and Auditors can approve or reject analyses."
                                : "The reviewer or analysis author identity could not be verified."}
                            </p>
                          </div>
                        </div>
                      )
                    ) : (
                      /* Completed human review record */

                      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <ShieldCheck
                              size={19}
                              className="text-teal-500"
                            />

                            <h5 className="font-bold">
                              Human Review
                              Record
                            </h5>
                          </div>

                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            <Lock size={13} />

                            Read Only
                          </span>
                        </div>

                        <ReviewBadge
                          status={status}
                        />

                        <div className="mt-4 space-y-4 text-sm">
                          {/* Review comments */}

                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              Review Comments
                            </p>

                            <p className="mt-1 whitespace-pre-wrap leading-6">
                              {analysis.reviewComments ||
                                "No comments recorded."}
                            </p>
                          </div>

                          {/* Reviewer */}

                          <div className="flex items-start gap-3">
                            <UserRound
                              size={17}
                              className="mt-0.5 shrink-0 text-teal-500"
                            />

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Reviewed By
                              </p>

                              <p className="mt-1 font-semibold">
                                {analysis
                                  .reviewedBy
                                  ?.name ||
                                  "Unknown"}
                              </p>
                            </div>
                          </div>

                          {/* Review date */}

                          <div className="flex items-start gap-3">
                            <CalendarDays
                              size={17}
                              className="mt-0.5 shrink-0 text-teal-500"
                            />

                            <div>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Reviewed On
                              </p>

                              <p className="mt-1">
                                {formatDate(
                                  analysis.reviewedAt
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="mt-4 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          This review record
                          cannot be modified
                          through the review
                          workflow.
                        </p>
                      </div>
                    )}

                    {/* Compliance disclaimer */}

                    <p className="mt-5 text-xs leading-6 text-slate-500 dark:text-slate-400">
                      AI findings are advisory.
                      Approval records a human
                      review decision, not an
                      official regulatory
                      certification.
                    </p>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}