# Auth Verification — Email/SMS OTP + Password

Covers email verification code + password and SMS verification code + password auth flows. These extend the basic username+password auth with real email/phone verification.

## Table of Contents

- [When to use this guide](#when-to-use-this-guide)
- [Clarification rules](#clarification-rules)
- [Email verification + password](#email-verification--password)
- [SMS verification + password](#sms-verification--password)
- [Common patterns](#common-patterns)
- [Enable register-login service](#enable-register-login-service)
- [API usage matrix](#api-usage-matrix)
- [Common errors](#common-errors)

## When to use this guide

Read this guide when the user asks for any of these:
- Email verification code + password registration/login
- SMS verification code + password registration/login
- Registration confirmation (email or SMS)
- Login second-factor verification
- Forgot password / password recovery with verification
- Reset password flow

Do NOT use this guide for:
- Username + password (basic auth, use `cloud-patterns.md`)
- Email + password without verification code (basic auth)
- Phone number as username without SMS OTP (basic auth)
- WeChat mini program login
- Pure verification-code passwordless login (not supported)

## Clarification rules

When the user's auth intent is ambiguous, ask which verification type they need:

1. Email verification code + password
2. SMS verification code + password
3. Both email and SMS

If the user asks for "verification code only / passwordless login", explain that pure passwordless verification is not currently supported, and ask if they want to switch to email/SMS verification + password.

---

## Email verification + password

### Registration state machine

Registration MUST be a two-phase state machine, NOT a standalone "get verification code" flow:

1. `registrationStep='form'`: Collect real email and password. On submit, call `signUp({ email, password })`.
2. `registrationStep='verify'`: After `signUp` succeeds, show verification code input. Call `verifyOtp({ email, token, type: 'signup' })`.
3. After `verifyOtp` succeeds, call `getUser()` to confirm session sync, then write `profiles` or business tables.

```typescript
const [registrationStep, setRegistrationStep] = useState<'form' | 'verify'>('form');

async function handleRegister() {
  const profileUsername = username.trim();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: profileUsername } },
  });
  if (error) throw error;
  setRegistrationStep('verify');
}

async function handleVerifySignup(token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
  if (error) throw error;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Session not synced yet');

  await supabase
    .from('profiles')
    .upsert({ id: user.id, username: username.trim() })
    .select('id')
    .single();
}
```

### Email login

Use `signInWithPassword({ email, password })` for login. If the app needs login second-factor verification, add a verification code step AFTER successful password login.

### Forgot password (email)

```typescript
// Send recovery email
await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/#/reset-password` });

// On the reset page, in the recovery session:
await supabase.auth.updateUser({ password: newPassword });
```

Forgot password is NOT verification-code login. Do not use `signInWithOtp` for password recovery.

### Critical rules — email

- Registration MUST start with `signUp({ email, password })`, NOT `signInWithOtp` or `/auth/v1/otp`.
- For numeric verification codes, use Supabase Email Template `{{ .Token }}` with `verifyOtp({ type: 'signup' })`.
- Do NOT generate standalone `handleSendCode` calling `signInWithOtp` in registration flow.
- Do NOT use Magic Link or `signInWithOtp` as "email verification + password" implementation.
- Must use real email, NOT `{username}@meoo.local` virtual email.
- Must provide forgot-password entry with recovery flow (unless user explicitly opts out).

---

## SMS verification + password

### Registration state machine

Same two-phase pattern as email, using phone instead:

1. `registrationStep='form'`: Collect real phone number and password. Call `signUp({ phone, password })`.
2. `registrationStep='verify'`: Show SMS code input. Call `verifyOtp({ phone, token, type: 'sms' })`.
3. After `verifyOtp` succeeds, call `getUser()`, then write `profiles`.

```typescript
const [registrationStep, setRegistrationStep] = useState<'form' | 'verify'>('form');

async function handleRegister() {
  const profileUsername = username.trim();
  const { error } = await supabase.auth.signUp({
    phone,
    password,
    options: { data: { username: profileUsername } },
  });
  if (error) throw error;
  setRegistrationStep('verify');
}

async function handleVerifySignup(token: string) {
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: 'sms',
  });
  if (error) throw error;

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('Session not synced yet');

  await supabase
    .from('profiles')
    .upsert({ id: user.id, username: username.trim() })
    .select('id')
    .single();
}
```

### SMS login

Use `signInWithPassword({ phone, password })`. Add SMS verification step after password success if second-factor is needed.

### Forgot password (SMS)

Use `signInWithOtp({ phone, options: { shouldCreateUser: false } })` ONLY for identity confirmation of existing users, then `updateUser({ password })` in the valid session. This entry must NOT be shown as a regular passwordless login.

### Critical rules — SMS

- Registration MUST start with `signUp({ phone, password })`, NOT `signInWithOtp`.
- Phone numbers must be China mainland `+86` only, normalized to E.164 format `+86XXXXXXXXXXX`.
- SMS rate limit: 5 per hour, 10 per day per phone number.
- Verification code expires in 5 minutes; locks after 5 wrong attempts for 15 minutes.
- Do NOT use `shouldCreateUser: false` as a registration verification scheme — it only works for existing users.
- Must provide forgot-password entry with recovery flow.

---

## Common patterns

### User data model

Reuse the shared `profiles` table, RLS policies, and `user_roles` / `has_role` from `cloud-patterns.md`. Do NOT create a separate user table system for verification flows.

- Register with real email/phone, NOT `{username}@meoo.local`.
- Still write `raw_user_meta_data.username` on registration (following project conventions) to ensure `profiles.username` trigger works.
- Only add `profiles.email` or `profiles.phone` column when the product explicitly needs to query real email/phone in profiles.

### UI requirements

- Registration page must have explicit step state (`registrationStep`), not just `code ? verify : register`.
- Login page enters verification step AFTER password success (for second-factor).
- Password login area must have a "Forgot password" entry leading to a real recovery flow.
- Verification code validity: 5 minutes. Show "Code expired, please resend" on timeout.
- Provide resend countdown and send-failure message.
- Do NOT generate passwordless login tab or "forgot password = verification code login" entry.

### Execution order

The correct order when implementing verification auth:

```
database migrate → write application code → deploy edge functions (if any) → enable-register-login
```

The `enable-register-login` command triggers a cloud service restart (to enable SMS/email sending). During restart, database migrations and function deployments will fail. So it MUST be the last step.

After successful `enable-register-login`, remind the user:

> The auth service is restarting. Please wait for the cloud service panel to show restart complete before testing verification code sending.

---

## Enable register-login service

```bash
# Email verification + password only
meoo cloud enable-register-login --providers email --confirmed-provider-set

# SMS verification + password only
meoo cloud enable-register-login --providers sms --confirmed-provider-set

# Both email + SMS verification + password
meoo cloud enable-register-login --providers email,sms
```

Rules:
- When enabling both email and SMS, use a single command with `--providers email,sms`. Do NOT run two separate enable commands.
- Single-provider commands require `--confirmed-provider-set` flag.
- This command does NOT handle basic `password` provider — that's covered by basic auth setup.
- If the command fails, stop and explain the failure. Do NOT continue generating verification code.
- Must be executed AFTER all database migrations, function deployments, and code changes are complete.

---

## API usage matrix

### Email

| Scenario | Must use | Must NOT use |
|----------|----------|--------------|
| Email + password signup | `signUp({ email, password })` | `signInWithOtp`, `/auth/v1/otp` |
| Signup email confirmation | Supabase signup confirmation; numeric code via email template `{{ .Token }}` + `verifyOtp({ email, token, type: 'signup' })` | `signInWithOtp`, custom Edge Function |
| Email + password login | `signInWithPassword({ email, password })` | `signInWithOtp` |
| Forgot password | `resetPasswordForEmail(email, { redirectTo })` + `updateUser({ password })` in recovery session | `signInWithOtp` |

### SMS

| Scenario | Must use | Must NOT use |
|----------|----------|--------------|
| Phone + password signup | `signUp({ phone, password })` | `signInWithOtp`, `/auth/v1/otp` |
| Signup SMS confirmation | `verifyOtp({ phone, token, type: 'sms' })` | Custom Edge Function |
| Phone + password login | `signInWithPassword({ phone, password })` | `signInWithOtp` |
| Forgot password (identity confirm) | `signInWithOtp({ phone, options: { shouldCreateUser: false } })` then `updateUser({ password })` | Creating new users, showing as regular login |

---

## Common errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| Registration "get code" returns 422 from `/auth/v1/otp` | Using `signInWithOtp` as registration code API | Remove standalone code-send flow, start with `signUp({ email/phone, password })` |
| `verifyOtp` then write `profiles` returns 403 | Missing INSERT policy, or session not synced (`auth.uid()` is NULL) | Add RLS INSERT policy, call `getUser()` before writing |
| `verifyOtp` returns "invalid token" | Wrong `type` or stale code | Use `type: 'signup'` for registration confirmation, ensure token is from current `signUp` |
| SMS no longer sent after repeated tests | Per-phone rate limit: 5/hour or 10/day | Switch test phone number or wait for rate limit window |
| 502 immediately after `enable-register-login` | Cloud service restarting | Wait for restart to complete (check cloud panel) |

### Pre-generation checklist

Before generating auth code, verify:

- [ ] Basic password flow is complete
- [ ] Registration starts with `signUp({ email/phone, password })`, not `signInWithOtp`
- [ ] No standalone `signInWithOtp` / `/auth/v1/otp` code-send handler in registration
- [ ] `getUser()` called after `verifyOtp` before writing profiles
- [ ] Verification code only used for registration confirmation or login second-factor
- [ ] No path that creates a session from verification code alone
- [ ] No virtual email mixed with real verification email
- [ ] Forgot password entry and recovery flow are complete
- [ ] `enable-register-login` is the last step
