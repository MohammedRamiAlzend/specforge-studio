export interface User {
  id: string;
  email: string;
  name: string;
  email_verified: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResult {
  user: User;
  otp_sent: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResendOtpInput {
  email: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  email: string;
  code: string;
  new_password: string;
}
