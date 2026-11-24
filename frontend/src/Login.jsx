import { useEffect, useState } from "react";

import {
  ShieldCheck,
  Mail,
  LockKeyhole,
  UserRound,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Menu,
  X,
  Info,
} from "lucide-react";

import api from "./api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1800&q=85";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");

  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("pharmaiq-theme") === "dark"
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dark = theme === "dark";

  // Dark and light mode

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
  }, [theme, dark]);

  // Switch between login and registration

  const switchMode = (nextMode) => {
    if (loading) return;

    setMode(nextMode);
    setError("");
    setSuccess("");
    setShowPassword(false);
    setMenuOpen(false);

    setForm((prev) => ({
      ...prev,
      password: "",
    }));
  };

  // Handle input changes

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Registration and login

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const email = form.email
        .trim()
        .toLowerCase();

      const name = form.name.trim();

      const password = form.password;

      // Validate email

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailRegex.test(email) ||
        email.length > 254
      ) {
        throw new Error(
          "Please enter a valid email address."
        );
      }

      if (!password) {
        throw new Error(
          "Password is required."
        );
      }

      // REGISTER

      if (mode === "register") {
        if (
          name.length < 2 ||
          name.length > 100
        ) {
          throw new Error(
            "Name must contain 2 to 100 characters."
          );
        }

        if (password.length < 8) {
          throw new Error(
            "Password must have at least 8 characters."
          );
        }

        const passwordBytes =
          new TextEncoder().encode(
            password
          ).length;

        if (passwordBytes > 72) {
          throw new Error(
            "Password is too long. Maximum size is 72 bytes."
          );
        }

        // Public registration creates an inactive
        // account without an assigned organization.

        const response = await api.post(
          "/auth/register",
          {
            name,
            email,
            password,
          }
        );

        // Switch to login after registration

        setMode("login");

        setForm({
          name: "",
          email,
          password: "",
        });

        setShowPassword(false);
        setMenuOpen(false);

        setSuccess(
          response.data?.message ||
            "Account created successfully. Contact your platform administrator for organization assignment and account activation before signing in."
        );

        // Registration does not create a session.
        // Do not call onLogin or logout here.

        return;
      }

      // LOGIN

      const response = await api.post(
        "/auth/login",
        {
          email,
          password,
        }
      );

      const currentUser =
        response.data?.user;

      if (!currentUser) {
        throw new Error(
          "Unable to retrieve your account details."
        );
      }

      // Validate the returned role

      const allowedRoles = [
        "super_admin",
        "organization_admin",
        "pharmacist",
        "auditor",
      ];

      if (
        !allowedRoles.includes(
          currentUser.role
        )
      ) {
        throw new Error(
          "Your account does not have a valid role. Contact your administrator."
        );
      }

      // Check account activation

      if (currentUser.isActive !== true) {
        throw new Error(
          "Your account is inactive. Contact your administrator."
        );
      }

      // Organization is mandatory for tenant users

      if (
        currentUser.role !== "super_admin" &&
        !currentUser.organization
      ) {
        throw new Error(
          "Your account has not been assigned to an organization."
        );
      }

      // App.jsx independently verifies the session
      // through the /auth/me endpoint.

      if (typeof onLogin === "function") {
        await onLogin(currentUser);
      }

      setForm((prev) => ({
        ...prev,
        password: "",
      }));

      setShowPassword(false);
    } catch (err) {
      if (err.response?.status === 429) {
        setError(
          "Too many attempts. Please wait and try again later."
        );
      } else {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Something went wrong. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = `w-full rounded-xl border py-3.5 pl-11 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-teal-500/20 ${
    dark
      ? "border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-teal-500"
      : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-teal-500"
  }`;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        dark
          ? "bg-[#0b1220] text-white"
          : "bg-[#f7fafc] text-slate-900"
      }`}
    >
      {/* Sticky Header */}

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
          dark
            ? "border-white/10 bg-[#0b1220]/90"
            : "border-slate-200 bg-white/90"
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          {/* Logo */}

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-lg shadow-teal-600/20">
              <ShieldCheck size={25} />
            </div>

            <div>
              <h1 className="text-xl font-extrabold tracking-tight">
                Pharma
                <span className="text-teal-500">
                  IQ
                </span>{" "}
                AI
              </h1>

              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.2em] ${
                  dark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                Compliance Intelligence
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}

          <div className="hidden items-center gap-4 sm:flex">
            <button
              type="button"
              onClick={() =>
                setTheme(
                  dark ? "light" : "dark"
                )
              }
              aria-label="Toggle color theme"
              className={`rounded-xl border p-2.5 transition ${
                dark
                  ? "border-slate-700 hover:bg-slate-800"
                  : "border-slate-200 hover:bg-slate-100"
              }`}
            >
              {dark ? (
                <Sun size={19} />
              ) : (
                <Moon size={19} />
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                switchMode("login")
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                mode === "login"
                  ? "text-teal-500"
                  : dark
                  ? "text-slate-300 hover:text-white"
                  : "text-slate-600 hover:text-teal-600"
              }`}
            >
              Log in
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                switchMode("register")
              }
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition hover:bg-teal-700"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Navigation */}

          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() =>
                setTheme(
                  dark ? "light" : "dark"
                )
              }
              aria-label="Toggle color theme"
              className="rounded-lg p-2"
            >
              {dark ? (
                <Sun size={21} />
              ) : (
                <Moon size={21} />
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                setMenuOpen(!menuOpen)
              }
              aria-label="Toggle navigation"
              className="rounded-lg p-2"
            >
              {menuOpen ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}

        {menuOpen && (
          <div
            className={`flex flex-col gap-2 border-t px-5 py-4 sm:hidden ${
              dark
                ? "border-slate-800 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                switchMode("register")
              }
              className="rounded-lg bg-teal-600 px-4 py-3 text-white"
            >
              Create account
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                switchMode("login")
              }
              className="rounded-lg px-4 py-3"
            >
              Log in
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}

      <main className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {/* Left Hero Section */}

        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-500/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            <FlaskConical size={15} />

            AI-powered compliance platform
          </div>

          <div>
            <h2 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Smarter compliance.

              <span className="mt-2 block text-teal-500">
                Safer decisions.
              </span>
            </h2>

            <p
              className={`mt-6 max-w-lg text-base leading-8 sm:text-lg ${
                dark
                  ? "text-slate-400"
                  : "text-slate-600"
              }`}
            >
              Organize pharmacy documents,
              identify potential compliance gaps
              with AI, manage audits, and track
              corrective actions in one
              intelligent workspace.
            </p>
          </div>

          {/* Features */}

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "AI-assisted document analysis",
              "Pharmacy & organization management",
              "Audit and CAPA tracking",
              "Human-reviewed compliance findings",
              "Role-based access control",
              "Organization-level data isolation",
            ].map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3"
              >
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0 text-teal-500"
                />

                <span
                  className={`text-sm font-medium ${
                    dark
                      ? "text-slate-300"
                      : "text-slate-700"
                  }`}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>

          {/* Hero Image */}

          <div className="relative overflow-hidden rounded-3xl shadow-2xl shadow-teal-900/10">
            <img
              src={HERO_IMAGE}
              alt="Modern pharmaceutical research laboratory"
              className="h-56 w-full object-cover sm:h-72"
              loading="lazy"
            />

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />

            <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 text-white">
              <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-md">
                <ShieldCheck size={24} />
              </div>

              <div>
                <p className="text-sm font-bold">
                  Built for pharmaceutical workflows
                </p>

                <p className="text-xs text-slate-200">
                  Structured. Traceable. AI-assisted.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Authentication Section */}

        <section className="mx-auto w-full max-w-md">
          <div
            className={`rounded-3xl border p-6 shadow-2xl sm:p-9 ${
              dark
                ? "border-slate-800 bg-[#131e30] shadow-black/20"
                : "border-slate-100 bg-white shadow-slate-200/70"
            }`}
          >
            {/* Form Heading */}

            <div className="mb-7">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-500">
                <ShieldCheck size={26} />
              </div>

              <h3 className="text-2xl font-extrabold tracking-tight">
                {mode === "register"
                  ? "Create your account"
                  : "Welcome back"}
              </h3>

              <p
                className={`mt-2 text-sm ${
                  dark
                    ? "text-slate-400"
                    : "text-slate-500"
                }`}
              >
                {mode === "register"
                  ? "Request access to PharmaIQ AI."
                  : "Sign in to access your compliance workspace."}
              </p>
            </div>

            {/* Register and Login Tabs */}

            <div
              className={`mb-7 grid grid-cols-2 rounded-xl p-1 ${
                dark
                  ? "bg-slate-900"
                  : "bg-slate-100"
              }`}
            >
              {["register", "login"].map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    disabled={loading}
                    onClick={() =>
                      switchMode(item)
                    }
                    className={`rounded-lg py-2.5 text-sm font-bold transition ${
                      mode === item
                        ? dark
                          ? "bg-slate-700 text-white shadow"
                          : "bg-white text-teal-700 shadow-sm"
                        : dark
                        ? "text-slate-400"
                        : "text-slate-500"
                    }`}
                  >
                    {item === "register"
                      ? "Register"
                      : "Log in"}
                  </button>
                )
              )}
            </div>

            {/* Account Activation Notice */}

            {mode === "register" && (
              <div
                className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
                  dark
                    ? "border-sky-900 bg-sky-950/30 text-sky-300"
                    : "border-sky-200 bg-sky-50 text-sky-800"
                }`}
              >
                <Info
                  size={19}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="text-sm font-bold">
                    Account activation required
                  </p>

                  <p className="mt-1 text-xs leading-5">
                    Your account must be assigned
                    to an organization and activated
                    by the platform administrator
                    before you can sign in.
                  </p>
                </div>
              </div>
            )}

            {/* Authentication Form */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Full Name - Register Only */}

              {mode === "register" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="mb-2 block text-sm font-semibold"
                  >
                    Full name
                  </label>

                  <div className="relative">
                    <UserRound
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="auth-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      minLength={2}
                      maxLength={100}
                      required
                      disabled={loading}
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Email */}

              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-2 block text-sm font-semibold"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={loading}
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className={inputStyle}
                  />
                </div>
              </div>

              {/* Password */}

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-2 block text-sm font-semibold"
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="auth-password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete={
                      mode === "register"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={
                      mode === "register"
                        ? 8
                        : undefined
                    }
                    required
                    disabled={loading}
                    value={form.password}
                    onChange={handleChange}
                    placeholder={
                      mode === "register"
                        ? "Minimum 8 characters"
                        : "Enter your password"
                    }
                    className={`${inputStyle} pr-12`}
                  />

                  {/* Show / Hide Password */}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-teal-500"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* Success Message */}

              {success && (
                <div
                  role="status"
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                    dark
                      ? "border-teal-800 bg-teal-950/40 text-teal-300"
                      : "border-teal-200 bg-teal-50 text-teal-700"
                  }`}
                >
                  <CheckCircle2
                    size={20}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="font-bold">
                      Registration successful
                    </p>

                    <p className="mt-1 leading-6">
                      {success}
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}

              {error && (
                <div
                  role="alert"
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    dark
                      ? "border-red-900 bg-red-950/40 text-red-300"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {error}
                </div>
              )}

              {/* Submit Button */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-600/20 transition hover:-translate-y-0.5 hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : mode === "register"
                  ? "Create Account"
                  : "Sign In"}

                {!loading && (
                  <ArrowRight size={18} />
                )}
              </button>
            </form>

            {/* Switch Authentication Mode */}

            <p
              className={`mt-7 text-center text-sm ${
                dark
                  ? "text-slate-400"
                  : "text-slate-500"
              }`}
            >
              {mode === "register"
                ? "Already have an account?"
                : "New to PharmaIQ AI?"}{" "}

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  switchMode(
                    mode === "register"
                      ? "login"
                      : "register"
                  )
                }
                className="font-bold text-teal-500 hover:underline"
              >
                {mode === "register"
                  ? "Log in"
                  : "Create account"}
              </button>
            </p>

            {/* Access Control Information */}

            <div
              className={`mt-6 flex items-center justify-center gap-2 border-t pt-5 text-xs ${
                dark
                  ? "border-slate-800 text-slate-400"
                  : "border-slate-100 text-slate-500"
              }`}
            >
              <ShieldCheck
                size={16}
                className="text-teal-500"
              />

              Role-based workspace access
            </div>
          </div>

          {/* Footer */}

          <p
            className={`mt-6 text-center text-xs leading-6 ${
              dark
                ? "text-slate-500"
                : "text-slate-400"
            }`}
          >
            AI findings are advisory and require
            human verification.

            <br />

            © {new Date().getFullYear()} PharmaIQ AI
          </p>
        </section>
      </main>
    </div>
  );
}