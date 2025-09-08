import React, { useEffect, useState } from "react";

type Props = { children: React.ReactNode };

export default function PasswordGate({ children }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // If already unlocked this session, skip the prompt
  useEffect(() => {
    if (sessionStorage.getItem("minrisk_unlocked") === "1") {
      setUnlocked(true);
    }
  }, []);

  const expected = (import.meta.env.VITE_APP_PASSWORD ?? "") as string;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expected) {
      setError("Password not configured on server.");
      return;
    }
    if (password === expected) {
      sessionStorage.setItem("minrisk_unlocked", "1");
      setUnlocked(true);
    } else {
      setError("Incorrect password. Try again.");
    }
  };

  if (unlocked) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">MinRisk — Access</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter the access password to continue.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          {error && (
            <div className="text-sm text-red-600">{error}</div>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
          >
            Unlock
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Tip: You can change the password via <code>.env.local</code> and Vercel project settings
          (key: <code>VITE_APP_PASSWORD</code>).
        </p>
      </div>
    </div>
  );
}
