import React, { useState } from "react";
import { X, Lock, Mail, User, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: ""
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(formData.email || formData.username, formData.password);
      } else {
        await register(formData);
      }
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => setIsAuthModalOpen(false)}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 z-10 border border-slate-100">
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 mb-4">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-extrabold text-slate-900 mb-1">
          {mode === "login" ? "Welcome Back to Aura" : "Create an Account"}
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          {mode === "login"
            ? "Sign in to access your order tracking and saved preferences."
            : "Join Aura for express checkout and exclusive seasonal drops."}
        </p>

        {/* Tab Toggle */}
        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6 text-xs font-semibold">
          <button
            onClick={() => { setMode("login"); setError(null); }}
            className={`py-2 rounded-lg transition ${mode === "login" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("register"); setError(null); }}
            className={`py-2 rounded-lg transition ${mode === "register" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500"
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-teal-500"
                    placeholder="Morgan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-teal-500"
                    placeholder="alex_morgan"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-teal-500"
                placeholder="name@example.com"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-teal-500"
                placeholder="••••••••"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition text-xs shadow-md mt-2 disabled:opacity-50"
          >
            {loading ? "Verifying..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 mt-5">
          Passwords are salted & hashed using bcrypt. Never stored in plaintext.
        </p>
      </div>
    </div>
  );
}
