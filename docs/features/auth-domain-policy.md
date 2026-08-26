# Authentication Domain Policy

SpecForge Studio restricts new account registration to trusted organization email domains. The backend reads the comma-separated `TRUSTED_SIGNUP_DOMAINS` setting, normalizes entries, and accepts an exact domain or one of its subdomains. The production default is `specforge.com`; test configuration explicitly allows the fixture domains.

An email address outside the allowlist is rejected before a user row or verification OTP is created. The API returns `SIGNUP_DOMAIN_NOT_ALLOWED` with a recoverable message directing the user to use an approved work email or contact an administrator. Existing accounts are not disabled by this policy and can continue to sign in normally.

The administrator account is created only through the explicit seed command. From the repository root, run:

```powershell
bun run --cwd backend seed-admin
```

The command is idempotent, marks the account as email-verified and global-admin, and stores only a Bun password hash. It accepts `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and `SEED_ADMIN_NAME` environment overrides. The requested local seed values are `admin@specforge.com` and `password123`; replace the password before using the command for a production account and prefer a secret-injected environment variable.

Global-admin access at application boot remains separately controlled by the exact-email `ADMIN_EMAILS` setting. The seed command is intentionally explicit so merely starting a production server cannot silently create a known-password administrator.
