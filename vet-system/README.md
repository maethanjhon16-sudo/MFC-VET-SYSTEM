# VET SYSTEM — Authentication (desktop)

React + TypeScript implementation of the Figma frame **1 · AUTHENTICATION (Shared)**
(file `FVTtK3O7r0BBhP4NZ7AVmN`, node `250:19114`). Desktop only (1440×900 design).

## Run it

```bash
npm install
npm run icons     # one-time: downloads the Figma icons into src/assets/icons
npm run dev
```

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
