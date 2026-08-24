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
 * Signs out and hard-resets all client state. `qc.clear()` wipes every cached
 * query (not just /auth/me) so project-scoped data can never linger after the
 * cookie is gone, and window.location.replace("/") performs a full document
 * navigation that leaves no stale dashboard route in history.
 */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>("/auth/logout", { method: "POST" }),
    onSettled: () => {
      qc.clear();
      qc.setQueryData(userKeys.me, { user: null });
      window.location.replace("/");
    },
  });
}
