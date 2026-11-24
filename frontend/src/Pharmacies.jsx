import { useCallback, useEffect, useState } from "react";

import {
  Pill,
  ArrowLeft,
  Plus,
  RefreshCw,
  Building2,
  MapPin,
  Search,
  CalendarDays,
  UserRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  FileBadge,
} from "lucide-react";

import api from "./api";

const initialForm = {
  pharmacyName: "",
  organization: "",
  ownerName: "",
  pharmacistName: "",
  licenseNumber: "",
  licenseExpiryDate: "",
  address: "",
  city: "",
};

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

const fields = [
  {
    name: "pharmacyName",
    label: "Pharmacy Name",
    placeholder: "e.g. PharmaIQ Medical Store",
  },
  {
    name: "ownerName",
    label: "Owner Name",
    placeholder: "Enter owner's name",
  },
  {
    name: "pharmacistName",
    label: "Pharmacist Name",
    placeholder: "Enter registered pharmacist name",
  },
  {
    name: "licenseNumber",
    label: "License Number",
    placeholder: "Enter license number",
  },
  {
    name: "address",
    label: "Address",
    placeholder: "Enter complete address",
  },
  {
    name: "city",
    label: "City",
    placeholder: "e.g. Amritsar",
  },
];

// Calculate license expiry status

function getLicenseStatus(dateString) {
  if (!dateString) {
    return {
      label: "Unknown",
      type: "unknown",
    };
  }

  const datePart = String(dateString).slice(0, 10);

  const expiry = new Date(
    `${datePart}T23:59:59+05:30`
  );

  if (Number.isNaN(expiry.getTime())) {
    return {
      label: "Unknown",
      type: "unknown",
    };
  }

  const now = new Date();

  const daysLeft = Math.ceil(
    (expiry.getTime() - now.getTime()) /
      86400000
  );

  if (expiry.getTime() < now.getTime()) {
    return {
      label: "Expired",
      type: "expired",
    };
  }

  if (daysLeft <= 30) {
    return {
      label: "Expiring Soon",
      type: "expiring",
    };
  }

  return {
    label: "Valid Date",
    type: "valid",
  };
}

// License status badge

function LicenseBadge({ date }) {
  const status = getLicenseStatus(date);

  const styles = {
    valid:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    expiring:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",

    expired:
      "bg-red-500/10 text-red-600 dark:text-red-400",

    unknown:
      "bg-slate-500/10 text-slate-500 dark:text-slate-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status.type]}`}
    >
      {status.label}
    </span>
  );
}

// Pharmacy statistics card

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

export default function Pharmacies({
  user,
  onBack,
}) {
  // Role-based permissions

  const isSuperAdmin =
    user?.role === "super_admin";

  const isOrganizationAdmin =
    user?.role === "organization_admin";

  const canCreatePharmacy =
    isSuperAdmin || isOrganizationAdmin;

  const roleLabel =
    ROLE_LABELS[user?.role] || "Unknown Role";

  // Application states

  const [organizations, setOrganizations] =
    useState([]);

  const [pharmacies, setPharmacies] =
    useState([]);

  const [form, setForm] = useState({
    ...initialForm,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [licenseFilter, setLicenseFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(true);

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  // Only active organizations can receive new pharmacies

  const activeOrganizations =
    organizations.filter(
      (org) => org.isActive !== false
    );

  // Load accessible organizations and pharmacies

  const loadData = useCallback(
    async (signal) => {
      try {
        setLoading(true);
        setError("");

        const [
          orgResponse,
          pharmacyResponse,
        ] = await Promise.all([
          api.get("/organization/get", {
            signal,
          }),

          api.get("/pharmacy/get", {
            signal,
          }),
        ]);

        if (signal?.aborted) return;

        const organizationData =
          orgResponse.data.organizations || [];

        const pharmacyData =
          pharmacyResponse.data.pharmacies || [];

        setOrganizations(organizationData);

        setPharmacies(pharmacyData);

        // Automatically select the organization
        // for Organization Admin.

        if (isOrganizationAdmin) {
          const assignedOrganization =
            organizationData.find(
              (org) => org.isActive !== false
            );

          setForm((previous) => ({
            ...previous,
            organization:
              assignedOrganization?._id || "",
          }));
        }
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setOrganizations([]);
        setPharmacies([]);

        setError(
          err.response?.data?.message ||
            "Failed to load pharmacy data."
        );
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isOrganizationAdmin]
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

  // Reset pharmacy form

  const resetForm = () => {
    setForm({
      ...initialForm,

      organization: isOrganizationAdmin
        ? activeOrganizations[0]?._id || ""
        : "",
    });
  };

  // Handle form changes

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Create pharmacy

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setError("");
    setSuccess("");

    // Role permission validation

    if (!canCreatePharmacy) {
      setError(
        "You do not have permission to create pharmacies."
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

    // Organization Admin can create pharmacies
    // only under their assigned organization.

    if (isOrganizationAdmin) {
      cleanedForm.organization =
        activeOrganizations[0]?._id || "";
    }

    // Validate required fields

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

    // Validate selected organization

    const selectedOrganization =
      activeOrganizations.find(
        (org) =>
          org._id === cleanedForm.organization
      );

    if (!selectedOrganization) {
      setError(
        "Please select an accessible active organization."
      );

      return;
    }

    // Validate license expiry date

    const expiryDate = new Date(
      cleanedForm.licenseExpiryDate
    );

    if (
      Number.isNaN(expiryDate.getTime())
    ) {
      setError(
        "Please enter a valid license expiry date."
      );

      return;
    }

    try {
      setSaving(true);

      await api.post(
        "/pharmacy/create",
        cleanedForm
      );

      resetForm();

      await loadData();

      setSuccess(
        "Pharmacy created successfully!"
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create pharmacy."
      );
    } finally {
      setSaving(false);
    }
  };

  // Resolve organization name

  const getOrganizationName = (pharmacy) => {
    if (
      pharmacy.organization &&
      typeof pharmacy.organization === "object"
    ) {
      return (
        pharmacy.organization.name ||
        pharmacy.organization.organizationName ||
        "Organization"
      );
    }

    const matched = organizations.find(
      (org) =>
        org._id === pharmacy.organization
    );

    return matched?.name || "Organization";
  };

  // Calculate pharmacy statistics

  const expiredCount = pharmacies.filter(
    (pharmacy) =>
      getLicenseStatus(
        pharmacy.licenseExpiryDate
      ).type === "expired"
  ).length;

  const expiringCount = pharmacies.filter(
    (pharmacy) =>
      getLicenseStatus(
        pharmacy.licenseExpiryDate
      ).type === "expiring"
  ).length;

  const validCount = pharmacies.filter(
    (pharmacy) =>
      getLicenseStatus(
        pharmacy.licenseExpiryDate
      ).type === "valid"
  ).length;

  // Search and filter pharmacies

  const filteredPharmacies =
    pharmacies.filter((pharmacy) => {
      const organizationName =
        getOrganizationName(pharmacy);

      const text = [
        pharmacy.pharmacyName,
        pharmacy.ownerName,
        pharmacy.pharmacistName,
        pharmacy.licenseNumber,
        pharmacy.city,
        pharmacy.address,
        organizationName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = text.includes(
        search.trim().toLowerCase()
      );

      const status = getLicenseStatus(
        pharmacy.licenseExpiryDate
      ).type;

      const matchesFilter =
        licenseFilter === "all" ||
        status === licenseFilter;

      return matchesSearch && matchesFilter;
    });

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">
      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Pharmacy Network
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            Pharmacy Management
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {canCreatePharmacy
              ? "Manage pharmacy profiles, personnel and license expiry dates in one workspace."
              : "View accessible pharmacy profiles, personnel and recorded license expiry dates."}
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

              Pharmacy Intelligence
            </span>

            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
              Better oversight.

              <br />

              <span className="text-teal-200">
                Smarter pharmacy management.
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              Keep pharmacy details organized
              and monitor recorded license expiry
              dates with a clear, searchable
              directory.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
              <ShieldCheck size={15} />

              {roleLabel}
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
            <Pill
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
                ? "Platform-wide Pharmacy Access"
                : "Organization-level Pharmacy Access"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {isSuperAdmin
                ? "Register and view pharmacies across accessible organizations."
                : isOrganizationAdmin
                ? "Register and view pharmacies within your assigned organization."
                : "View pharmacies within your assigned organization. Pharmacy creation is restricted to administrators."}
            </p>
          </div>
        </div>

        <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
          {canCreatePharmacy
            ? "Creation Enabled"
            : "View Only"}
        </span>
      </section>

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Pharmacies"
          value={pharmacies.length}
          Icon={Building2}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Valid Expiry Dates"
          value={validCount}
          Icon={ShieldCheck}
          color="bg-teal-500/10 text-teal-500"
        />

        <MetricCard
          title="Expiring Within 30 Days"
          value={expiringCount}
          Icon={CalendarDays}
          color="bg-amber-500/10 text-amber-500"
        />

        <MetricCard
          title="Expired Licenses"
          value={expiredCount}
          Icon={AlertTriangle}
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

      {/* Create pharmacy - Administrators only */}

      {canCreatePharmacy && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
                <Plus size={23} />
              </div>

              <div>
                <h3 className="text-lg font-bold">
                  Register New Pharmacy
                </h3>

                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isSuperAdmin
                    ? "Add a pharmacy under an existing organization."
                    : "Add a pharmacy under your assigned organization."}
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
              {/* Organization selection */}

              <div>
                <label
                  htmlFor="pharmacy-organization"
                  className="mb-2 block text-sm font-semibold"
                >
                  Organization *
                </label>

                <select
                  id="pharmacy-organization"
                  name="organization"
                  value={form.organization}
                  onChange={handleChange}
                  required
                  disabled={
                    saving ||
                    loading ||
                    isOrganizationAdmin
                  }
                  className={inputClass}
                >
                  <option value="">
                    Select Organization
                  </option>

                  {activeOrganizations.map(
                    (org) => (
                      <option
                        key={org._id}
                        value={org._id}
                      >
                        {org.name ||
                          org.organizationName}
                      </option>
                    )
                  )}
                </select>

                {isOrganizationAdmin && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400">
                    <ShieldCheck size={14} />

                    Your assigned organization
                    is automatically selected.
                  </p>
                )}
              </div>

              {/* Pharmacy fields */}

              {fields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={`pharmacy-${field.name}`}
                    className="mb-2 block text-sm font-semibold"
                  >
                    {field.label} *
                  </label>

                  <input
                    id={`pharmacy-${field.name}`}
                    type="text"
                    name={field.name}
                    value={form[field.name]}
                    onChange={handleChange}
                    placeholder={
                      field.placeholder
                    }
                    required
                    disabled={saving}
                    maxLength={200}
                    className={inputClass}
                  />
                </div>
              ))}

              {/* License expiry date */}

              <div>
                <label
                  htmlFor="pharmacy-expiry"
                  className="mb-2 block text-sm font-semibold"
                >
                  License Expiry Date *
                </label>

                <input
                  id="pharmacy-expiry"
                  type="date"
                  name="licenseExpiryDate"
                  value={form.licenseExpiryDate}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  className={inputClass}
                />
              </div>

              {/* Form actions */}

              <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    loading ||
                    activeOrganizations.length === 0
                  }
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
                    : "Create Pharmacy"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Clear Form
                </button>
              </div>

              {/* No active organization warning */}

              {activeOrganizations.length === 0 &&
                !loading && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-600 dark:text-amber-400 md:col-span-2">
                    <AlertTriangle
                      size={18}
                      className="shrink-0"
                    />

                    <span>
                      {isSuperAdmin
                        ? "Please create or activate an organization before registering a pharmacy."
                        : "No active organization is available. Contact your platform administrator."}
                    </span>
                  </div>
                )}
            </form>
          )}
        </section>
      )}

      {/* Pharmacy directory */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              {isSuperAdmin
                ? "Registered Pharmacies"
                : "Organization Pharmacies"}
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {pharmacies.length} accessible
              pharmacy records
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={loading}
            title="Refresh pharmacies"
            aria-label="Refresh pharmacies"
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

        {/* Search and license filter */}

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
              placeholder="Search pharmacy, owner, license..."
              aria-label="Search pharmacies"
              className={`${inputClass} pl-11`}
            />
          </div>

          <select
            value={licenseFilter}
            onChange={(e) =>
              setLicenseFilter(e.target.value)
            }
            aria-label="Filter by license expiry"
            className={inputClass}
          >
            <option value="all">
              All Pharmacies
            </option>

            <option value="valid">
              Valid Date
            </option>

            <option value="expiring">
              Expiring Soon
            </option>

            <option value="expired">
              Expired
            </option>

            <option value="unknown">
              Unknown
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

            Loading pharmacies...
          </div>
        ) : filteredPharmacies.length === 0 ? (
          /* Empty state */

          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <Pill size={32} />
            </div>

            <h4 className="font-bold">
              {error
                ? "Unable to load pharmacies"
                : pharmacies.length === 0
                ? "No pharmacies registered yet"
                : "No matching pharmacies"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error
                ? "Refresh the pharmacy directory to try again."
                : pharmacies.length === 0
                ? canCreatePharmacy
                  ? "Register your first pharmacy using the form above."
                  : "No pharmacy records are currently available in your organization."
                : "Try another search or license filter."}
            </p>
          </div>
        ) : (
          /* Pharmacy cards */

          <div className="grid gap-4 lg:grid-cols-2">
            {filteredPharmacies.map(
              (pharmacy) => (
                <article
                  key={pharmacy._id}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
                >
                  {/* Pharmacy heading */}

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-500">
                      <Pill size={24} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="break-words text-lg font-bold">
                        {pharmacy.pharmacyName}
                      </h4>

                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {getOrganizationName(
                          pharmacy
                        )}
                      </p>

                      <span
                        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          pharmacy.status === "inactive"
                            ? "bg-slate-500/10 text-slate-500 dark:text-slate-400"
                            : "bg-teal-500/10 text-teal-600 dark:text-teal-400"
                        }`}
                      >
                        {pharmacy.status === "inactive"
                          ? "Inactive Pharmacy"
                          : "Active Pharmacy"}
                      </span>
                    </div>

                    <LicenseBadge
                      date={
                        pharmacy.licenseExpiryDate
                      }
                    />
                  </div>

                  {/* Pharmacy details */}

                  <div className="mt-5 space-y-3 border-t border-slate-200 pt-5 text-sm dark:border-slate-700">
                    {/* Owner */}

                    <div className="flex items-start gap-3">
                      <UserRound
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Owner
                        </p>

                        <p className="mt-1 font-semibold">
                          {pharmacy.ownerName ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* Pharmacist */}

                    <div className="flex items-start gap-3">
                      <ShieldCheck
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Pharmacist
                        </p>

                        <p className="mt-1">
                          {pharmacy.pharmacistName ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

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
                          {pharmacy.licenseNumber ||
                            "N/A"}
                        </p>
                      </div>
                    </div>

                    {/* License expiry */}

                    <div className="flex items-start gap-3">
                      <CalendarDays
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          License Expiry
                        </p>

                        <p className="mt-1">
                          {pharmacy.licenseExpiryDate
                            ? new Date(
                                pharmacy.licenseExpiryDate
                              ).toLocaleDateString(
                                "en-IN",
                                {
                                  timeZone:
                                    "Asia/Kolkata",
                                }
                              )
                            : "N/A"}
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
                          {pharmacy.address ||
                            "N/A"}

                          {pharmacy.city
                            ? `, ${pharmacy.city}`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Tenant workspace information */}

                    {!isSuperAdmin && (
                      <div className="mt-4 flex items-center gap-2 rounded-lg bg-teal-500/5 px-3 py-2 text-xs font-medium text-teal-600 dark:text-teal-400">
                        <ShieldCheck size={15} />

                        Organization pharmacy
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
        License expiry indicators are calculated
        from recorded dates only. They do not
        independently verify license validity,
        renewal or regulatory authorization.
      </p>
    </div>
  );
}