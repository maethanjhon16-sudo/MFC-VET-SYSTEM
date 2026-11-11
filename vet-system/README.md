# VET SYSTEM — Authentication (desktop)

React + TypeScript implementation of the Figma frame **1 · AUTHENTICATION (Shared)**
(file `FVTtK3O7r0BBhP4NZ7AVmN`, node `250:19114`). Desktop only (1440×900 design).

## Run it

```bash
npm ci
npm run icons     # one-time: downloads the Figma icons into src/assets/icons
npm run dev
```

Authentication uses the local Node API and Neon database. Copy `.env.example` to `.env`
and set `DATABASE_URL` before using registration or sign-in. Never expose database or
bootstrap credentials through `VITE_` variables.

## Deploy to Render

The repository-root `render.yaml` configures a free Render Node web service that serves both
the Vite frontend and the API from the same origin. If you already deployed the earlier
static-site Blueprint, create the new `mfc-vet-system-fullstack` service first, verify it,
then remove the old static site if you no longer need it.
Use the URL shown for that **Web Service** after it deploys. Opening `/api/health` on that
URL must return JSON; if it shows the website HTML, you are still using the old Static Site
URL or the Web Service has not been deployed from this Blueprint.
The Render build explicitly installs development dependencies because Vite and TypeScript
are required to compile the frontend, even when `NODE_ENV=production`.

Create a free Neon Postgres project and copy its pooled connection string into
`DATABASE_URL` when Render prompts for the Blueprint secret. Keep this value on the Render
backend only; never put it in a `VITE_` variable or commit it to GitHub. The API initializes
its auth schema on first database use. Render health checks verify the web process;
`/api/health` reports whether a database URL is configured, not whether Neon is reachable.
The deployment uses Node 22.12 through 24 (required by the Vite build tool).

The local `.env.example` contains only a placeholder. For local full-stack development,
copy it to `.env`, replace the placeholder with your Neon pooled connection string, then run
`npm run dev`. The Vite dev server proxies `/api` to the local Node server. Do not commit
`.env`.

Create the first administrator locally with `DATABASE_URL` and `ADMIN_BOOTSTRAP_PASSWORD`
set in the process environment, then run:

```bash
npm run db:create-admin -- admin@example.com
```

Use a unique password of at least 12 characters. The script prints no password and refuses
to overwrite an existing account. Never set the bootstrap password in frontend variables.
If the administrator already exists but its password needs changing, set
`ADMIN_BOOTSTRAP_PASSWORD` to a new unique password and run
`npm run db:reset-admin-password -- admin@example.com` instead. This updates only an existing
administrator with that email and signs out its existing sessions. Changing the
`ADMIN_BOOTSTRAP_PASSWORD` Render environment variable alone does not change a password
already stored in Neon.

`npm run icons` is needed because the app only imports local SVG files, never the temporary
Figma asset URLs. Those URLs expire 7 days after 2026-11-03; if the script reports a failure,
re-export the icon from the **Icon Library** frame (`250:19009`) and update
`scripts/icons.manifest.json`.

## State management

No `useState` anywhere — everything uses `useReducer`:

| Where | Reducer | Holds |
| --- | --- | --- |
| `features/auth/authReducer.ts` | `authReducer` | current screen, reset-link email, doctor submit time |
| `features/doctor/DoctorFlow.tsx` | `doctorReducer` | demo appointments, requests, patient search and selected records |
| `hooks/useForm.ts` | `formReducer` | every form's field values + boolean toggles |
| `components/ui/PasswordField.tsx` | `visibilityReducer` | eye toggle (Figma `Visible=No/Yes`) |
| `App.tsx` | `appReducer` | active role workspace and sign-out |

## Screens → files

| Figma frame | Component |
| --- | --- |
| Role Selection | `screens/RoleSelection.tsx` |
| Owner Login / Doctor Login / Admin Login | `screens/LoginScreen.tsx` (`variant`) |
| Owner Sign-up | `screens/OwnerSignUp.tsx` (includes Province / City / Barangay) |
| Doctor Sign-up | `screens/DoctorSignUp.tsx` |
| Forgot Password | `screens/ForgotPassword.tsx` |
| Registration Confirmation / Reset Link Sent / Doctor Pending Approval | `screens/*.tsx` on `StatusScreen` |

The hero panel is identical on all 10 frames, so it is one component (`HeroPanel.tsx`).

## Authentication and account data

Email/password registration and login are handled by the Node API and Neon, with scrypt
password hashes and server-side sessions in HttpOnly, SameSite cookies. Doctor sign-ups
remain pending until an administrator approves them. Admin accounts cannot self-register.
Password reset is intentionally unavailable until an email delivery provider is configured.
Do not use the prototype to collect real clinical or personal data before adding email
verification, password recovery, privacy/consent policies, backups, and operational
monitoring.

## Pet owner and doctor workspaces (desktop)

Home, Services, Service Details, Shop and Product Details live in `src/features/owner/`
(state in `ownerReducer.ts`, shell/nav in `src/components/owner/`). After login as Pet Owner you land on Owner Home.
Frames from other sections (Schedule, Cart, Messages, Book flow…) open a "coming soon" page.

The doctor workspace (`src/features/doctor/DoctorFlow.tsx`) includes an interactive dashboard,
appointment list and requests, week calendar, searchable patient directory, and patient/appointment
details. Its sample schedule and patient records are still in-memory demo data; they are not
stored in Neon and changes are lost on refresh.

`npm run icons` skips icons that already exist; use `npm run icons -- --force` to re-download all.
Owner icon URLs were generated 2026-11-10 and expire 2026-11-17.
