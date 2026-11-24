
import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  CalendarDays,
  UserRound,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock3,
  ClipboardCheck,
  FileText,
  Filter,
  Sparkles,
  X,
} from "lucide-react";
import api from "./api";

const initialForm = {
  audit: "",
  title: "",
  description: "",
  assignedTo: "",
  dueDate: "",
  priority: "medium",
};

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isOverdue(capa) {
  if (!capa.dueDate || capa.status === "completed") {
    return false;
  }

  const dueDate = new Date(
    `${String(capa.dueDate).slice(0, 10)}T23:59:59`
  );

  return (
    !Number.isNaN(dueDate.getTime()) &&
    dueDate.getTime() < Date.now()
  );
}

function PriorityBadge({ priority }) {
  const styles = {
    low: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    medium:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    high: "bg-red-500/10 text-red-600 dark:text-red-400",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
        styles[priority] ||
        "bg-slate-500/10 text-slate-500"
      }`}
    >
      {priority || "Unknown"} Priority
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    open: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    in_progress:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    completed:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  };

  const label =
    statusOptions.find((option) => option.value === status)
      ?.label || status || "Open";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        styles[status] ||
        "bg-slate-500/10 text-slate-500"
      }`}
    >
      {label}
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

export default function CAPAs({ onBack }) {
  const [audits, setAudits] = useState([]);
  const [capas, setCapas] = useState([]);
  const [form, setForm] = useState({ ...initialForm });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showForm, setShowForm] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [auditRes, capaRes] = await Promise.all([
        api.get("/audits/get"),
        api.get("/capas/get"),
      ]);

      setAudits(auditRes.data.audits || []);
      setCapas(capaRes.data.capas || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load CAPAs."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const payload = {
      audit: form.audit,
      title: form.title.trim(),
      description: form.description.trim(),
      assignedTo: form.assignedTo.trim(),
      dueDate: form.dueDate,
      priority: form.priority,
    };

    if (
      !payload.audit ||
      !payload.title ||
      !payload.description ||
      !payload.assignedTo ||
      !payload.dueDate
    ) {
      setError("Please fill all required fields.");
      return;
    }

    try {
      setSaving(true);

      await api.post("/capas/create", payload);

      setForm({ ...initialForm });
      await loadData();

      setSuccess("CAPA created successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create CAPA."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      setUpdatingId(id);
      setError("");
      setSuccess("");

      await api.patch(`/capas/${id}/status`, {
        status,
      });

      await loadData();

      setSuccess("CAPA status updated successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Status update failed."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const getAuditTitle = (capa) => {
    if (capa.audit && typeof capa.audit === "object") {
      return capa.audit.title || "Unknown Audit";
    }

    const matched = audits.find(
      (audit) => audit._id === capa.audit
    );

    return matched?.title || "Unknown Audit";
  };

  const openCount = capas.filter(
    (capa) => (capa.status || "open") === "open"
  ).length;

  const progressCount = capas.filter(
    (capa) => capa.status === "in_progress"
  ).length;

  const completedCount = capas.filter(
    (capa) => capa.status === "completed"
  ).length;

  const overdueCount = capas.filter(isOverdue).length;

  const filteredCAPAs = capas.filter((capa) => {
    const searchableText = [
      capa.title,
      capa.description,
      capa.assignedTo,
      getAuditTitle(capa),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch = searchableText.includes(
      search.trim().toLowerCase()
    );

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "overdue"
        ? isOverdue(capa)
        : (capa.status || "open") === statusFilter);

    const matchesPriority =
      priorityFilter === "all" ||
      capa.priority === priorityFilter;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPriority
    );
  });

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">
      {/* Page heading */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Compliance Operations
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            CAPA Management
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Track corrective and preventive actions,
            responsibilities and deadlines.
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

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-[#103b46] text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b2935] to-[#146b6a]" />

        <div className="relative flex flex-col justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-teal-100">
              <Sparkles size={14} />
              Corrective Action Tracking
            </span>

            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
              From findings
              <br />
              <span className="text-teal-200">
                to meaningful action.
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Assign corrective actions, prioritize risks
              and monitor deadlines to support your
              compliance improvement process.
            </p>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
            <ShieldCheck
              size={62}
              className="text-teal-100"
            />
          </div>
        </div>
      </section>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total CAPAs"
          value={capas.length}
          Icon={ShieldCheck}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Open"
          value={openCount}
          Icon={ClipboardCheck}
          color="bg-blue-500/10 text-blue-500"
        />

        <MetricCard
          title="In Progress"
          value={progressCount}
          Icon={Clock3}
          color="bg-amber-500/10 text-amber-500"
        />

        <MetricCard
          title="Overdue"
          value={overdueCount}
          Icon={AlertTriangle}
          color="bg-red-500/10 text-red-500"
        />
      </div>

      {/* Completion summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold">
              CAPA Completion Progress
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Completed actions out of total recorded CAPAs
            </p>
          </div>

          <span className="text-lg font-extrabold text-teal-600 dark:text-teal-400">
            {capas.length
              ? Math.round(
                  (completedCount / capas.length) * 100
                )
              : 0}
            %
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="CAPA completion progress"
          aria-valuenow={
            capas.length
              ? Math.round(
                  (completedCount / capas.length) * 100
                )
              : 0
          }
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-teal-500 transition-all"
            style={{
              width: `${
                capas.length
                  ? Math.round(
                      (completedCount / capas.length) * 100
                    )
                  : 0
              }%`,
            }}
          />
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {completedCount} completed of {capas.length} total
        </p>
      </section>

      {/* Notifications */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400"
        >
          <AlertCircle
            size={19}
            className="shrink-0"
          />
          <span className="flex-1">{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 text-sm text-teal-600 dark:text-teal-400"
        >
          <CheckCircle2
            size={19}
            className="shrink-0"
          />
          <span className="flex-1">{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* Create CAPA */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
              <Plus size={23} />
            </div>

            <div>
              <h3 className="text-lg font-bold">
                Create New CAPA
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Register a corrective or preventive action.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl border border-teal-500/30 px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-500/10 dark:text-teal-400"
          >
            {showForm ? "Hide Form" : "Show Form"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-7 grid gap-5 md:grid-cols-2"
          >
            <div>
              <label
                htmlFor="capa-audit"
                className="mb-2 block text-sm font-semibold"
              >
                Related Audit *
              </label>

              <select
                id="capa-audit"
                name="audit"
                value={form.audit}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Select Audit</option>

                {audits.map((audit) => (
                  <option
                    key={audit._id}
                    value={audit._id}
                  >
                    {audit.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="capa-title"
                className="mb-2 block text-sm font-semibold"
              >
                CAPA Title *
              </label>

              <input
                id="capa-title"
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                maxLength={200}
                placeholder="e.g. Update temperature monitoring SOP"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="capa-assigned"
                className="mb-2 block text-sm font-semibold"
              >
                Assigned To *
              </label>

              <input
                id="capa-assigned"
                type="text"
                name="assignedTo"
                value={form.assignedTo}
                onChange={handleChange}
                required
                maxLength={150}
                placeholder="Enter responsible person's name"
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="capa-date"
                className="mb-2 block text-sm font-semibold"
              >
                Due Date *
              </label>

              <input
                id="capa-date"
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                required
                className={inputClass}
              />
            </div>

            <div>
              <label
                htmlFor="capa-priority"
                className="mb-2 block text-sm font-semibold"
              >
                Priority
              </label>

              <select
                id="capa-priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className={inputClass}
              >
                {priorityOptions.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                htmlFor="capa-description"
                className="mb-2 block text-sm font-semibold"
              >
                Description *
              </label>

              <textarea
                id="capa-description"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Describe the issue, corrective action and expected outcome..."
                className={`${inputClass} resize-y`}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving || audits.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:bg-teal-700 disabled:opacity-50"
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
                  : "Create CAPA"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  setForm({ ...initialForm })
                }
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Clear Form
              </button>
            </div>

            {audits.length === 0 && !loading && (
              <p className="text-sm text-amber-600 dark:text-amber-400 md:col-span-2">
                Please create an audit first before
                registering a CAPA.
              </p>
            )}
          </form>
        )}
      </section>

      {/* CAPA directory */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              CAPA Directory
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {capas.length} recorded corrective and
              preventive actions
            </p>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            title="Refresh CAPAs"
            className="rounded-xl border border-slate-200 p-3 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw
              size={18}
              className={loading ? "animate-spin" : ""}
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search CAPAs, audits, assignees..."
              className={`${inputClass} pl-11`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            aria-label="Filter CAPAs by status"
            className={inputClass}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) =>
              setPriorityFilter(e.target.value)
            }
            aria-label="Filter CAPAs by priority"
            className={inputClass}
          >
            <option value="all">All Priorities</option>
            {priorityOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label} Priority
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
            <RefreshCw
              size={20}
              className="animate-spin"
            />
            Loading CAPAs...
          </div>
        ) : filteredCAPAs.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <ShieldCheck size={32} />
            </div>

            <h4 className="font-bold">
              {capas.length === 0
                ? "No CAPAs created yet"
                : "No matching CAPAs"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {capas.length === 0
                ? "Create your first CAPA using the form above."
                : "Try changing the search or filters."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredCAPAs.map((capa) => (
              <article
                key={capa._id}
                className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                    <ShieldCheck size={24} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="break-words text-lg font-bold">
                      {capa.title}
                    </h4>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {getAuditTitle(capa)}
                    </p>
                  </div>

                  <PriorityBadge
                    priority={capa.priority}
                  />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <StatusBadge
                    status={capa.status || "open"}
                  />

                  {isOverdue(capa) && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-600 dark:text-red-400">
                      <AlertTriangle size={13} />
                      Overdue
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <FileText
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Description
                      </p>

                      <p className="mt-1 whitespace-pre-wrap leading-6 text-slate-600 dark:text-slate-300">
                        {capa.description || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <ClipboardCheck
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Related Audit
                      </p>

                      <p className="mt-1 font-semibold">
                        {getAuditTitle(capa)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <UserRound
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Assigned To
                      </p>

                      <p className="mt-1">
                        {capa.assignedTo || "N/A"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CalendarDays
                      size={17}
                      className="mt-0.5 shrink-0 text-teal-500"
                    />

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Due Date
                      </p>

                      <p className="mt-1">
                        {formatDate(capa.dueDate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status update */}
                <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-700">
                  <label
                    htmlFor={`capa-status-${capa._id}`}
                    className="mb-2 block text-sm font-semibold"
                  >
                    Update CAPA Status
                  </label>

                  <select
                    id={`capa-status-${capa._id}`}
                    value={capa.status || "open"}
                    disabled={updatingId !== null}
                    onChange={(event) =>
                      updateStatus(
                        capa._id,
                        event.target.value
                      )
                    }
                    className={inputClass}
                  >
                    {statusOptions.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {updatingId === capa._id && (
                    <p className="mt-2 flex items-center gap-2 text-xs text-teal-600 dark:text-teal-400">
                      <RefreshCw
                        size={13}
                        className="animate-spin"
                      />
                      Updating CAPA status...
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
        CAPA completion and overdue indicators reflect
        recorded workflow data. Marking a CAPA completed
        does not independently verify corrective-action
        effectiveness or regulatory compliance.
      </p>
    </div>
  );
}
