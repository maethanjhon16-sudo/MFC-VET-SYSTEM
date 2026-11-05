# VET SYSTEM — Desktop (Figma Page 2)

React + TypeScript implementation of **Page 2 (desktop, 1440px)** of the Figma file `FVTtK3O7r0BBhP4NZ7AVmN`.
Page 1 (mobile) is intentionally ignored.

| Figma section | Status |
| --- | --- |
| 1 · Authentication (Shared) | done — `features/auth` |
| 2 · Pet Owner — Home, Services & Shop | **Owner Home done** — `features/owner`; the other 9 frames are placeholders |
| 3–5 · Pet Owner (schedule, pets, records, messaging, menu) | not built (screen ids already exist in `features/owner/types.ts`) |
| 6–8, 10 · Vet Doctor | not built (Doctor Dashboard is still a placeholder in `App.tsx`) |
| 9 · Administrator & account settings | not built (Administrator Dashboard is still a placeholder) |
| 11 · Additional screens ported from mobile | not built |

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

## Pet Owner (`features/owner`)

`OwnerFlow` mirrors `AuthFlow`: an `ownerReducer` holds the current `OwnerScreen`, `OwnerLayout` provides the shared
top nav + footer, and every screen receives `go(screen)`. Screens that are not built yet render a placeholder inside
the layout, so the nav, cart/message/bell buttons and all links on Owner Home can already be clicked through.
To add a screen: build `screens/<Name>.tsx`, then add a `case` in `OwnerFlow.tsx`.

`npm run icons` now skips files that already exist; use `npm run icons -- --force` to re-download everything.

## Leaving Authentication

`<AuthFlow onExit={...} />` calls `onExit('owner-home' | 'doctor-dashboard' | 'administrator-dashboard')`
for the Log In / Go to Home / Preview buttons. `App.tsx` shows a placeholder until those frames are built.
