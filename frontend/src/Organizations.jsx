import { useCallback, useEffect, useState } from "react";

import {
  Building2,
  ArrowLeft,
  Plus,
  RefreshCw,
  Mail,
  MapPin,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  FileBadge,
  X,
  Sparkles,
} from "lucide-react";

import api from "./api";

const ORGANIZATION_TYPES = [
  "Pharmacy",
  "Manufacturer",
  "Distributor",
  "Other",
];

const initialForm = {
  name: "",
  licenseNumber: "",
  organizationType: "",
  address: "",
  city: "",
  contactEmail: "",
};

const fields = [
  {
    name: "name",
    label: "Organization Name",
    placeholder: "e.g. PharmaIQ Healthcare",
  },
  {
    name: "licenseNumber",
    label: "License Number",
    placeholder: "Enter license number",
  },
  {
    name: "organizationType",
    label: "Organization Type",
    type: "select",
  },
  {
    name: "contactEmail",
    label: "Contact Email",
    placeholder: "contact@example.com",
    type: "email",
  },
  {
    name: "address",
    label: "Address",
    placeholder: "Enter organization address",
  },
  {
    name: "city",
    label: "City",
    placeholder: "e.g. Amritsar",
  },
];

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

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

export default function Organizations({
  user,
  onBack,
}) {
  // Role-based permissions

  const isSuperAdmin =
    user?.role === "super_admin";

  const canCreateOrganization = isSuperAdmin;

  const roleLabel =
    ROLE_LABELS[user?.role] || "Unknown Role";

  // Organization states

  const [organizations, setOrganizations] =
    useState([]);

  const [form, setForm] = useState({
    ...initialForm,
  });

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(true);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  // Load accessible organizations

  const loadOrganizations = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          "/organization/get",
          { signal }
        );

        if (!signal?.aborted) {
          setOrganizations(
            response.data.organizations || []
          );
        }
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setOrganizations([]);

        setError(
          err.response?.data?.message ||
            "Failed to load organizations."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    []
  );

  // Load organizations on mount

  useEffect(() => {
    const controller = new AbortController();

    loadOrganizations(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadOrganizations]);

  // Handle form changes

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create organization

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    // Only Super Admin can create organizations

    if (!canCreateOrganization) {
      setError(
        "Only Super Admin can create organizations."
      );

      return;
    }

    const cleanedForm = Object.fromEntries(
      Object.entries(form).map(
        ([key, value]) => [
          key,
          value.trim(),
        ]
      )
    );

    cleanedForm.contactEmail =
      cleanedForm.contactEmail.toLowerCase();

    // Required fields validation

    if (
      Object.values(cleanedForm).some(
        (value) => !value
      )
    ) {
      setError(
        "Please fill all required fields."
      );

      return;
    }

    // Organization type validation

    if (
      !ORGANIZATION_TYPES.includes(
        cleanedForm.organizationType
      )
    ) {
      setError(
        "Please select a valid organization type."
      );

      return;
    }

    // Email validation

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailRegex.test(
        cleanedForm.contactEmail
      )
    ) {
      setError(
        "Please enter a valid contact email."
      );

      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/organization/create",
        cleanedForm
      );

      setForm({ ...initialForm });

      await loadOrganizations();

      setSuccess(
        "Organization created successfully!"
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create organization."
      );
    } finally {
      setSaving(false);
    }
  };

  // Organization statistics

  const activeCount = organizations.filter(
    (org) => org.isActive !== false
  ).length;

  const inactiveCount = organizations.filter(
    (org) => org.isActive === false
  ).length;

  // Search and filter organizations

  const filteredOrganizations =
    organizations.filter((org) => {
      const text = [
        org.name,
        org.organizationType,
        org.licenseNumber,
        org.contactEmail,
        org.city,
        org.address,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(
        search.trim().toLowerCase()
      );

      const matchesStatus =
        statusFilter === "all" ||
        (
          statusFilter === "active" &&
          org.isActive !== false
        ) ||
        (
          statusFilter === "inactive" &&
          org.isActive === false
        );

      return matchesSearch && matchesStatus;
    });

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">
      {/* Page title */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Organization Directory
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {isSuperAdmin
              ? "Organization Management"
              : "My Organization"}
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {isSuperAdmin
              ? "Register and manage pharmaceutical organizations from one secure workspace."
              : "View your assigned pharmaceutical organization and compliance information."}
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

              Pharmaceutical Network
            </span>

            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
              One workspace.

              <br />

              <span className="text-teal-200">
                {isSuperAdmin
                  ? "Every organization."
                  : "Your organization."}
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Maintain organization profiles,
              license identifiers and contact
              details in a structured compliance
              directory.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
              <ShieldCheck size={15} />

              {roleLabel}
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
            <Building2
              size={62}
              className="text-teal-100"
            />
          </div>
        </div>
      </section>

      {/* Workspace access information */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
            <ShieldCheck size={22} />
          </div>

          <div>
            <p className="text-sm font-bold">
              {isSuperAdmin
                ? "Platform-wide Access"
                : "Organization-level Access"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {isSuperAdmin
                ? "You can register and view organizations across the platform."
                : "You can view only your assigned organization. Organization creation is restricted to Super Admin."}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
          {canCreateOrganization
            ? "Creation Enabled"
            : "View Only"}
        </span>
      </section>

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Total Organizations"
          value={organizations.length}
          Icon={Building2}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Active Organizations"
          value={activeCount}
          Icon={CheckCircle2}
          color="bg-teal-500/10 text-teal-500"
        />

        <MetricCard
          title="Inactive Organizations"
          value={inactiveCount}
          Icon={XCircle}
          color="bg-rose-500/10 text-rose-500"
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

      {/* Create organization - Super Admin only */}

      {canCreateOrganization && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
                <Plus size={23} />
              </div>

              <div>
                <h3 className="text-lg font-bold">
                  Add New Organization
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Register a new pharmaceutical
                  organization.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowForm(!showForm)
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
              {fields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={`org-${field.name}`}
                    className="mb-2 block text-sm font-semibold"
                  >
                    {field.label} *
                  </label>

                  {/* Organization type dropdown */}

                  {field.type === "select" ? (
                    <select
                      id={`org-${field.name}`}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      className={inputClass}
                    >
                      <option value="">
                        Select organization type
                      </option>

                      {ORGANIZATION_TYPES.map(
                        (type) => (
                          <option
                            key={type}
                            value={type}
                          >
                            {type}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <input
                      id={`org-${field.name}`}
                      type={
                        field.type || "text"
                      }
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={
                        field.placeholder
                      }
                      required
                      disabled={saving}
                      maxLength={
                        field.type === "email"
                          ? 254
                          : 200
                      }
                      className={inputClass}
                    />
                  )}
                </div>
              ))}

              {/* Form actions */}

              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
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
                    : "Create Organization"}
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
            </form>
          )}
        </section>
      )}

      {/* Organization directory */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              {isSuperAdmin
                ? "Organization Directory"
                : "Assigned Organization"}
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {organizations.length} accessible{" "}
              {organizations.length === 1
                ? "organization"
                : "organizations"}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadOrganizations()
            }
            disabled={loading}
            title="Refresh organizations"
            aria-label="Refresh organizations"
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

        {/* Search and filter */}

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_200px]">
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
              placeholder="Search by name, license, city..."
              aria-label="Search organizations"
              className={`${inputClass} pl-11`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
            aria-label="Filter organizations by status"
            className={inputClass}
          >
            <option value="all">
              All Organizations
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
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

            Loading organizations...
          </div>
        ) : filteredOrganizations.length === 0 ? (
          /* Empty state */

          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <Building2 size={32} />
            </div>

            <h4 className="font-bold">
              {error
                ? "Unable to load organizations"
                : organizations.length === 0
                ? isSuperAdmin
                  ? "No organizations registered yet"
                  : "No accessible organization found"
                : "No matching organizations"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error
                ? "Refresh the directory to try again."
                : organizations.length === 0
                ? canCreateOrganization
                  ? "Create your first organization using the form above."
                  : "Contact your administrator to verify your organization assignment."
                : "Try a different search or status filter."}
            </p>
          </div>
        ) : (
          /* Organization cards */

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredOrganizations.map(
              (org) => (
                <article
                  key={org._id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
                >
                  {/* Organization heading */}

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                      <Building2 size={24} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="break-words text-lg font-bold">
                        {org.name}
                      </h4>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {org.organizationType ||
                          "Organization"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                        org.isActive === false
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                      }`}
                    >
                      {org.isActive === false
                        ? "Inactive"
                        : "Active"}
                    </span>
                  </div>

                  {/* Organization details */}

                  <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700">
                    {/* License number */}

                    <div className="flex items-start gap-3">
                      <FileBadge
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          License Number
                        </p>

                        <p className="mt-1 break-all font-semibold">
                          {org.licenseNumber ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Contact email */}

                    <div className="flex items-start gap-3">
                      <Mail
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Contact Email
                        </p>

                        <p className="mt-1 break-all">
                          {org.contactEmail ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Location */}

                    <div className="flex items-start gap-3">
                      <MapPin
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Location
                        </p>

                        <p className="mt-1">
                          {org.address || "N/A"}

                          {org.city
                            ? `, ${org.city}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Organization access */}

                    {!isSuperAdmin && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-teal-500/5 px-3 py-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                        <ShieldCheck size={15} />

                        Your assigned organization
                      </div>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </section>

      {/* Compliance disclaimer */}

      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
        Organization records are maintained for
        internal compliance management. An active
        status does not independently verify
        regulatory approval or license validity.
      </p>
    </div>
  );
}