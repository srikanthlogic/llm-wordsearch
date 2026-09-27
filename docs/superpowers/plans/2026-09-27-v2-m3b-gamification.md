# WordKey v2 — Milestone M3b: Gamification (Implementation Plan)

> **For agentic workers:** subagent-driven or executing-plans, task-by-task, checkbox tracking. **Repo loop:** one task = one issue = one branch/PR into `dev`, CI green, ledger line. Verify: tests locally; tsc/lint/build in `/tmp/ws-clean`.

**Goal:** Visitors are gamified device-locally: sequential level progression per domain (resume where you left off), a fixed badge catalog issued as they play, a trophy shelf, and a stateless badge share-link — no accounts, no server state (spec §5.1).

**Architecture:** Two pure-engine services own the logic: `services/progressionService.ts` (per-domain level progress in localStorage) and `services/badgeService.ts` (fixed badge catalog + pure `applyGameEvent` reducer over a `BadgeState`, streaks by calendar-day bucketing per the #59 pattern). `GameBoard` grows a wrong-selection counter and emits events on level completion/run end; `ServeHome` displays completion and resumes at the first uncompleted level; `TrophiesView` lists earned + locked; badge share-links reuse the lz-string hash mechanism.

**Spec:** `docs/superpowers/specs/2026-09-27-v2-reposition-design.md` rev 4 — §5.1.

## Global Constraints

- Everything device-local (localStorage keys `wordkey.progress.*`, `wordkey.badges.*`); no server calls.
- Streak math by calendar day (local midnight diff, as #59 fixed) — never elapsed-ms rounding.
- Badge catalog is fixed and ships with the app (owner-custom badges are a v2.1 option, [DECISION 5]).
- Games without a corpus provenance (generated/shared) do not create domain progress; they still count toward word counters and streaks.
- All new copy = i18n keys ×7 (en canonical + short translations).

---

### Task 1: Progression + badge engine (pure services + storage)

**Files:**
- Create: `services/progressionService.ts`
- Create: `services/badgeService.ts`
- Test: `test/services/progressionService.test.ts`
- Test: `test/services/badgeService.test.ts`

**Interfaces (exact — Tasks 2–3 consume these):**
- `progressionService.ts`:
  - `interface DomainProgress { unlockedLevel: number; completedLevels: number[]; bestTimeSeconds: Record<number, number> }` (levels are 1-based)
  - `loadProgress(): Record<string, DomainProgress>`; `recordLevelResult(slug: string, level: number, totalLevels: number, sequential: boolean, secondsTaken: number): { unlockedNext: boolean; completedAll: boolean }`; `firstUncompletedLevel(progress: Record<string, DomainProgress> | undefined, slug: string, totalLevels: number): number`; `resetProgress(): void`
- `badgeService.ts`:
  - `interface BadgeDef { id: string; icon: string; titleKey: string; descriptionKey: string }`
  - `BADGE_CATALOG: BadgeDef[]` — `first-find`, `word-hunter-50`, `flawless-level`, `speed-solver`, `comeback`, `streak-3`, `streak-7`, `streak-30`, `polyglot` (domain-master badges are generated at runtime as `domain-master-<slug>`; `completionist` via `maybeAwardCompletionist`)
  - `interface BadgeState { earned: Record<string, number>; counters: { wordsFound: number; lostLevels: number; localesPlayed: string[]; domainsMastered: string[] }; streak: { lastPlayedDate?: string; current: number; best: number } }`
  - `loadBadgeState(): BadgeState`; `saveBadgeState(state): void`; `resetBadges(): void`
  - `interface GameBadgeEvent { domainSlug?: string; level: number; isLastLevel: boolean; wonLevel: boolean; lostLevel: boolean; secondsLeft: number; timeLimitSeconds: number; wrongSelections: number; wordsFoundInLevel: number; locale: string }`
  - `applyGameEvent(state: BadgeState, event: GameBadgeEvent): { state: BadgeState; newlyEarned: BadgeDef[] }` (pure: returns a NEW state + the catalog entries earned by this event; `domain-master-<slug>` defs are synthesized on the fly)
  - `maybeAwardCompletionist(state: BadgeState, totalDomains: number): { state: BadgeState; newlyEarned: BadgeDef[] }`

**Behavior rules (encoded in tests):**
- `first-find`: any event with `wordsFoundInLevel ≥ 1` and counter was 0.
- `word-hunter-50`: `counters.wordsFound` crosses 50 cumulatively.
- `flawless-level`: `wonLevel && wrongSelections === 0`.
- `speed-solver`: `wonLevel && secondsLeft > timeLimitSeconds / 2`.
- `comeback`: `wonLevel && counters.lostLevels > 0` (lostLevels counts lost levels across sessions; never resets except badge reset).
- Streaks: same local calendar day → no change; consecutive day → `current += 1`; gap ≥ 2 days → reset to 1; thresholds award `streak-3/7/30`.
- `polyglot`: distinct `localesPlayed` ≥ 2.
- Domain master: `wonLevel && isLastLevel && domainSlug` → `domainsMastered` gains slug (once) + synthesized badge def.
- Badge awarding is idempotent (`earned` set); re-earning does not re-list.
- `recordLevelResult`: marks completed (idempotent), unlocks `min(level+1, totalLevels)` when sequential, best time min-merge; `firstUncompletedLevel` = smallest level not in completedLevels (default 1).
- localStorage failure → warn + no-op (stateless play must never break).

---

### Task 2: Wire issuance + progression into play + serve home

**Files:**
- Modify: `views/PlayerView.tsx` (GameBoard): add `wrongSelectionsRef` incremented in the selection handler's not-found branch; in the level-complete effect and lost path, build the `GameBadgeEvent` (domainSlug from `gameDefinition.id` when it starts with `corpus-`; `secondsLeft` from the timer state; `lostLevel` on exit-with-loss path) → `applyGameEvent` → toast each newly earned badge (`t(badge.titleKey)`, 'success'); when starting level 0 of a corpus game with sequential progression on, `setupLevel(firstUncompletedLevel(...) - 1)` instead of 0.
- Modify: `components/ServeHome.tsx`: cards show completion `t('serve.levelsDone', { done, total })`; completion ring on the header (SVG circle, `t('serve.overallCompletion', { percent })`); after corpus load call `maybeAwardCompletionist(domains.length)` and toast; domain card click resumes at first uncompleted level (handled in GameBoard via Task 2 above).
- Modify: `views/SettingsView.tsx`: "Reset progress & badges" button reusing the clear-data confirm pattern → `resetProgress()` + `resetBadges()` + toast.
- i18n keys ×7: `badge.*` (9 catalog titles/descriptions + `badge.domainMaster` with `{{domain}}`), `toast.badgeEarned`, `serve.levelsDone`, `serve.overallCompletion`, `settings.progress.reset`, `settings.progress.resetConfirmTitle`, `settings.progress.resetConfirmMessage`, `settings.progress.resetConfirmButton`
- Test: `test/views/PlayerView.badges.test.tsx` (found-all flow on a corpus game awards `flawless-level`/`speed-solver` per timing; localStorage asserts), `test/components/ServeHome.progress.test.tsx` (card shows completion after `recordLevelResult`), Settings reset test in existing patterns.

---

### Task 3: Trophy shelf + badge share-link

**Files:**
- Modify: `types.ts` (`View.Trophies`), `App.tsx` (case + nav prop), `Sidebar.tsx`/`BottomTabBar.tsx` (`showTrophies?: boolean` — serve mode; icon `TrophyIcon` from lucide)
- Create: `views/TrophiesView.tsx` — earned badges (icon + title + earnedAt date, explicit locale formatting per #91) + locked badges with their condition (`descriptionKey`), back to Player
- Badge share: `badgeService.buildBadgeShareUrl()` → `${origin}${pathname}#badges=<lz>`; `App.tsx` hash-parse: `#badges=` → decompress → read-only "badge card" rendering route (new component `components/BadgeCard.tsx` shown in place of Player when hash present, dismissed by history.replaceState like `#game=`)
- i18n keys ×7: `trophies.title`, `trophies.earned`, `trophies.locked`, `trophies.lockedHint`, `trophies.share`, `trophies.shared`, `badgecard.title`, `badgecard.by` (with `{{owner}}`)
- Test: `test/views/TrophiesView.test.tsx`, `test/App.badgeShare.test.tsx` (round-trip: build URL → parse → card renders owner + earned badges)

---

## Post-M3b

M4 (agent artifacts: shared vocab.md renderer, llms.txt, agent docs page) — plan written when reached.
