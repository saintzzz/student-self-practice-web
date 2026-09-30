# CR-17 (2026-09-30): Mobile PIN input fix + self-service password/PIN change

## Request
1. Bug: on mobile, the EA login PIN field does not accept input properly.
   Root cause: `type="password"` + `inputMode="numeric"` - PIN is actually
   alphanumeric (demo PIN "demo2026" contains letters), so the numeric
   keypad either can't produce letters or breaks input on some browsers.
2. Feature: students (EA) and teachers/admins (TVC360, SCN) must be able
   to change their own password/PIN instead of relying on admin-issued
   defaults.

## Scope
1. EA AuthScreen: drop `inputMode="numeric"` from PIN input (PIN allows
   letters). Keep password masking. Add `minLength`/`maxLength` hints.
2. EA: "Đổi mã PIN" entry point on GradeSelect for logged-in students +
   admin; dialog calls `supabase.auth.updateUser({ password })` with
   confirm field, >=6 chars validation, success/error feedback.
3. TVC360: change-password form in the account/profile area calling the
   same Supabase updateUser API.
4. SCN: same, in the portal/profile surface.
5. Docs: demo-accounts note that demo accounts should not be changed;
   CR entry in backlog.

## Impact
- EA: AuthScreen.tsx, GradeSelect.tsx, new ChangePinDialog component,
  practiceAuth.ts (changePin helper). No DB/schema change.
- TVC360/SCN: one settings/profile component each, client-side
  supabase.auth.updateUser - no schema change.
- Tests: unit for change-pin validation + AuthScreen input props.

## Acceptance
- PIN field types digits+letters on mobile (Playwright mobile viewport).
- Logged-in student changes PIN, signs out, signs back in with new PIN.
- Teacher changes password on TVC360 + SCN; old password rejected,
  new accepted.
- Gates: tsc + unit + build green per repo.

## Result
- AuthScreen: dropped `inputMode="numeric"` (PIN is alphanumeric -
  demo PIN "demo2026" has letters; numeric keypad broke input).
  Verified on mobile viewport: inputmode attribute gone, field accepts
  "demo2026".
- EA: ChangePinDialog (new PIN + confirm, >=6 chars, VN copy) on
  GradeSelect next to "Dang xuat"; verified end-to-end against real
  Supabase - changed demo_hs PIN demo2026 -> demo2027 -> demo2026.
- TVC360: ChangePasswordButton in teacher sidebar + moderation header
  (inline form, Supabase auth.updateUser).
- SCN: shared ChangePasswordButton - icon in Topbar (staff) + labeled
  button in PortalHeader (parent/student portal), modal dialog.
- Gates: EA 718/718 unit (+3 new dialog tests), vite build green;
  TVC360 + SCN tsc/build green.
- Admin reset-pin edge function unchanged (still available for
  forgotten PINs).
