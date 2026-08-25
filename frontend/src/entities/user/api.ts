import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/client";
import type {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  RegisterResult,
  ResendOtpInput,
  ResetPasswordInput,
  User,
  VerifyEmailInput,
} from "./types";

export const userKeys = {
  me: ["auth", "me"] as const,
};

/** Current session user (null when signed out). 401s are swallowed. */
export function useMe() {
  return useQuery({
    queryKey: userKeys.me,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        return await api<{ user: User }>("/auth/me");
      } catch {
        return { user: null };
      }
    },
    select: (data) => data.user,
  });
}

/**
 * Step 1 of registration: creates the account and emails a 6-digit
 * verification code. Does NOT sign the user in — the session cookie is set
 * by verify-email once the code is confirmed.
 */
export function useRegister() {
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api<RegisterResult>("/auth/register", { method: "POST", body: JSON.stringify(input) }),
  });
}

export function useVerifyEmail() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: VerifyEmailInput) =>
      api<{ user: User }>("/auth/verify-email", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      qc.setQueryData(userKeys.me, data);
    },
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (input: ResendOtpInput) =>
      api<{ ok: boolean }>("/auth/resend-otp", { method: "POST", body: JSON.stringify(input) }),
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: (data) => {
      qc.setQueryData(userKeys.me, data);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (input: ForgotPasswordInput) =>
      api<{ ok: boolean }>("/auth/forgot-password", { method: "POST", body: JSON.stringify(input) }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) =>
      api<{ ok: boolean }>("/auth/reset-password", { method: "POST", body: JSON.stringify(input) }),
  });
}

/**
 * Signs out deterministically: best-effort server call (errors ignored — the
 * session cookie dies with it or expires on its own), then ALWAYS a
 * full-document navigation home. A watchdog timer guarantees navigation even
 * if the request hangs, so the user can never stay trapped on a dashboard.
 *
 * Deliberately NOT a React Query mutation: no cache lifecycle can interfere,
 * and the full reload rebuilds a pristine QueryClient (no stale project data).
 */
export function performSignOut(): void {
  let navigated = false;
  const goHome = (): void => {
    if (navigated) return;
    navigated = true;
    window.location.replace("/");
  };
  // Watchdog: force navigation even if fetch never settles.
  setTimeout(goHome, 2500);
  api<{ ok: boolean }>("/auth/logout", { method: "POST" })
    .catch(() => undefined)
    .finally(goHome);
}
