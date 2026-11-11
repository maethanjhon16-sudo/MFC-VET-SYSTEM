# VET SYSTEM — Authentication (desktop)

React + TypeScript implementation of the Figma frame **1 · AUTHENTICATION (Shared)**
(file `FVTtK3O7r0BBhP4NZ7AVmN`, node `250:19114`). Desktop only (1440×900 design).

## Run it

```bash
npm install
npm run icons     # one-time: downloads the Figma icons into src/assets/icons
npm run dev
```

The authentication screens currently implement a front-end prototype only; they do not
create or verify accounts. A production login requires an authentication API and must not
store passwords in the browser. Required fields, email formats, password length and terms
acceptance are validated in the browser.

## Deploy to Render

The repository-root `render.yaml` configures the `vet-system` Vite app as a Render Static
Site and rewrites client-side routes to `index.html`. Connect the repository in Render to
create the service from the Blueprint.

`npm run icons` is needed because the app only imports local SVG files, never the temporary
Figma asset URLs. Those URLs expire 7 days after 2026-11-03; if the script reports a failure,
re-export the icon from the **Icon Library** frame (`250:19009`) and update
`scripts/icons.manifest.json`.

## State management

No `useState` anywhere — everything uses `useReducer`:

| Where | Reducer | Holds |
| --- | --- | --- |
| `features/auth/authReducer.ts` | `authReducer` | current screen, reset-link email, doctor submit time |
| `hooks/useForm.ts` | `formReducer` | every form's field values + boolean toggles |
| `components/ui/PasswordField.tsx` | `visibilityReducer` | eye toggle (Figma `Visible=No/Yes`) |
| `App.tsx` | `appReducer` | placeholder for screens outside Authentication |

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

## Leaving Authentication

`<AuthFlow onExit={...} />` calls `onExit('owner-home' | 'doctor-dashboard' | 'administrator-dashboard')`
for the Log In / Go to Home / Preview buttons. `App.tsx` shows a placeholder until those frames are built.

## Owner side (page 2 · desktop)

Home, Services, Service Details, Shop and Product Details live in `src/features/owner/`
(state in `ownerReducer.ts`, shell/nav in `src/components/owner/`). After login as Pet Owner you land on Owner Home.
Frames from other sections (Schedule, Cart, Messages, Book flow…) open a "coming soon" page.

`npm run icons` skips icons that already exist; use `npm run icons -- --force` to re-download all.
Owner icon URLs were generated 2026-11-10 and expire 2026-11-17.
