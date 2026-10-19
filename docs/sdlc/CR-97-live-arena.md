# CR-97 - Live Arena race + animated question art

## Driver

Product-owner directive: Arena must support "doi khang giua nhieu tai
khoan cung mot luc" - real-time races between multiple logged-in
accounts, not only async same-seed challenges. Companion upgrade:
question imagery gains gentle animation so art feels alive for kids.

## Scope

1. **Live Arena (real-time N-player race).**
   - `practice.arena_rooms` + `practice.arena_room_players` tables;
     all client access through SECURITY DEFINER RPCs (same auth
     pattern as `arena_*` 0006).
   - Host creates a room -> 6-char join code -> lobby shows roster via
     Supabase Realtime presence; host starts -> broadcast `start`.
   - Everyone races the SAME seeded 10-question set; each answer
     broadcasts `progress` (q index + running score); finish broadcasts
     `finish` (score + time_ms) and persists via RPC.
   - Standings overlay renders live during the race; podium at end.
     Win rule inherits CR-34: score first, then fastest time.
   - Disconnect handling: presence drop removes the player from the
     roster; race continues. A host leaving a waiting room closes it
     (players cannot start without a host); mid-race everyone still
     settles via `arena_live_finish`.
   - Room size: 2-6 players. Guests keep the existing bot duel.
   - Async challenges (`arena_challenges`) stay - live race is an
     additional mode, not a replacement.

2. **Animated question art.**
   - Gentle CSS motion (float/breathe, GPU-transform only) on concept
     art in question surfaces + option images; `prefers-reduced-motion`
     respected per DESIGN_SYSTEM.

## Impact assessment

- **Data model:** +2 tables, +6 RPCs (new migration `0040_arena_live.sql`).
  No changes to `arena_challenges`, question bank, or engagement writes
  (arena runs still do not feed engagement - CR-34 invariant).
- **Client:** new `src/lib/arenaLive.ts`; `ArenaCard` gains a live-duel
  entry; new `ArenaLiveLobby` + `ArenaLiveRace` standings UI; ExamScreen
  arena mode broadcasts progress hooks.
- **Infra:** Supabase Realtime broadcast + presence on channel
  `arena-live:<room>` - no new services.
- **Risk:** realtime availability varies on school networks - the async
  path remains the fallback; race degrades to "results at end" when
  broadcasts are lost (each client still finishes and posts).
- **Rulings:**
  - Broadcast for progress (low-latency, ephemeral), RPC persistence for
    final results only - no per-answer DB writes.
  - Presence drives the lobby roster (accurate disconnects) instead of
    polling the players table.

## Estimate

New feature work: migration + client lib + 2 UI surfaces + tests.
Separate estimate per CR rules; not bundled with the audio coverage fix
or art regen already landed in this window.

## Verification status

- `tsc -b` + `vite build`: green.
- Vitest: `ArenaLiveLobby.test.tsx` 9/9 (menu gating, create/join,
  host-only start, fake-start shield, reconciliation poll launches
  without broadcast, host-leave bounce, failed-subscribe membership
  release, waiting-room cleanup on unmount).
- Integration smoke `scripts/_arena-live-smoke.mjs` against the deployed
  project: **22/22** (room lifecycle, host-only start, 2-player minimum,
  RLS blocking direct reads, anon RPC rejection, presence roster,
  start/progress/finish broadcast, score cap, server-measured timing,
  standings order, settlement, and stale-race settle via a member's
  state poll after the 30min cap).
- E2E `e2e/cr97-live-arena.spec.ts`: two real browser contexts
  (admin-provisioned students), self-skips without Supabase env/admin
  creds - same convention as `auth.spec.ts`.
- Lead review: 4 rounds to APPROVE. Hardened: server-side finish timing,
  `FOR UPDATE` settle locking, stale-race cleanup on both create AND
  the state-read path (30 min), one open room per host, room-authoritative
  grade/program propagation to joiners, host-id identity (not name),
  fake-start verification before launch, reconcile poll so a lost start
  broadcast cannot strand joiners, idempotent abandonment on pagehide +
  in-app exit, win only settles from a 'done' room (provisional
  standings never declare a victor), finish-write retry + failed state,
  failed-subscribe channel/membership cleanup, PUBLIC/anon/service-role
  revokes.
