import { useCallback, useEffect, useState } from "react";

import {
  ArrowLeft,
  ClipboardCheck,
  Plus,
  RefreshCw,
  Building2,
  Search,
  CalendarDays,
  UserRound,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Clock3,
  ListChecks,
  FileText,
  Filter,
  ShieldCheck,
  Lock,
} from "lucide-react";

import api from "./api";

const initialForm = {
  pharmacy: "",
  title: "",
  auditDate: "",
  auditor: "",
  notes: "",
};

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

const statusOptions = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

function formatStatus(value) {
  return String(value || "planned").replaceAll("_", " ");
}

function StatusBadge({ status }) {
  const styles = {
    planned:
      "bg-sky-500/10 text-sky-600 dark:text-sky-400",

    in_progress:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    completed:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize ${
        styles[status] ||
        "bg-slate-500/10 text-slate-500 dark:text-slate-400"
      }`}
    >
      {formatStatus(status)}
    </span>
  );
}

function MetricCard({ title, value, Icon, color }) {
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

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
}

export default function Audits({ user, onBack }) {
  // Role-based permissions

  const canManageAudits = [
    "super_admin",
    "organization_admin",
    "auditor",
  ].includes(user?.role);

  const isSuperAdmin =
    user?.role === "super_admin";

  const roleLabel =
    ROLE_LABELS[user?.role] || "Unknown Role";

  // Application states

  const [audits, setAudits] = useState([]);

  const [pharmacies, setPharmacies] =
    useState([]);

  const [form, setForm] =
    useState({ ...initialForm });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(true);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  // Only active pharmacies can receive new audits

  const activePharmacies = pharmacies.filter(
    (pharmacy) => pharmacy.status === "active"
  );

  // Load tenant-scoped data

  const loadData = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const [auditRes, pharmacyRes] =
          await Promise.all([
            api.get("/audits/get", {
              signal,
            }),

            api.get("/pharmacy/get", {
              signal,
            }),
          ]);

        if (signal?.aborted) return;

        setAudits(
          auditRes.data.audits || []
        );

        setPharmacies(
          pharmacyRes.data.pharmacies || []
        );
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setAudits([]);
        setPharmacies([]);

        setError(
          err.response?.data?.message ||
            "Failed to load audits."
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

  // Handle form changes

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create audit

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      saving ||
      loading ||
      updatingId !== null
    ) {
      return;
    }

    setError("");
    setSuccess("");

    // Check role permissions

    if (!canManageAudits) {
      setError(
        "You do not have permission to create audits."
      );

      return;
    }

    const cleanedForm = {
      pharmacy: form.pharmacy,
      title: form.title.trim(),
      auditDate: form.auditDate,
      auditor: form.auditor.trim(),
      notes: form.notes.trim(),
    };

    // Required fields

    if (
      !cleanedForm.pharmacy ||
      !cleanedForm.title ||
      !cleanedForm.auditDate ||
      !cleanedForm.auditor
    ) {
      setError(
        "Please fill all required fields."
      );

      return;
    }

    // Validate selected pharmacy

    const selectedPharmacy =
      activePharmacies.find(
        (pharmacy) =>
          pharmacy._id ===
          cleanedForm.pharmacy
      );

    if (!selectedPharmacy) {
      setError(
        "Please select an accessible active pharmacy."
      );

      return;
    }

    // Validate audit title

    if (cleanedForm.title.length > 200) {
      setError(
        "Audit title must not exceed 200 characters."
      );

      return;
    }

    // Validate auditor name

    if (cleanedForm.auditor.length > 150) {
      setError(
        "Auditor name must not exceed 150 characters."
      );

      return;
    }

    // Validate notes

    if (cleanedForm.notes.length > 5000) {
      setError(
        "Audit notes must not exceed 5000 characters."
      );

      return;
    }

    // Validate audit date

    const parsedDate =
      new Date(cleanedForm.auditDate);

    if (
      Number.isNaN(parsedDate.getTime())
    ) {
      setError(
        "Please enter a valid audit date."
      );

      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/audits/create",
        cleanedForm
      );

      setForm({ ...initialForm });

      await loadData();

      setSuccess(
        "Audit created successfully!"
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create audit."
      );
    } finally {
      setSaving(false);
    }
  };

  // Update audit status

  const updateStatus = async (
    id,
    status
  ) => {
    if (
      updatingId !== null ||
      saving ||
      loading
    ) {
      return;
    }

    setError("");
    setSuccess("");

    // Check role permissions

    if (!canManageAudits) {
      setError(
        "You do not have permission to update audit status."
      );

      return;
    }

    // Validate audit status

    if (
      !statusOptions.some(
        (option) =>
          option.value === status
      )
    ) {
      setError(
        "Invalid audit status."
      );

      return;
    }

    // Check accessible audit

    const selectedAudit =
      audits.find(
        (audit) => audit._id === id
      );

    if (!selectedAudit) {
      setError(
        "Audit is not accessible."
      );

      return;
    }

    // Avoid unnecessary requests

    if (selectedAudit.status === status) {
      return;
    }

    try {
      setUpdatingId(id);

      await api.patch(
        `/audits/${id}/status`,
        {
          status,
        }
      );

      await loadData();

      setSuccess(
        "Audit status updated successfully!"
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Audit status update failed."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Resolve pharmacy name

  const getPharmacyName = (audit) => {
    if (
      audit.pharmacy &&
      typeof audit.pharmacy === "object"
    ) {
      return (
        audit.pharmacy.pharmacyName ||
        "Unknown Pharmacy"
      );
    }

    const matched = pharmacies.find(
      (pharmacy) =>
        String(pharmacy._id) ===
        String(audit.pharmacy)
    );

    return (
      matched?.pharmacyName ||
      "Unknown Pharmacy"
    );
  };

  // Audit statistics

  const plannedCount = audits.filter(
    (audit) =>
      audit.status === "planned"
  ).length;

  const progressCount = audits.filter(
    (audit) =>
      audit.status === "in_progress"
  ).length;

  const completedCount = audits.filter(
    (audit) =>
      audit.status === "completed"
  ).length;

  // Search and filter audits

  const filteredAudits = audits.filter(
    (audit) => {
      const searchableText = [
        audit.title,
        audit.auditor,
        audit.notes,
        audit.createdBy?.name,
        getPharmacyName(audit),
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
        (audit.status || "planned") ===
          statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    }
  );

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">
      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Compliance Operations
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Audit Management
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {canManageAudits
              ? "Plan, organize and monitor pharmacy compliance audits from one workspace."
              : "View pharmacy compliance audits and monitor recorded audit progress."}
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

              Audit Intelligence
            </span>

            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
              Every audit.

              <br />

              <span className="text-teal-200">
                Clearly tracked.
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              {canManageAudits
                ? "Schedule inspections, assign auditors and track audit progress through a structured compliance workflow."
                : "Access scheduled inspections, auditor details and compliance audit records within your organization."}
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
            {canManageAudits ? (
              <ShieldCheck size={22} />
            ) : (
              <Lock size={22} />
            )}
          </div>

          <div>
            <p className="text-sm font-bold">
              {isSuperAdmin
                ? "Platform-wide Audit Access"
                : "Organization-level Audit Access"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {canManageAudits
                ? "You can schedule audits and update audit statuses within your authorized workspace."
                : "You can view audit records. Creating audits and updating statuses are restricted."}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
          {canManageAudits
            ? "Audit Management Enabled"
            : "Read-only Access"}
        </span>
      </section>

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Audits"
          value={audits.length}
          Icon={ClipboardCheck}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Planned"
          value={plannedCount}
          Icon={CalendarDays}
          color="bg-blue-500/10 text-blue-500"
        />

        <MetricCard
          title="In Progress"
          value={progressCount}
          Icon={Clock3}
          color="bg-amber-500/10 text-amber-500"
        />

        <MetricCard
          title="Completed"
          value={completedCount}
          Icon={CheckCircle2}
          color="bg-teal-500/10 text-teal-500"
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

      {/* Create audit - authorized roles only */}

      {canManageAudits && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
                <Plus size={23} />
              </div>

              <div>
                <h3 className="text-lg font-bold">
                  Create New Audit
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Register an audit for an
                  accessible active pharmacy.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowForm(
                  (previous) => !previous
                )
              }
              className="rounded-xl border border-teal-500/30 px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-500/10 dark:text-teal-400"
            >
              {showForm
                ? "Hide Form"
                : "Show Form"}
            </button>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="mt-7 grid gap-5 md:grid-cols-2"
            >
              {/* Pharmacy selection */}

              <div>
                <label
                  htmlFor="audit-pharmacy"
                  className="mb-2 block text-sm font-semibold"
                >
                  Pharmacy *
                </label>

                <select
                  id="audit-pharmacy"
                  name="pharmacy"
                  required
                  disabled={
                    saving || loading
                  }
                  value={form.pharmacy}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">
                    Select Pharmacy
                  </option>

                  {activePharmacies.map(
                    (pharmacy) => (
                      <option
                        key={pharmacy._id}
                        value={pharmacy._id}
                      >
                        {pharmacy.pharmacyName}

                        {pharmacy.organization?.name
                          ? ` — ${pharmacy.organization.name}`
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Audit title */}

              <div>
                <label
                  htmlFor="audit-title"
                  className="mb-2 block text-sm font-semibold"
                >
                  Audit Title *
                </label>

                <input
                  id="audit-title"
                  type="text"
                  name="title"
                  required
                  maxLength={200}
                  disabled={saving}
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. Quarterly Compliance Audit"
                  className={inputClass}
                />
              </div>

              {/* Audit date */}

              <div>
                <label
                  htmlFor="audit-date"
                  className="mb-2 block text-sm font-semibold"
                >
                  Audit Date *
                </label>

                <input
                  id="audit-date"
                  type="date"
                  name="auditDate"
                  required
                  disabled={saving}
                  value={form.auditDate}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>

              {/* Auditor name */}

              <div>
                <label
                  htmlFor="audit-auditor"
                  className="mb-2 block text-sm font-semibold"
                >
                  Auditor Name *
                </label>

                <input
                  id="audit-auditor"
                  type="text"
                  name="auditor"
                  required
                  maxLength={150}
                  disabled={saving}
                  value={form.auditor}
                  onChange={handleChange}
                  placeholder="Enter auditor's name"
                  className={inputClass}
                />
              </div>

              {/* Audit notes */}

              <div className="md:col-span-2">
                <label
                  htmlFor="audit-notes"
                  className="mb-2 block text-sm font-semibold"
                >
                  Audit Notes
                </label>

                <textarea
                  id="audit-notes"
                  name="notes"
                  rows={4}
                  maxLength={5000}
                  disabled={saving}
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Add audit objectives, observations or preparation notes..."
                  className={`${inputClass} resize-y`}
                />

                <p className="mt-2 text-right text-xs text-slate-500 dark:text-slate-400">
                  {form.notes.length}/5000
                </p>
              </div>

              {/* Form actions */}

              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    updatingId !== null ||
                    activePharmacies.length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <RefreshCw
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Plus size={18} />
                  )}

                  {saving
                    ? "Creating..."
                    : "Create Audit"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...initialForm,
                    })
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Clear Form
                </button>
              </div>

              {/* No active pharmacies */}

              {activePharmacies.length === 0 &&
                !loading && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 md:col-span-2">
                    No active pharmacies are
                    available. Contact your
                    administrator to register
                    or activate a pharmacy.
                  </p>
                )}
            </form>
          )}
        </section>
      )}

      {/* Audit directory */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              Audit Directory
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {audits.length} accessible
              audit records
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={
              loading ||
              saving ||
              updatingId !== null
            }
            title="Refresh audits"
            aria-label="Refresh audits"
            className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={18}
              className={
                loading
                  ? "animate-spin"
                  : ""
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
              placeholder="Search audits, pharmacies, auditors..."
              aria-label="Search audits"
              className={`${inputClass} pl-11`}
            />
          </div>

          <div className="relative">
            <Filter
              size={17}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value
                )
              }
              aria-label="Filter audits by status"
              className={`${inputClass} pl-11`}
            >
              <option value="all">
                All Audits
              </option>

              {statusOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        {/* Loading state */}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
            <RefreshCw
              size={20}
              className="animate-spin"
            />

            Loading audits...
          </div>
        ) : filteredAudits.length === 0 ? (
          /* Empty state */

          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <ClipboardCheck size={32} />
            </div>

            <h4 className="font-bold">
              {error
                ? "Unable to load audits"
                : audits.length === 0
                ? "No audits created yet"
                : "No matching audits"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error
                ? "Refresh the audit directory to try again."
                : audits.length === 0
                ? canManageAudits
                  ? "Create your first audit using the form above."
                  : "No audit records are available in your organization."
                : "Try a different search or status filter."}
            </p>
          </div>
        ) : (
          /* Audit cards */

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredAudits.map((audit) => (
              <article
                key={audit._id}
                className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
              >
                {/* Audit heading */}

                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                    <ClipboardCheck
                      size={24}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-lg font-bold">
                      {audit.title}
                    </h4>

                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {getPharmacyName(audit)}
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      audit.status ||
                      "planned"
                    }
                  />
                </div>

                {/* Audit information */}

                <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700">
                  {/* Pharmacy */}

                  <div className="flex items-start gap-3">
                    <Building2
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Pharmacy
                      </p>

                      <p className="mt-1 font-semibold">
                        {getPharmacyName(
                          audit
                        )}
                      </p>

                      {audit.pharmacy?.city && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {audit.pharmacy.city}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Auditor */}

                  <div className="flex items-start gap-3">
                    <UserRound
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Auditor
                      </p>

                      <p className="mt-1">
                        {audit.auditor ||
                          "N/A"}
                      </p>
                    </div>
                  </div>

                  {/* Audit date */}

                  <div className="flex items-start gap-3">
                    <CalendarDays
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Audit Date
                      </p>

                      <p className="mt-1">
                        {formatDate(
                          audit.auditDate
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Created by */}

                  <div className="flex items-start gap-3">
                    <UserRound
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Created By
                      </p>

                      <p className="mt-1">
                        {audit.createdBy
                          ?.name ||
                          "Not available"}
                      </p>
                    </div>
                  </div>

                  {/* Audit notes */}

                  {audit.notes && (
                    <div className="flex items-start gap-3">
                      <FileText
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Notes
                        </p>

                        <p className="mt-1 whitespace-pre-wrap break-words leading-6 text-slate-600 dark:text-slate-300">
                          {audit.notes}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status management */}

                {canManageAudits ? (
                  <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
                    <label
                      htmlFor={`audit-status-${audit._id}`}
                      className="mb-2 flex items-center gap-2 text-sm font-semibold"
                    >
                      <ListChecks
                        size={17}
                        className="text-teal-500"
                      />

                      Update Audit Status
                    </label>

                    <select
                      id={`audit-status-${audit._id}`}
                      value={
                        audit.status ||
                        "planned"
                      }
                      disabled={
                        updatingId !== null ||
                        saving ||
                        loading
                      }
                      onChange={(event) =>
                        updateStatus(
                          audit._id,
                          event.target.value
                        )
                      }
                      className={inputClass}
                    >
                      {statusOptions.map(
                        (option) => (
                          <option
                            key={option.value}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        )
                      )}
                    </select>

                    {updatingId ===
                      audit._id && (
                      <p className="mt-2 flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400">
                        <RefreshCw
                          size={13}
                          className="animate-spin"
                        />

                        Updating audit
                        status...
                      </p>
                    )}
                  </div>
                ) : (
                  /* Read-only audit status */

                  <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex items-center gap-2 text-sm font-semibold">
                        <ListChecks
                          size={17}
                          className="text-teal-500"
                        />

                        Audit Status
                      </p>

                      <StatusBadge
                        status={
                          audit.status ||
                          "planned"
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-500/5 p-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
                      <Lock
                        size={15}
                        className="shrink-0"
                      />

                      You have read-only
                      access to this audit.
                      Status updates require
                      an authorized role.
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Compliance disclaimer */}

      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
        Audit statuses reflect recorded
        workflow progress. A completed audit
        does not automatically establish
        regulatory compliance or official
        certification.
      </p>
    </div>
  );
}