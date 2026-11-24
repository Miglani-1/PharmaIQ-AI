import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  ArrowLeft,
  Users,
  UserPlus,
  ShieldCheck,
  Building2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  UserRound,
  Mail,
  Pencil,
  Eye,
  EyeOff,
  Sparkles,
  UserCheck,
  UserX,
} from "lucide-react";

import api from "./api";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "pharmacist",
  organization: "",
};

const initialEditForm = {
  role: "pharmacist",
  organization: "",
  isActive: false,
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

const panelClass =
  "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#142033] sm:p-7";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800";

function getId(value) {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
}

function RoleBadge({ role }) {
  const styles = {
    super_admin:
      "bg-violet-500/10 text-violet-600 dark:text-violet-400",

    organization_admin:
      "bg-blue-500/10 text-blue-600 dark:text-blue-400",

    pharmacist:
      "bg-teal-500/10 text-teal-600 dark:text-teal-400",

    auditor:
      "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        styles[role] ||
        "bg-slate-500/10 text-slate-500"
      }`}
    >
      {ROLE_LABELS[role] || role || "Unknown"}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
        active
          ? "bg-teal-500/10 text-teal-600 dark:text-teal-400"
          : "bg-red-500/10 text-red-600 dark:text-red-400"
      }`}
    >
      {active ? "Active" : "Inactive"}
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
    <div className={panelClass}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </p>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <h3 className="mt-4 text-3xl font-extrabold">
        {value}
      </h3>
    </div>
  );
}

function FormField({
  label,
  htmlFor,
  children,
  fullWidth = false,
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <label
        htmlFor={htmlFor}
        className="mb-2 block text-sm font-semibold"
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function Notification({
  message,
  type,
  onClose,
}) {
  if (!message) return null;

  const isError = type === "error";

  const Icon = isError
    ? AlertCircle
    : CheckCircle2;

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
        isError
          ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
          : "border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400"
      }`}
    >
      <Icon size={19} className="shrink-0" />

      <span className="flex-1">
        {message}
      </span>

      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={17} />
      </button>
    </div>
  );
}

function formatDate(value) {
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
}

export default function UsersPage({
  user,
  onBack,
}) {
  // Role-based permissions

  const isSuperAdmin =
    user?.role === "super_admin";

  const isOrganizationAdmin =
    user?.role === "organization_admin";

  const canManageUsers =
    isSuperAdmin || isOrganizationAdmin;

  const currentUserId = getId(user);

  const currentOrganizationId =
    getId(user?.organization);

  const allowedRoles = isSuperAdmin
    ? [
        "organization_admin",
        "pharmacist",
        "auditor",
      ]
    : ["pharmacist", "auditor"];

  // Application states

  const [users, setUsers] = useState([]);

  const [organizations, setOrganizations] =
    useState([]);

  const [form, setForm] = useState({
    ...initialForm,
  });

  const [editingUser, setEditingUser] =
    useState(null);

  const [editForm, setEditForm] = useState({
    ...initialEditForm,
  });

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [updating, setUpdating] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editError, setEditError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [roleFilter, setRoleFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  // Load accessible users and organizations

  const loadData = useCallback(
    async (signal) => {
      if (!canManageUsers) {
        setUsers([]);
        setOrganizations([]);
        setLoading(false);
        return false;
      }

      try {
        setLoading(true);
        setError("");

        const [usersResponse, orgResponse] =
          await Promise.all([
            api.get("/users/get", {
              signal,
            }),

            api.get("/organization/get", {
              signal,
            }),
          ]);

        if (signal?.aborted) return false;

        setUsers(
          usersResponse.data.users || []
        );

        setOrganizations(
          orgResponse.data.organizations || []
        );

        return true;
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return false;
        }

        setUsers([]);
        setOrganizations([]);

        setError(
          err.response?.data?.message ||
            "Failed to load users."
        );

        return false;
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [canManageUsers]
  );

  useEffect(() => {
    const controller =
      new AbortController();

    loadData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadData]);

  // Close popup using Escape key

  useEffect(() => {
    if (!editingUser) return;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const handleKeyDown = (event) => {
      if (
        event.key === "Escape" &&
        !updating
      ) {
        setEditingUser(null);
        setEditError("");
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [editingUser, updating]);

  // Active organizations

  const activeOrganizations =
    organizations.filter(
      (organization) =>
        organization.isActive === true
    );

  // Resolve organization name

  const getOrganizationName = (
    targetUser
  ) => {
    if (
      targetUser.role === "super_admin"
    ) {
      return "Platform Administration";
    }

    if (targetUser.organization?.name) {
      return targetUser.organization.name;
    }

    const organization =
      organizations.find(
        (item) =>
          getId(item) ===
          getId(targetUser.organization)
      );

    return organization?.name ||
      "Unassigned";
  };

  // Check whether target user can be managed

  const canManageTarget = (targetUser) => {
    if (
      !canManageUsers ||
      !currentUserId ||
      !getId(targetUser)
    ) {
      return false;
    }

    if (
      getId(targetUser) === currentUserId
    ) {
      return false;
    }

    if (
      targetUser.role === "super_admin"
    ) {
      return false;
    }

    if (isSuperAdmin) {
      return true;
    }

    return (
      ["pharmacist", "auditor"].includes(
        targetUser.role
      ) &&
      Boolean(currentOrganizationId) &&
      getId(targetUser.organization) ===
        currentOrganizationId
    );
  };

  // Create form changes

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm({ ...initialForm });
    setShowPassword(false);
  };

  // Create new user

  const handleCreateUser = async (
    event
  ) => {
    event.preventDefault();

    if (
      !canManageUsers ||
      saving ||
      updating ||
      loading
    ) {
      return;
    }

    setError("");
    setSuccess("");

    const organizationId = isSuperAdmin
      ? form.organization
      : currentOrganizationId;

    const payload = {
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
      organization: organizationId,
    };

    if (
      payload.name.length < 2 ||
      payload.name.length > 100
    ) {
      setError(
        "Name must contain 2 to 100 characters."
      );
      return;
    }

    if (
      payload.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        payload.email
      )
    ) {
      setError(
        "Please enter a valid email address."
      );
      return;
    }

    if (
      payload.password.length < 8 ||
      new TextEncoder().encode(
        payload.password
      ).length > 72
    ) {
      setError(
        "Password must contain at least 8 characters and no more than 72 bytes."
      );
      return;
    }

    if (
      !allowedRoles.includes(payload.role)
    ) {
      setError(
        "You cannot assign this role."
      );
      return;
    }

    if (
      !organizationId ||
      !activeOrganizations.some(
        (organization) =>
          getId(organization) ===
          organizationId
      )
    ) {
      setError(
        "Please select a valid active organization."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await api.post(
        "/users/create",
        payload
      );

      resetForm();

      setShowForm(false);

      const refreshed = await loadData();

      setSuccess(
        refreshed
          ? response.data.message ||
            "User created successfully."
          : "User created. Refresh the directory to see the account."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create user."
      );
    } finally {
      setSaving(false);
    }
  };

  // Open edit popup

  const openEdit = (targetUser) => {
    if (
      !canManageTarget(targetUser) ||
      saving ||
      updating ||
      loading
    ) {
      return;
    }

    setError("");
    setEditError("");
    setSuccess("");

    setEditForm({
      role: allowedRoles.includes(
        targetUser.role
      )
        ? targetUser.role
        : "pharmacist",

      organization: getId(
        targetUser.organization
      ),

      isActive:
        targetUser.isActive === true,
    });

    setEditingUser(targetUser);
  };

  // Close edit popup

  const closeEdit = () => {
    if (updating) return;

    setEditingUser(null);
    setEditError("");

    setEditForm({
      ...initialEditForm,
    });
  };

  // Handle edit form changes

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditForm((previous) => ({
      ...previous,

      [name]:
        name === "isActive"
          ? value === "active"
          : value,
    }));

    setEditError("");
  };

  // Update user role and access

  const handleUpdateUser = async (
    event
  ) => {
    event.preventDefault();

    if (
      updating ||
      saving ||
      loading ||
      !editingUser ||
      !canManageTarget(editingUser)
    ) {
      return;
    }

    setEditError("");
    setError("");
    setSuccess("");

    const targetId = getId(editingUser);

    const existingOrganizationId =
      getId(editingUser.organization);

    const organizationId =
      isSuperAdmin
        ? existingOrganizationId ||
          editForm.organization
        : currentOrganizationId;

    if (
      !allowedRoles.includes(
        editForm.role
      )
    ) {
      setEditError(
        "You cannot assign this role."
      );
      return;
    }

    if (
      existingOrganizationId &&
      existingOrganizationId !==
        organizationId
    ) {
      setEditError(
        "Existing users cannot be transferred between organizations."
      );
      return;
    }

    const validOrganization =
      activeOrganizations.some(
        (organization) =>
          getId(organization) ===
          organizationId
      );

    if (
      editForm.isActive &&
      (!organizationId ||
        !validOrganization)
    ) {
      setEditError(
        "Please assign an active organization before activating this account."
      );
      return;
    }

    const payload = {};

    if (
      editForm.role !== editingUser.role
    ) {
      payload.role = editForm.role;
    }

    if (
      editForm.isActive !==
      (editingUser.isActive === true)
    ) {
      payload.isActive =
        editForm.isActive;
    }

    if (
      isSuperAdmin &&
      !existingOrganizationId &&
      organizationId
    ) {
      if (!validOrganization) {
        setEditError(
          "Please select an active organization."
        );
        return;
      }

      payload.organization =
        organizationId;
    }

    if (
      Object.keys(payload).length === 0
    ) {
      setEditError(
        "No changes were made."
      );
      return;
    }

    const confirmed = window.confirm(
      "Have you verified this user's identity and organization membership? Confirm these account access changes."
    );

    if (!confirmed) return;

    try {
      setUpdating(true);

      const response = await api.patch(
        `/users/${targetId}`,
        payload
      );

      setEditingUser(null);

      setEditForm({
        ...initialEditForm,
      });

      const refreshed = await loadData();

      setSuccess(
        refreshed
          ? response.data.message ||
            "User access updated successfully."
          : "User updated. Refresh the directory to see the changes."
      );
    } catch (err) {
      if (err.response?.status === 409) {
        setEditingUser(null);

        await loadData();

        setError(
          "User data changed. Please open the account again."
        );
      } else {
        setEditError(
          err.response?.data?.message ||
            "Failed to update user."
        );
      }
    } finally {
      setUpdating(false);
    }
  };

  // Statistics

  const activeCount = users.filter(
    (item) => item.isActive === true
  ).length;

  const inactiveCount = users.filter(
    (item) => item.isActive !== true
  ).length;

  const unassignedCount = users.filter(
    (item) =>
      item.role !== "super_admin" &&
      !getId(item.organization)
  ).length;

  // Search and filter users

  const filteredUsers = users.filter(
    (item) => {
      const searchableText = [
        item.name,
        item.email,
        ROLE_LABELS[item.role],
        getOrganizationName(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(
          search.trim().toLowerCase()
        );

      const matchesRole =
        roleFilter === "all" ||
        item.role === roleFilter;

      let matchesStatus = true;

      if (statusFilter === "active") {
        matchesStatus =
          item.isActive === true;
      }

      if (statusFilter === "inactive") {
        matchesStatus =
          item.isActive !== true;
      }

      if (statusFilter === "unassigned") {
        matchesStatus =
          item.role !== "super_admin" &&
          !getId(item.organization);
      }

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    }
  );

  // Block unauthorized roles

  if (!canManageUsers) {
    return (
      <div className={`${panelClass} py-16 text-center`}>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
          <Lock size={30} />
        </div>

        <h2 className="text-xl font-bold">
          Access Restricted
        </h2>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Only Super Admins and Organization
          Admins can access user management.
        </p>

        <button
          type="button"
          onClick={onBack}
          className={`${primaryButton} mt-6`}
        >
          <ArrowLeft size={17} />

          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-7 text-slate-900 dark:text-slate-100">

      {/* Page heading */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-600 dark:text-teal-400">
            Identity & Access Management
          </p>

          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            User Management
          </h1>

          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Manage user accounts, roles and
            organization-level access.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className={secondaryButton}
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

              Secure Access Management
            </span>

            <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
              Right people.

              <br />

              <span className="text-teal-200">
                Right permissions.
              </span>
            </h2>

            <p className="mt-3 text-sm leading-7 text-teal-50/80">
              {isSuperAdmin
                ? "Manage platform users, assign organizations and control role-based access across the compliance workspace."
                : "Manage pharmacists and auditors within your assigned organization."}
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold">
              <ShieldCheck size={15} />

              {ROLE_LABELS[user.role]}
            </div>
          </div>

          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-white/20 bg-white/10">
            <Users
              size={62}
              className="text-teal-100"
            />
          </div>
        </div>
      </section>

      {/* Workspace information */}

      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
            <ShieldCheck size={22} />
          </div>

          <div>
            <p className="text-sm font-bold">
              {isSuperAdmin
                ? "Platform-wide Administration"
                : "Organization Administration"}
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {isSuperAdmin
                ? "Manage tenant accounts and activate verified registrations."
                : `Your workspace: ${
                    user.organization?.name ||
                    "Assigned organization"
                  }. Manage pharmacists and auditors only.`}
            </p>
          </div>
        </div>

        <RoleBadge role={user.role} />
      </section>

      {/* Statistics */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Accessible Users"
          value={users.length}
          Icon={Users}
          color="bg-sky-500/10 text-sky-500"
        />

        <MetricCard
          title="Active Users"
          value={activeCount}
          Icon={UserCheck}
          color="bg-teal-500/10 text-teal-500"
        />

        <MetricCard
          title="Inactive Users"
          value={inactiveCount}
          Icon={UserX}
          color="bg-red-500/10 text-red-500"
        />

        <MetricCard
          title={
            isSuperAdmin
              ? "Unassigned Users"
              : "Auditors"
          }
          value={
            isSuperAdmin
              ? unassignedCount
              : users.filter(
                  (item) =>
                    item.role === "auditor"
                ).length
          }
          Icon={
            isSuperAdmin
              ? Building2
              : ShieldCheck
          }
          color="bg-violet-500/10 text-violet-500"
        />
      </div>

      {/* Notifications */}

      <Notification
        message={error}
        type="error"
        onClose={() => setError("")}
      />

      <Notification
        message={success}
        type="success"
        onClose={() => setSuccess("")}
      />

      {/* Pending registrations */}

      {isSuperAdmin &&
        unassignedCount > 0 && (
          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/10 p-3 text-amber-500">
                <UserPlus size={24} />
              </div>

              <div>
                <h3 className="font-bold">
                  Unassigned Registrations
                </h3>

                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {unassignedCount} user account(s)
                  require organization assignment.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
                setStatusFilter("unassigned");
              }}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-600"
            >
              View Registrations
            </button>
          </section>
        )}

      {/* Create user section */}

      <section className={panelClass}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
              <UserPlus size={23} />
            </div>

            <div>
              <h3 className="text-lg font-bold">
                Create New User
              </h3>

              <p className="text-sm text-slate-500 dark:text-slate-400">
                Register an authorized team member.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving || updating}
            onClick={() =>
              setShowForm(
                (previous) => !previous
              )
            }
            className={primaryButton}
          >
            {showForm
              ? "Hide Form"
              : "Add User"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreateUser}
            className="mt-7 grid gap-5 md:grid-cols-2"
          >
            <FormField
              label="Full Name *"
              htmlFor="user-name"
            >
              <input
                id="user-name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                disabled={saving}
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                className={inputClass}
              />
            </FormField>

            <FormField
              label="Email Address *"
              htmlFor="user-email"
            >
              <input
                id="user-email"
                name="email"
                type="email"
                required
                maxLength={254}
                disabled={saving}
                value={form.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className={inputClass}
              />
            </FormField>

            <FormField
              label="Initial Password *"
              htmlFor="user-password"
            >
              <div className="relative">
                <input
                  id="user-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  required
                  minLength={8}
                  autoComplete="new-password"
                  disabled={saving}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Minimum 8 characters"
                  className={`${inputClass} pr-12`}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </FormField>

            <FormField
              label="User Role *"
              htmlFor="user-role"
            >
              <select
                id="user-role"
                name="role"
                value={form.role}
                onChange={handleChange}
                disabled={saving}
                className={inputClass}
              >
                {allowedRoles.map((role) => (
                  <option
                    key={role}
                    value={role}
                  >
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              label="Organization *"
              htmlFor="user-organization"
              fullWidth
            >
              {isSuperAdmin ? (
                <select
                  id="user-organization"
                  name="organization"
                  required
                  disabled={saving || loading}
                  value={form.organization}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="">
                    Select Organization
                  </option>

                  {activeOrganizations.map(
                    (organization) => (
                      <option
                        key={getId(organization)}
                        value={getId(organization)}
                      >
                        {organization.name}
                      </option>
                    )
                  )}
                </select>
              ) : (
                <input
                  id="user-organization"
                  type="text"
                  disabled
                  value={
                    user.organization?.name ||
                    "Assigned organization"
                  }
                  className={inputClass}
                />
              )}
            </FormField>

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  updating ||
                  loading ||
                  activeOrganizations.length === 0
                }
                className={primaryButton}
              >
                {saving ? (
                  <RefreshCw
                    size={18}
                    className="animate-spin"
                  />
                ) : (
                  <UserPlus size={18} />
                )}

                {saving
                  ? "Creating..."
                  : "Create User"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className={secondaryButton}
              >
                Clear Form
              </button>
            </div>

            {activeOrganizations.length === 0 &&
              !loading && (
                <p className="text-sm text-amber-600 dark:text-amber-400 md:col-span-2">
                  An active organization is
                  required before creating users.
                </p>
              )}
          </form>
        )}
      </section>

      {/* User directory */}

      <section className={panelClass}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">
              User Directory
            </h3>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {users.length} accessible user accounts
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadData()}
            disabled={
              loading ||
              saving ||
              updating
            }
            aria-label="Refresh users"
            title="Refresh users"
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

        <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_210px_180px]">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, email, organization..."
              aria-label="Search users"
              className={`${inputClass} pl-11`}
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(event.target.value)
            }
            aria-label="Filter users by role"
            className={inputClass}
          >
            <option value="all">
              All Roles
            </option>

            {isSuperAdmin && (
              <>
                <option value="super_admin">
                  Super Admin
                </option>

                <option value="organization_admin">
                  Organization Admin
                </option>
              </>
            )}

            <option value="pharmacist">
              Pharmacist
            </option>

            <option value="auditor">
              Auditor
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
            aria-label="Filter users by status"
            className={inputClass}
          >
            <option value="all">
              All Statuses
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>

            {isSuperAdmin && (
              <option value="unassigned">
                Unassigned
              </option>
            )}
          </select>
        </div>

        {/* Loading state */}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
            <RefreshCw
              size={20}
              className="animate-spin"
            />

            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-14 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-500/10 text-slate-400">
              <Users size={32} />
            </div>

            <h4 className="font-bold">
              {error
                ? "Unable to load users"
                : users.length === 0
                ? "No users available"
                : "No matching users"}
            </h4>

            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {error
                ? "Refresh the directory to try again."
                : users.length === 0
                ? "Create an authorized team member to get started."
                : "Try a different search or filter."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredUsers.map((item) => {
              const targetId = getId(item);

              const isCurrentUser =
                targetId === currentUserId;

              const manageable =
                canManageTarget(item);

              const isUnassigned =
                item.role !== "super_admin" &&
                !getId(item.organization);

              return (
                <article
                  key={targetId}
                  className="rounded-2xl border border-slate-200 p-5 transition hover:border-teal-500/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/40"
                >
                  {/* User heading */}

                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-lg font-extrabold uppercase text-teal-500">
                      {item.name?.charAt(0) ||
                        "U"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="break-words text-lg font-bold">
                        {item.name}
                      </h4>

                      {isCurrentUser && (
                        <p className="mt-1 text-xs font-semibold text-teal-500">
                          Your Account
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2">
                        <RoleBadge
                          role={item.role}
                        />

                        <StatusBadge
                          active={
                            item.isActive === true
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* User details */}

                  <div className="mt-5 space-y-4 border-t border-slate-200 pt-5 text-sm dark:border-slate-700">
                    <div className="flex items-start gap-3">
                      <Mail
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Email Address
                        </p>

                        <p className="mt-1 break-all">
                          {item.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Building2
                        size={17}
                        className="mt-0.5 shrink-0 text-teal-500"
                      />

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Organization
                        </p>

                        <p className="mt-1 font-semibold">
                          {getOrganizationName(
                            item
                          )}
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
                          Account Created
                        </p>

                        <p className="mt-1">
                          {formatDate(
                            item.createdAt
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending activation notice */}

                  {isUnassigned && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs leading-5 text-amber-600 dark:text-amber-400">
                      <AlertCircle
                        size={16}
                        className="shrink-0"
                      />

                      Organization assignment
                      and identity verification
                      are required before
                      activation.
                    </div>
                  )}

                  {/* User management button */}

                  <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                    {manageable ? (
                      <button
                        type="button"
                        disabled={
                          saving ||
                          updating ||
                          loading
                        }
                        onClick={() =>
                          openEdit(item)
                        }
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-500/30 px-4 py-3 text-sm font-bold text-teal-600 hover:bg-teal-500/10 disabled:opacity-50 dark:text-teal-400"
                      >
                        <Pencil size={17} />

                        {isUnassigned &&
                        !item.isActive
                          ? "Review & Approve User"
                          : "Manage User Access"}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg bg-slate-500/5 p-3 text-xs text-slate-500 dark:text-slate-400">
                        <Lock size={15} />

                        {isCurrentUser
                          ? "Self-modification is restricted."
                          : item.role === "super_admin"
                          ? "Protected Super Admin account."
                          : "Read-only account."}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* EDIT USER POPUP MODAL */}

      {editingUser &&
        canManageUsers &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
            onClick={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeEdit();
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="edit-user-heading"
             className="custom-scrollbar relative max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-[#142033] dark:text-white"
            >
              {/* Popup header */}

              <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
                    <ShieldCheck size={25} />
                  </div>

                  <div>
                    <h3
                      id="edit-user-heading"
                      className="text-xl font-extrabold"
                    >
                      {!getId(
                        editingUser.organization
                      ) &&
                      !editingUser.isActive
                        ? "Approve User Registration"
                        : "Edit User Access"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Configure account permissions.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={updating}
                  aria-label="Close user editor"
                  className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={23} />
                </button>
              </div>

              {/* Popup body */}

              <form
                onSubmit={handleUpdateUser}
                className="space-y-5 p-6"
              >
                {/* Selected user */}

                <div className="flex items-center gap-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-xl font-bold uppercase text-teal-500">
                    {editingUser.name?.charAt(0) ||
                      "U"}
                  </div>

                  <div className="min-w-0">
                    <h4 className="break-words font-bold">
                      {editingUser.name}
                    </h4>

                    <p className="mt-1 break-all text-sm text-slate-500 dark:text-slate-400">
                      {editingUser.email}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <RoleBadge
                        role={editingUser.role}
                      />

                      <StatusBadge
                        active={
                          editingUser.isActive === true
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* User role */}

                <FormField
                  label="User Role"
                  htmlFor="edit-user-role"
                >
                  <select
                    id="edit-user-role"
                    name="role"
                    autoFocus
                    value={editForm.role}
                    disabled={updating}
                    onChange={handleEditChange}
                    className={inputClass}
                  >
                    {allowedRoles.map((role) => (
                      <option
                        key={role}
                        value={role}
                      >
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Organization */}

                <FormField
                  label="Assign Organization"
                  htmlFor="edit-user-organization"
                >
                  {isSuperAdmin &&
                  !getId(
                    editingUser.organization
                  ) ? (
                    <select
                      id="edit-user-organization"
                      name="organization"
                      value={editForm.organization}
                      disabled={updating}
                      onChange={handleEditChange}
                      className={inputClass}
                    >
                      <option value="">
                        Select Organization
                      </option>

                      {activeOrganizations.map(
                        (organization) => (
                          <option
                            key={getId(organization)}
                            value={getId(organization)}
                          >
                            {organization.name}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <input
                      id="edit-user-organization"
                      type="text"
                      disabled
                      value={getOrganizationName(
                        editingUser
                      )}
                      className={inputClass}
                    />
                  )}

                  {isSuperAdmin &&
                    !getId(
                      editingUser.organization
                    ) &&
                    activeOrganizations.length === 0 && (
                      <p className="mt-2 text-xs text-amber-500">
                        Create an active organization
                        before approving this user.
                      </p>
                    )}
                </FormField>

                {/* Account status */}

                <FormField
                  label="Account Status"
                  htmlFor="edit-user-status"
                >
                  <select
                    id="edit-user-status"
                    name="isActive"
                    value={
                      editForm.isActive
                        ? "active"
                        : "inactive"
                    }
                    disabled={updating}
                    onChange={handleEditChange}
                    className={inputClass}
                  >
                    <option value="inactive">
                      Inactive — Login Disabled
                    </option>

                    <option value="active">
                      Active — Login Enabled
                    </option>
                  </select>
                </FormField>

                {/* Activation information */}

                {editForm.isActive && (
                  <div className="flex items-start gap-3 rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 text-sm text-teal-600 dark:text-teal-400">
                    <CheckCircle2
                      size={19}
                      className="shrink-0"
                    />

                    <p>
                      This user will be able to
                      log in after the account is
                      successfully activated,
                      provided the assigned
                      organization is active.
                    </p>
                  </div>
                )}

                {/* Security warning */}

                <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-xs leading-6 text-amber-600 dark:text-amber-400">
                  <ShieldCheck
                    size={18}
                    className="shrink-0"
                  />

                  <p>
                    Verify the user's identity
                    and organization membership
                    before approving access.
                    Existing users cannot be
                    transferred between
                    organizations. Deactivation
                    preserves historical
                    compliance records.
                  </p>
                </div>

                {/* Popup errors */}

                <Notification
                  message={editError}
                  type="error"
                  onClose={() =>
                    setEditError("")
                  }
                />

                {/* Popup footer */}

                <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-700">
                  <button
                    type="button"
                    disabled={updating}
                    onClick={closeEdit}
                    className={secondaryButton}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      updating ||
                      saving ||
                      loading
                    }
                    className={primaryButton}
                  >
                    {updating ? (
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />
                    ) : (
                      <CheckCircle2 size={18} />
                    )}

                    {updating
                      ? "Saving..."
                      : !editingUser.isActive &&
                        editForm.isActive
                      ? "Approve & Activate"
                      : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body
        )}

      {/* Security disclaimer */}

      <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
        User permissions are enforced by the
        backend authorization system. Account
        deactivation preserves historical audit,
        document and compliance records.
      </p>
    </div>
  );
}