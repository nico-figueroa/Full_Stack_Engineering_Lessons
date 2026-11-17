import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { githubOAuthStartUrl } from "../api/auth.js";
import Alert from "../components/Alert.jsx";
import { backend } from "../api/client.js";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const oauthError = searchParams.get("oauthError");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGithubLogin() {
    // Real OAuth requires a full-page redirect so GitHub can show its own
    // consent screen - this cannot be done with fetch/XHR.
    setError(null);
    setIsSubmitting(true);
    try {
      await backend.ensureReady();
      window.location.href = githubOAuthStartUrl();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16 sm:px-0">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Log in to manage your cart and orders.
        </p>
      </div>

      {oauthError && (
        <Alert variant="error">GitHub sign-in failed: {oauthError}</Alert>
      )}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          <GitHubIcon /> Continue with GitHub
        </button>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400"
        >
          <GoogleIcon /> Continue with Google
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">
            Coming soon
          </span>
        </button>

        <button
          type="button"
          disabled
          title="Coming soon"
          className="mt-3 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400"
        >
          <MicrosoftIcon /> Continue with Microsoft
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">
            Coming soon
          </span>
        </button>

        <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          or use email
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500">
        Don&rsquo;t have an account?{" "}
        <Link to="/register" className="font-medium text-indigo-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
      <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.53-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.8 1.19 1.83 1.19 3.09 0 4.41-2.7 5.38-5.26 5.67.41.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.07-1.47-.22-2.12H12v3.85h6.5c-.13 1.03-.84 2.6-2.42 3.65l-.02.15 3.52 2.72.24.02c2.24-2.07 3.53-5.12 3.53-8.27"
      />
      <path
        fill="#34A853"
        d="M12 24c3.18 0 5.85-1.05 7.8-2.86l-3.72-2.89c-1 .7-2.35 1.19-4.08 1.19-3.12 0-5.77-2.06-6.72-4.92l-.14.01-3.68 2.85-.05.14C3.3 21.3 7.33 24 12 24"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.52a7.18 7.18 0 0 1-.39-2.52c0-.87.15-1.72.38-2.52l-.01-.17-3.73-2.9-.12.06A11.98 11.98 0 0 0 0 12c0 1.94.47 3.77 1.3 5.4l3.98-2.88"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c2.21 0 3.7.96 4.55 1.76l3.32-3.24C17.84 1.3 15.18 0 12 0 7.33 0 3.3 2.7 1.3 6.6l3.97 3.08c.96-2.86 3.61-4.93 6.73-4.93"
      />
    </svg>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}
