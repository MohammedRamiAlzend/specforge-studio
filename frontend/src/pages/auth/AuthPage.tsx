import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  useForgotPassword,
  useLogin,
  useRegister,
  useResendOtp,
  useResetPassword,
  useVerifyEmail,
} from "../../entities/user/api";
import { ApiError, errorMessage } from "../../shared/api/client";
import { WaveCanvas } from "../../widgets/background/WaveCanvas";

type AuthMode = "signin" | "register";
type View = "form" | "verify" | "forgot" | "reset";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 transition-colors focus:border-forge-500 focus:outline-none focus:ring-1 focus:ring-forge-500";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      {open ? (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M9.9 5.24A9.12 9.12 0 0 1 12 5c6.5 0 10 7 10 7a15.6 15.6 0 0 1-2.16 2.95" />
          <path d="M6.61 6.61C3.79 8.39 2 12 2 12s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
          <path d="m2 2 20 20" />
        </>
      )}
    </svg>
  );
}

/** Password field with a show/hide toggle button inside the input. */
function PasswordInput({
  name,
  required,
  minLength,
  autoComplete,
  placeholder,
  testId,
}: {
  name: string;
  required?: boolean;
  minLength?: number;
  autoComplete: string;
  placeholder: string;
  testId?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative block">
      <input
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        data-testid={testId}
        className={`${inputClass} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        data-testid={testId ? `${testId}-toggle` : undefined}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 transition-colors hover:text-slate-200"
      >
        <EyeIcon open={visible} />
      </button>
    </span>
  );
}

/** Resend countdown that ticks down once per second until it reaches zero. */
function useCooldown(seconds: number): [number, () => void] {
  const [remaining, setRemaining] = useState(seconds);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = (): void => setRemaining(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    tick.current = setInterval(() => {
      setRemaining((value) => (value <= 1 ? 0 : value - 1));
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [remaining > 0]);
  return [remaining, start];
}

/**
 * Step 2 of registration / unverified sign-in: confirm the 6-digit code that
 * was emailed. Success signs the user in (the backend sets the session
 * cookie) and continues to `?return=`.
 */
function VerifyStep({ email, returnTo }: { email: string; returnTo: string }) {
  const navigate = useNavigate();
  const verify = useVerifyEmail();
  const resend = useResendOtp();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [seconds, startCooldown] = useCooldown(60);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").trim();
    try {
      await verify.mutateAsync({ email, code });
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const onResend = async (): Promise<void> => {
    setError(null);
    setNotice(null);
    try {
      await resend.mutateAsync({ email });
      startCooldown();
      setNotice("A new code is on its way.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "RATE_LIMITED") {
        startCooldown();
        setError("Please wait a minute before requesting another code.");
      } else {
        setError(errorMessage(err));
      }
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Check your inbox
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        We sent a 6-digit code to{" "}
        <span className="text-slate-200">{email}</span>. Enter it below to
        activate your account.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Verification code">
          <input
            name="code"
            type="text"
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="000000"
            data-testid="otp-input"
            className={`${inputClass} text-center text-lg tracking-[0.6em]`}
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {error}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            {notice}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={verify.isPending}
          className="w-full rounded-md bg-forge-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {verify.isPending ? "Verifying…" : "Verify email"}
        </button>

        <button
          type="button"
          onClick={() => void onResend()}
          disabled={seconds > 0 || resend.isPending}
          className="w-full rounded-md border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-forge-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="resend-otp"
        >
          {seconds > 0
            ? `Resend code in ${seconds}s`
            : resend.isPending
              ? "Sending…"
              : "Resend code"}
        </button>
      </form>
    </>
  );
}

/** Forgot-password step: request a reset code (anti-enumeration by design). */
function ForgotStep({ onSent }: { onSent: (email: string) => void }) {
  const forgot = useForgotPassword();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await forgot.mutateAsync({ email: String(form.get("email") ?? "") });
      onSent(String(form.get("email") ?? ""));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Enter your account email and we&apos;ll send you a reset code.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className={inputClass}
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={forgot.isPending}
          className="w-full rounded-md bg-forge-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {forgot.isPending ? "Sending…" : "Send reset code"}
        </button>
      </form>
    </>
  );
}

/** Final recovery step: code + new password. Revokes all other sessions. */
function ResetStep({
  initialEmail,
  onDone,
}: {
  initialEmail: string;
  onDone: () => void;
}) {
  const reset = useResetPassword();
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await reset.mutateAsync({
        email: String(form.get("email") ?? ""),
        code: String(form.get("code") ?? "").trim(),
        new_password: String(form.get("new_password") ?? ""),
      });
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Enter the code we emailed you and pick a new password. All other
        sessions will be signed out.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Field label="Email">
          <input
            name="email"
            type="email"
            required
            defaultValue={initialEmail}
            autoComplete="email"
            placeholder="you@company.com"
            className={inputClass}
          />
        </Field>
        <Field label="Reset code">
          <input
            name="code"
            type="text"
            required
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            className={`${inputClass} text-center text-lg tracking-[0.6em]`}
          />
        </Field>
        <Field label="New password">
          <PasswordInput
            name="new_password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            testId="new-password-input"
          />
        </Field>

        {error ? (
          <p
            role="alert"
            className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={reset.isPending}
          className="w-full rounded-md bg-forge-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {reset.isPending ? "Saving…" : "Save new password"}
        </button>
      </form>
    </>
  );
}

/**
 * Sign-in / register page (Prompt 21 + auth hardening). Registration now ends
 * at an emailed-code verification step; unverified logins are routed there as
 * well, and password recovery lives behind "Forgot password?".
 */
export function AuthPage({ mode }: { mode: AuthMode }) {
  const isRegister = mode === "register";
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("return") ?? "/";
  const [view, setView] = useState<View>("form");
  const [pendingEmail, setPendingEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useLogin();
  const register = useRegister();
  const busy = login.isPending || register.isPending;

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      if (isRegister) {
        const name = String(form.get("name") ?? "");
        await register.mutateAsync({ name, email, password });
        setPendingEmail(email);
        setView("verify");
        return;
      }
      await login.mutateAsync({ email, password });
      navigate(returnTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === "EMAIL_NOT_VERIFIED") {
        setPendingEmail(email);
        setView("verify");
        return;
      }
      setError(errorMessage(err));
    }
  };

  const showForm = view === "form";

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Form side */}
      <div className="flex w-full items-center justify-center px-6 py-16 lg:w-[46%]">
        <div className="sf-page-enter w-full max-w-sm">
          {showForm ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {isRegister ? "Create your account" : "Welcome back"}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {isRegister
                  ? "Start forging specs in minutes."
                  : "Sign in to continue to your workspace."}
              </p>

              <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
                {isRegister ? (
                  <Field label="Full name">
                    <input
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      placeholder="Ada Lovelace"
                      className={inputClass}
                    />
                  </Field>
                ) : null}
                <Field label="Email">
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@company.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="Password">
                  <PasswordInput
                    name="password"
                    required
                    minLength={isRegister ? 8 : undefined}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    placeholder={
                      isRegister ? "At least 8 characters" : "••••••••"
                    }
                    testId="password-input"
                  />
                </Field>

                {error ? (
                  <p
                    role="alert"
                    className="sf-scale-in rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300"
                  >
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-md bg-forge-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-forge-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy
                    ? "Working…"
                    : isRegister
                      ? "Create account"
                      : "Sign in"}
                </button>
              </form>

              {!isRegister ? (
                <p className="mt-3 text-center text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setView("forgot");
                    }}
                    className="text-slate-400 transition-colors hover:text-forge-300"
                  >
                    Forgot password?
                  </button>
                </p>
              ) : null}

              <p className="mt-6 text-center text-sm text-slate-500">
                {isRegister ? (
                  <>
                    Already have an account?{" "}
                    <Link
                      to={`/signin${returnTo !== "/" ? `?return=${encodeURIComponent(returnTo)}` : ""}`}
                      className="font-medium text-forge-400 hover:text-forge-300"
                    >
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    New to SpecForge?{" "}
                    <Link
                      to={`/register${returnTo !== "/" ? `?return=${encodeURIComponent(returnTo)}` : ""}`}
                      className="font-medium text-forge-400 hover:text-forge-300"
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </p>
            </>
          ) : null}

          {view === "verify" ? (
            <VerifyStep email={pendingEmail} returnTo={returnTo} />
          ) : null}
          {view === "forgot" ? (
            <ForgotStep
              onSent={(email) => {
                setPendingEmail(email);
                setView("reset");
              }}
            />
          ) : null}
          {view === "reset" ? (
            <ResetStep
              initialEmail={pendingEmail}
              onDone={() => setView("form")}
            />
          ) : null}
        </div>
      </div>

      {/* Visual side — animated waves on wide screens */}
      <div className="relative hidden overflow-hidden lg:block lg:w-[54%]">
        <WaveCanvas className="absolute inset-0 h-full w-full" />
        <div className="relative flex h-full flex-col justify-end p-12">
          <blockquote className="max-w-md">
            <p className="text-xl font-medium leading-relaxed text-slate-200">
              “We went from a whiteboard photo to a governed spec, diagrams and
              an agent-executable task list in one afternoon.”
            </p>
            <footer className="mt-4 text-sm text-slate-500">
              — Platform team, Acme Commerce
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
