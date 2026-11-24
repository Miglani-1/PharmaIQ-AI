import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Pill,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  X,
  XCircle,
  Users as UsersIcon,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import api from "./api";
import Login from "./Login";
import Documents from "./Documents";
import Organizations from "./Organizations";
import Pharmacies from "./Pharmacies";
import Audits from "./Audits";
import CAPAs from "./CAPAs";
import Reviews from "./Reviews";
import Users from "./Users";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1600&q=85";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  organization_admin: "Organization Admin",
  pharmacist: "Pharmacist",
  auditor: "Auditor",
};

const ALL_ROLES = [
  "super_admin",
  "organization_admin",
  "pharmacist",
  "auditor",
];

const navigation = [
  {
    page: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    page: "organizations",
    title: "Organizations",
    icon: Building2,
    roles: ALL_ROLES,
  },
  {
    page: "pharmacies",
    title: "Pharmacies",
    icon: Pill,
    roles: ALL_ROLES,
  },
  {
    page: "documents",
    title: "Documents",
    icon: FileText,
    roles: ALL_ROLES,
  },
  {
    page: "reviews",
    title: "Human Reviews",
    icon: ClipboardCheck,
    roles: ALL_ROLES,
  },
  {
    page: "audits",
    title: "Audits",
    icon: ClipboardList,
    roles: ALL_ROLES,
  },
  {
    page: "capas",
    title: "CAPA Management",
    icon: ListTodo,
    roles: ALL_ROLES,
  },
  {
  page: "users",
  title: "User Management",
  icon: UsersIcon,
  roles: ["super_admin", "organization_admin"],
},
];

const riskColors = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#14b8a6",
  unknown: "#94a3b8",
};

const findingColors = {
  potential_gap: "#f97316",
  not_verified: "#eab308",
  observation: "#38bdf8",
};

const reviewColors = {
  pending: "#f59e0b",
  approved: "#14b8a6",
  rejected: "#ef4444",
  reviewed: "#64748b",
};

const auditColors = {
  planned: "#94a3b8",
  in_progress: "#38bdf8",
  completed: "#14b8a6",
};

const capaColors = {
  open: "#ef4444",
  in_progress: "#f59e0b",
  completed: "#14b8a6",
};

function getInitialTheme() {
  try {
    return localStorage.getItem("pharmaiq-theme") === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function isValidSession(user) {
  return Boolean(
    user &&
      user.id &&
      user.isActive === true &&
      ALL_ROLES.includes(user.role) &&
      (
        user.role === "super_admin" ||
        user.organization
      )
  );
}

function StatCard({
  title,
  value,
  Icon,
  dark,
  tone = "teal",
}) {
  const tones = {
    teal: "bg-teal-500/10 text-teal-500",
    blue: "bg-sky-500/10 text-sky-500",
    violet: "bg-violet-500/10 text-violet-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-rose-500/10 text-rose-500",
  };

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        dark
          ? "border-slate-800 bg-[#142033]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={`text-sm font-medium ${
            dark
              ? "text-slate-400"
              : "text-slate-500"
          }`}
        >
          {title}
        </p>

        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight">
        {value ?? 0}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  breakdown,
  colors,
  type = "pie",
  dark,
}) {
  const chartData = Object.entries(breakdown || {})
    .map(([key, value]) => ({
      key,
      name: key.replaceAll("_", " "),
      value: Number(value) || 0,
    }))
    .filter((item) => item.value > 0);

  const muted = dark ? "#94a3b8" : "#64748b";

  return (
    <section
      className={`min-w-0 rounded-2xl border p-5 shadow-sm ${
        dark
          ? "border-slate-800 bg-[#142033]"
          : "border-slate-200 bg-white"
      }`}
    >
      <h3 className="mb-5 text-base font-bold">
        {title}
      </h3>

      {chartData.length === 0 ? (
        <div
          className={`flex h-64 items-center justify-center text-sm ${
            dark
              ? "text-slate-500"
              : "text-slate-400"
          }`}
        >
          No data available yet
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            {type === "pie" ? (
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="46%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                >
                  {chartData.map((item) => (
                    <Cell
                      key={item.key}
                      fill={colors[item.key] || muted}
                    />
                  ))}
                </Pie>

                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    color: "#0f172a",
                  }}
                />

                <Legend
                  wrapperStyle={{
                    fontSize: 11,
                    color: muted,
                  }}
                />
              </PieChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 5,
                  left: -20,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={
                    dark ? "#334155" : "#e2e8f0"
                  }
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fill: muted,
                    fontSize: 10,
                  }}
                  interval={0}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fill: muted,
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    color: "#0f172a",
                  }}
                />

                <Bar
                  dataKey="value"
                  name="Count"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                >
                  {chartData.map((item) => (
                    <Cell
                      key={item.key}
                      fill={colors[item.key] || muted}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function App() {
  // Authentication and user session

  const [user, setUser] = useState(null);

  const [checkingAuth, setCheckingAuth] =
    useState(true);

  const authenticated = isValidSession(user);

  // Dashboard states

  const [page, setPage] = useState("dashboard");

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  // UI states

  const [theme, setTheme] =
    useState(getInitialTheme);

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const dark = theme === "dark";

  // Current user role and organization

  const roleLabel =
    ROLE_LABELS[user?.role] || "Unknown Role";

  const isSuperAdmin =
    user?.role === "super_admin";

  const organizationName = isSuperAdmin
    ? "Platform Workspace"
    : user?.organization?.name ||
      "Organization Workspace";

  // Role-based navigation

  const visibleNavigation = navigation.filter(
    (item) => item.roles.includes(user?.role)
  );

  // Reset authenticated session

  const clearSession = useCallback(() => {
    setUser(null);
    setData(null);
    setPage("dashboard");
    setError("");
    setSidebarOpen(false);
    setLoading(false);
  }, []);

  // Theme management

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      dark
    );

    document.documentElement.style.colorScheme =
      theme;

    try {
      localStorage.setItem(
        "pharmaiq-theme",
        theme
      );
    } catch {
      // Theme works without browser storage.
    }
  }, [dark, theme]);

  // Load dashboard statistics

  const loadDashboard = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(
          "/dashboard/stats",
          { signal }
        );

        if (!signal?.aborted) {
          setData(response.data);
        }
      } catch (err) {
        if (
          signal?.aborted ||
          err.code === "ERR_CANCELED"
        ) {
          return;
        }

        setData(null);

        if (
          err.response?.status === 401 ||
          err.response?.status === 403
        ) {
          clearSession();
        } else {
          setError(
            err.response?.data?.message ||
              "Unable to load dashboard."
          );
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [clearSession]
  );

  // Verify existing session

  useEffect(() => {
    const controller = new AbortController();

    const checkAuth = async () => {
      try {
        const response = await api.get(
          "/auth/me",
          {
            signal: controller.signal,
          }
        );

        if (!controller.signal.aborted) {
          const currentUser = response.data.user;

          setUser(
            isValidSession(currentUser)
              ? currentUser
              : null
          );
        }
      } catch {
        if (!controller.signal.aborted) {
          setUser(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingAuth(false);
        }
      }
    };

    checkAuth();

    return () => {
      controller.abort();
    };
  }, []);

  // Load dashboard after authentication

  useEffect(() => {
    if (
      !authenticated ||
      page !== "dashboard"
    ) {
      return;
    }

    const controller = new AbortController();

    loadDashboard(controller.signal);

    return () => {
      controller.abort();
    };
  }, [
    authenticated,
    user?.id,
    page,
    loadDashboard,
  ]);

  // Login handler

  const handleLogin = async () => {
    const response = await api.get("/auth/me");

    const currentUser = response.data.user;

    if (!isValidSession(currentUser)) {
      throw new Error(
        "Your account is inactive or does not have a valid role."
      );
    }

    setTheme(getInitialTheme());

    setError("");

    setData(null);

    setPage("dashboard");

    setSidebarOpen(false);

    setUser(currentUser);
  };

  // Logout handler

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await api.post("/auth/logout");

      clearSession();
    } catch (err) {
      if (err.response?.status === 401) {
        clearSession();
      } else {
        setError(
          err.response?.data?.message ||
            "Logout failed. Please try again."
        );
      }
    } finally {
      setLoggingOut(false);
    }
  };

  // Secure navigation at UI level

  const navigate = (nextPage) => {
    const allowed = visibleNavigation.some(
      (item) => item.page === nextPage
    );

    if (!allowed) {
      setError(
        "You do not have permission to access this page."
      );

      return;
    }

    setPage(nextPage);

    setSidebarOpen(false);

    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const panel = dark
    ? "border-slate-800 bg-[#142033]"
    : "border-slate-200 bg-white";

  const muted = dark
    ? "text-slate-400"
    : "text-slate-500";

  const currentTitle =
    visibleNavigation.find(
      (item) => item.page === page
    )?.title || "Dashboard";

  // Checking session screen

  if (checkingAuth) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center ${
          dark
            ? "bg-[#0b1220] text-white"
            : "bg-slate-50 text-slate-900"
        }`}
      >
        <div className="text-center">
          <RefreshCw
            className="mx-auto mb-4 animate-spin text-teal-500"
            size={32}
          />

          <p>Checking your session...</p>
        </div>
      </div>
    );
  }

  // Login page

  if (!authenticated) {
    return <Login onLogin={handleLogin} />;
  }

  // Dashboard statistics

  const stats = data?.stats;

  const cards = [
    [
      "Organizations",
      stats?.totalOrganizations,
      Building2,
      "blue",
    ],
    [
      "Pharmacies",
      stats?.totalPharmacies,
      Pill,
      "violet",
    ],
    [
      "Documents",
      stats?.totalDocuments,
      FileText,
      "teal",
    ],
    [
      "AI Analyses",
      stats?.totalAnalyses,
      BrainCircuit,
      "blue",
    ],
    [
      "Compliance Findings",
      stats?.totalFindings,
      AlertTriangle,
      "amber",
    ],
    [
      "Pending Reviews",
      stats?.pendingReviews,
      ClipboardCheck,
      "amber",
    ],
    [
      "Approved Reviews",
      stats?.approvedReviews,
      CheckCircle2,
      "teal",
    ],
    [
      "Rejected Reviews",
      stats?.rejectedReviews,
      XCircle,
      "red",
    ],
    [
      "Total Audits",
      stats?.totalAudits,
      ClipboardList,
      "blue",
    ],
    [
      "Completed Audits",
      stats?.completedAudits,
      CheckCircle2,
      "teal",
    ],
    [
      "Open CAPAs",
      stats?.openCAPAs,
      ListTodo,
      "amber",
    ],
    [
      "Expired Licenses",
      stats?.expiredLicenses,
      ShieldAlert,
      "red",
    ],
  ];

  // Application modules

 const otherPages = {
  organizations: Organizations,
  pharmacies: Pharmacies,
  documents: Documents,
  reviews: Reviews,
  audits: Audits,
  capas: CAPAs,
  users: Users,
};

  const canAccessCurrentPage =
    visibleNavigation.some(
      (item) => item.page === page
    );

  const ActivePage = canAccessCurrentPage
    ? otherPages[page]
    : null;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        dark
          ? "bg-[#0b1220] text-slate-100"
          : "bg-[#f5f8fb] text-slate-900"
      }`}
    >
      {/* Mobile sidebar overlay */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden"
        />
      )}

      {/* Sidebar */}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-all duration-300 ${panel} ${
          sidebarCollapsed
            ? "lg:w-20"
            : "lg:w-64"
        } ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Sidebar logo */}

        <div className="flex h-20 items-center justify-between border-b border-slate-500/10 px-4">
          <button
            type="button"
            onClick={() => navigate("dashboard")}
            className="flex items-center gap-3 overflow-hidden text-left"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white">
              <ShieldCheck size={25} />
            </span>

            <span
              className={`min-w-0 ${
                sidebarCollapsed
                  ? "lg:hidden"
                  : ""
              }`}
            >
              <span className="block whitespace-nowrap text-lg font-extrabold">
                Pharma
                <span className="text-teal-500">
                  IQ
                </span>{" "}
                AI
              </span>

              <span
                className={`block whitespace-nowrap text-[10px] uppercase tracking-wider ${muted}`}
              >
                Compliance Intelligence
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
            className="lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current workspace */}

        <div
          className={`mx-3 mt-4 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 ${
            sidebarCollapsed
              ? "lg:hidden"
              : ""
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={17}
              className="shrink-0 text-teal-500"
            />

            <p className="truncate text-xs font-bold text-teal-500">
              {roleLabel}
            </p>
          </div>

          <p
            className={`mt-2 truncate text-xs ${muted}`}
            title={organizationName}
          >
            {organizationName}
          </p>
        </div>

        {/* Sidebar navigation */}

        <div className="flex-1 overflow-y-auto px-3 py-6">
          <p
            className={`mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] ${
              sidebarCollapsed
                ? "lg:hidden"
                : ""
            } ${muted}`}
          >
            Workspace
          </p>

          <nav
            aria-label="Main navigation"
            className="space-y-1.5"
          >
            {visibleNavigation.map((item) => {
              const Icon = item.icon;

              const active = page === item.page;

              return (
                <button
                  key={item.page}
                  type="button"
                  title={item.title}
                  aria-current={
                    active ? "page" : undefined
                  }
                  onClick={() =>
                    navigate(item.page)
                  }
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${
                    active
                      ? "bg-teal-600 text-white shadow-lg shadow-teal-600/20"
                      : dark
                      ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={19}
                    className="shrink-0"
                  />

                  <span
                    className={`truncate ${
                      sidebarCollapsed
                        ? "lg:hidden"
                        : ""
                    }`}
                  >
                    {item.title}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar bottom */}

        <div className="border-t border-slate-500/10 p-3">
          <div
            className={`mb-3 rounded-xl px-3 py-2 ${
              sidebarCollapsed
                ? "lg:hidden"
                : ""
            }`}
          >
            <p className="truncate text-sm font-bold">
              {user.name}
            </p>

            <p
              className={`mt-1 truncate text-xs ${muted}`}
              title={user.email}
            >
              {user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Log out"
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold disabled:opacity-50 ${
              dark
                ? "text-rose-300 hover:bg-slate-800"
                : "text-rose-600 hover:bg-rose-50"
            }`}
          >
            {loggingOut ? (
              <RefreshCw
                size={19}
                className="animate-spin"
              />
            ) : (
              <LogOut size={19} />
            )}

            <span
              className={
                sidebarCollapsed
                  ? "lg:hidden"
                  : ""
              }
            >
              {loggingOut
                ? "Logging out..."
                : "Log out"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSidebarCollapsed(
                !sidebarCollapsed
              )
            }
            aria-label="Toggle sidebar width"
            className={`mt-2 hidden w-full items-center justify-center rounded-lg py-2 lg:flex ${muted}`}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={19} />
            ) : (
              <ChevronLeft size={19} />
            )}
          </button>
        </div>
      </aside>

      {/* Main content area */}

      <div
        className={`min-w-0 transition-all duration-300 ${
          sidebarCollapsed
            ? "lg:pl-20"
            : "lg:pl-64"
        }`}
      >
        {/* Sticky header */}

        <header
          className={`sticky top-0 z-30 border-b backdrop-blur-xl ${
            dark
              ? "border-slate-800 bg-[#0b1220]/95"
              : "border-slate-200 bg-white/95"
          }`}
        >
          <div className="flex h-20 items-center justify-between gap-3 px-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() =>
                  setSidebarOpen(true)
                }
                className={`rounded-xl p-2 lg:hidden ${
                  dark
                    ? "hover:bg-slate-800"
                    : "hover:bg-slate-100"
                }`}
              >
                <Menu size={23} />
              </button>

              <div className="min-w-0">
                <p className={`text-xs ${muted}`}>
                  PharmaIQ AI / Workspace
                </p>

                <h1 className="truncate text-lg font-bold sm:text-xl">
                  {currentTitle}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Refresh dashboard */}

              {page === "dashboard" && (
                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  disabled={loading}
                  title="Refresh dashboard"
                  className={`rounded-xl border p-2.5 ${panel} disabled:opacity-50`}
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
              )}

              {/* Theme toggle */}

              <button
                type="button"
                onClick={() =>
                  setTheme(
                    dark ? "light" : "dark"
                  )
                }
                title={
                  dark
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
                aria-label="Toggle dark and light mode"
                className={`rounded-xl border p-2.5 ${panel}`}
              >
                {dark ? (
                  <Sun
                    size={19}
                    className="text-amber-400"
                  />
                ) : (
                  <Moon
                    size={19}
                    className="text-slate-600"
                  />
                )}
              </button>

              {/* User profile */}

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="max-w-[160px] truncate text-sm font-bold">
                    {user.name}
                  </p>

                  <p className="text-xs font-medium text-teal-500">
                    {roleLabel}
                  </p>

                  <p
                    className={`max-w-[160px] truncate text-xs ${muted}`}
                  >
                    {organizationName}
                  </p>
                </div>

                <div
                  title={`${user.name} - ${roleLabel}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600/10 text-teal-500"
                >
                  <ShieldCheck size={21} />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}

        <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-7">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-500"
            >
              {error}
            </div>
          )}

          {page === "dashboard" ? (
            <div className="space-y-7">
              {/* Dashboard hero */}

              <section className="relative overflow-hidden rounded-3xl bg-[#0f3542] text-white shadow-xl shadow-teal-900/10">
                <img
                  src={HERO_IMAGE}
                  alt="Pharmaceutical research laboratory"
                  className="absolute inset-0 h-full w-full object-cover opacity-30"
                />

                <div className="absolute inset-0 bg-gradient-to-r from-[#0c2734] via-[#0c2734]/90 to-[#0c2734]/30" />

                <div className="relative max-w-2xl px-6 py-9 sm:px-10 sm:py-12">
                  <span className="inline-flex items-center gap-2 rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1.5 text-xs font-bold text-teal-200">
                    <Activity size={14} />
                    AI-assisted compliance workspace
                  </span>

                  <p className="mt-4 text-sm font-medium text-teal-200">
                    Welcome back, {user.name}
                  </p>

                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                    Smarter compliance.
                    <br />

                    <span className="text-teal-300">
                      Clearer decisions.
                    </span>
                  </h2>

                  <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 sm:text-base">
                    Manage pharmacy records, review
                    AI-generated findings, and track
                    audits and corrective actions
                    from one place.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs">
                      {roleLabel}
                    </span>

                    <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-xs">
                      {organizationName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate("documents")
                    }
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-teal-400"
                  >
                    Manage documents
                    <ArrowRight size={17} />
                  </button>
                </div>
              </section>

              {/* Workspace access information */}

              <section
                className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${panel}`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-teal-500/10 p-3 text-teal-500">
                    <ShieldCheck size={23} />
                  </div>

                  <div>
                    <p className="text-sm font-bold">
                      {isSuperAdmin
                        ? "Platform-wide Access"
                        : "Organization-level Access"}
                    </p>

                    <p
                      className={`mt-1 text-xs ${muted}`}
                    >
                      {isSuperAdmin
                        ? "Manage compliance across all organizations."
                        : "Your workspace is restricted to your assigned organization."}
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-teal-500/10 px-3 py-1.5 text-xs font-semibold text-teal-500">
                  Active Account
                </span>
              </section>

              {/* Retry dashboard */}

              {error && !loading && (
                <button
                  type="button"
                  onClick={() => loadDashboard()}
                  className="rounded-xl border border-teal-500/30 px-4 py-2 text-sm font-semibold text-teal-600 hover:bg-teal-500/10 dark:text-teal-400"
                >
                  Retry loading dashboard
                </button>
              )}

              {/* Compliance overview */}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold">
                    Compliance overview
                  </h2>

                  <p
                    className={`mt-1 text-sm ${muted}`}
                  >
                    {isSuperAdmin
                      ? "Live data across all organizations"
                      : `Live data from ${organizationName}`}
                  </p>
                </div>

                {loading && (
                  <RefreshCw
                    size={20}
                    className="animate-spin text-teal-500"
                  />
                )}
              </div>

              {stats ? (
                <>
                  {/* Statistics cards */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map(
                      ([
                        title,
                        value,
                        Icon,
                        tone,
                      ]) => (
                        <StatCard
                          key={title}
                          title={title}
                          value={value}
                          Icon={Icon}
                          tone={tone}
                          dark={dark}
                        />
                      )
                    )}
                  </div>

                  {/* Dashboard charts */}

                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <ChartCard
                      title="Analysis Risk Distribution"
                      breakdown={
                        stats.riskBreakdown
                      }
                      colors={riskColors}
                      dark={dark}
                    />

                    <ChartCard
                      title="Finding Categories"
                      breakdown={
                        stats.findingBreakdown
                      }
                      colors={findingColors}
                      type="bar"
                      dark={dark}
                    />

                    <ChartCard
                      title="Human Review Decisions"
                      breakdown={
                        stats.reviewBreakdown
                      }
                      colors={reviewColors}
                      dark={dark}
                    />

                    <ChartCard
                      title="Audit Progress"
                      breakdown={
                        stats.auditBreakdown
                      }
                      colors={auditColors}
                      type="bar"
                      dark={dark}
                    />

                    <ChartCard
                      title="CAPA Progress"
                      breakdown={
                        stats.capaBreakdown
                      }
                      colors={capaColors}
                      type="bar"
                      dark={dark}
                    />
                  </div>

                  {/* Recent analyses */}

                  <section
                    className={`rounded-2xl border p-5 shadow-sm ${panel}`}
                  >
                    <div className="mb-5 flex items-center justify-between gap-3">
                      <h3 className="text-base font-bold">
                        Recent AI Analyses
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          navigate("documents")
                        }
                        className="text-sm font-semibold text-teal-500"
                      >
                        View documents
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-sm">
                        <thead
                          className={`border-b ${
                            dark
                              ? "border-slate-700 text-slate-400"
                              : "border-slate-200 text-slate-500"
                          }`}
                        >
                          <tr>
                            <th className="p-3">
                              Analysis ID
                            </th>

                            <th className="p-3">
                              Risk
                            </th>

                            <th className="p-3">
                              Findings
                            </th>

                            <th className="p-3">
                              Review Status
                            </th>

                            <th className="p-3">
                              Date
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {(
                            data?.recentAnalyses ||
                            []
                          ).map((item) => (
                            <tr
                              key={item.id}
                              className={`border-b ${
                                dark
                                  ? "border-slate-800"
                                  : "border-slate-100"
                              }`}
                            >
                              <td className="p-3 font-mono">
                                {item.id?.slice(-8)}
                              </td>

                              <td className="p-3 capitalize">
                                {item.riskLevel}
                              </td>

                              <td className="p-3">
                                {item.findingsCount}
                              </td>

                              <td className="p-3 capitalize">
                                {item.reviewStatus}
                              </td>

                              <td className="p-3">
                                {item.createdAt
                                  ? new Date(
                                      item.createdAt
                                    ).toLocaleDateString(
                                      "en-IN"
                                    )
                                  : "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {!data?.recentAnalyses
                        ?.length && (
                        <p
                          className={`py-8 text-center text-sm ${muted}`}
                        >
                          No analyses found yet.
                        </p>
                      )}
                    </div>
                  </section>
                </>
              ) : !loading && !error ? (
                <p className={muted}>
                  No dashboard data available.
                </p>
              ) : null}

              {/* Compliance disclaimer */}

              <p
                className={`text-xs leading-6 ${muted}`}
              >
                AI findings are advisory and
                require human review. Missing
                evidence does not prove a
                regulatory violation. Review
                approval is not an official
                certification.
              </p>
            </div>
          ) : ActivePage ? (
            <div className="min-w-0">
              <ActivePage
                key={`${user.id}-${page}`}
                user={user}
                onBack={() =>
                  navigate("dashboard")
                }
              />
            </div>
          ) : (
            <section
              className={`rounded-2xl border p-10 text-center ${panel}`}
            >
              <ShieldAlert
                size={40}
                className="mx-auto mb-4 text-rose-500"
              />

              <h2 className="text-xl font-bold">
                Access Denied
              </h2>

              <p
                className={`mt-2 text-sm ${muted}`}
              >
                You do not have permission to
                access this page.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate("dashboard")
                }
                className="mt-5 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Back to Dashboard
              </button>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
