# C16 PRO — FULL PROJECT SPEC
## G100 PRO / C16 V2
## Clean rebuild, professional-grade live trading decision-support system
## This spec is the single source of truth for the project

IMPORTANT:
- Do NOT ask startup questions unless there is a true blocking impossibility
- Do NOT improvise product meaning
- Do NOT simulate prices in live mode
- Do NOT deploy or publish before this spec exists in the project Spec tab
- Do NOT continue implementation if Spec tab is empty
- Use stricter logic when uncertain
- Preserve truth over appearance

---

## 0. PROJECT INITIALIZATION RULE

Before any coding, building, draft publishing, or live deployment:

1. Generate and attach this full `spec.md` into the project so it appears inside the **Spec** tab
2. Confirm the Spec tab is populated
3. Only then continue implementation

If Spec tab is empty:
- stop implementation
- stop deploy
- stop live publish
- first materialize `spec.md`

This project must never proceed as a spec-less build.

---

## 1. PROJECT CLASS

This project is NOT:
- a toy crypto app
- a generic screener
- a dashboard for pretty metrics
- a fake-smart score board
- a retail signal toy
- a UI-first prototype

This project IS:
- a professional-grade live trading decision-support system
- a brewing / accumulation / release detection engine
- a structure-first execution guidance system
- a trust-aware live runtime system
- a mobile-first operator tool
- a product where canonical truth matters more than visual completeness

The bar is high.
The product must feel:
- live
- strict
- serious
- technically disciplined
- structurally honest
- execution-aware
- trustworthy

---

## 2. PRIMARY PRODUCT GOAL

In real time, the system must answer:

- what is brewing
- which side is structurally forming
- what matters now
- what still blocks the next step
- whether a symbol is only interesting or truly actionable
- whether execution is only projected or exact
- where entry / invalidation / SL / TP are when truly justified
- what the operator should do now
- what to wait for next

This product is not built to impress.
It is built to be correct.

---

## 3. NON-NEGOTIABLE LAWS

1. One symbol = one canonical truth
2. One screen must not contradict another
3. 7D context may support a thesis, but may never replace trigger confirmation
4. C16 remains the canonical structural engine
5. No exact execution without exact structure
6. No exact entry without resolved entry anchor
7. No exact stop-loss without clean invalidation
8. No exact TP ladder if structurally invalid
9. No fake warnings; warnings must have behavioral consequences
10. No simulated prices in live mode
11. Degraded / stale / partial runtime must reduce trust and tighten execution
12. No status inflation
13. No local UI interpretation outside canonical projection
14. If exact is not justified, show only PROVISIONAL_PLAN
15. If fewer than 3 valid TPs exist, show fewer TPs
16. Layer B must never pretend full execution-grade maturity
17. Direction Unclear is allowed only if side == NEUTRAL or sideClarity < 50

---

## 4. BUILD STRATEGY

This is a clean rebuild of implementation.
It is NOT a blind rewrite of ideology.

### Preserve as doctrine
Keep these as project truths:
- 7D brewing / accumulation logic
- C16 as canonical structural engine
- MTF ladder:
  - 4H bias
  - 1H confirmation
  - 15M growth
  - 5M build
  - 1M gate
- trust / degraded / stale / live honesty
- Layer B vs Priority Core
- projected vs exact execution honesty
- blocker hierarchy
- hysteresis
- single canonical product truth

### Do NOT preserve automatically
Do not assume old code structure is correct.
If a subsystem is messy, rebuild it cleanly.

---

## 5. DATA LAYER

Use **frontend-direct Binance public WebSocket** as the primary live market path.

### Runtime transport model
Logical channels:
- quote / micro-price
- trade flow
- depth / pressure
- candle / structure

These may use one or more actual transport connections, but must merge into one canonical runtime per symbol.

### Backend role
Backend / canister is NOT the primary live relay in V2.
Backend may later be used for:
- settings persistence
- snapshots
- analytics
- history
- saved watchlist
- non-latency-critical support functions

### Live law
If live feed is lost:
- degrade honestly
- do not simulate candles
- do not fabricate prices
- do not silently continue as if live

Allowed fallback:
- reconnect
- stale warning
- degraded mode
- trust reduction
- execution tightening or blocking

Not allowed:
- fake continuation
- simulated market behavior in live mode

---

## 6. USER MODEL

Assume:
- single-user
- private tool
- no auth
- no roles
- no multi-user permissions

Use local persistence where useful:
- settings
- watchlist
- preferences
- feature flags
- selected symbol
- view state

Do not add auth complexity in this rebuild.

---

## 7. SYMBOL UNIVERSE

Use the **full active Binance USDM futures catalog dynamically**.

### Universe rules
- discover active symbols dynamically
- exclude only invalid / broken / unusable markets
- do not use hard absolute volume cutoff as the main selector
- do not reduce the universe to only top majors
- do not use only manual watchlist as base universe

### Tier model
Derive two tiers:

#### LAYER_B
Broad market awareness tier for:
- early brewing discovery
- lower-depth awareness
- weaker-confidence market-wide context

#### PRIORITY_CORE
Smaller higher-attention tier promoted by:
- 7D brewing quality
- structural relevance
- execution potential
- live importance
- runtime health

### Watchlist
Watchlist is separate from base universe.
It is an operator attention layer, not the market universe itself.

---

## 8. SCREEN ARCHITECTURE

Use a mobile-first tab shell.

### Main tabs
1. Board
2. Watchlist
3. Screener
4. Detail
5. More

### Roles

#### Board
Main decision surface.
Must answer:
- what matters now
- what is brewing
- what is unsafe
- what changed just now

#### Watchlist
Focused operator monitoring surface.
Must be compact and high-value.

#### Screener
Broader comparison surface across universe.

#### Detail
Deep symbol truth.
This is where execution truth becomes visible.

#### More
Settings / health / diagnostics / advanced.

### Build priority
1. spec artifact
2. canonical types + runtime
3. 7D + C16 + MTF + execution engines
4. Board
5. Detail
6. Watchlist
7. Screener
8. More

---

## 9. LAYERED ARCHITECTURE

### Layer A — 7D Context Engine
Purpose:
- detect brewing / accumulation / release potential
- operate across full universe
- provide background context and prioritization

### Layer B — C16 Canonical Structural Engine
Purpose:
- determine structural truth
- determine side
- determine phase
- determine trade readiness
- determine trigger quality
- determine execution quality
- determine risk
- determine trust
- determine blockers
- determine user-facing maturity

### Layer C — MTF Execution Ladder
Purpose:
- align execution readiness across timeframes
- refine whether execution may exist

### Layer D — Execution Resolver
Purpose:
- decide NO_PLAN vs PROVISIONAL_PLAN vs EXACT_PLAN vs LIVE_MANAGEMENT
- resolve entry class
- resolve entry / invalidation / SL / TP / RR
- resolve execution warnings and reasoning

### Layer E — Live Runtime Refinement
Purpose:
- runtime health
- stale detection
- degraded detection
- trust behavior
- recent-change narration
- runtime gating

No layer may steal another layer's role.

---

## 10. CANONICAL SYMBOL STATE

All surfaces must read from one canonical object only.

No component may invent product meaning outside this object.

Key fields:
- health: tier, runtimeMode, trustScore, degraded, stale, runtimeHealthy, syncQuality, dataQuality
- context7d: score, accumulation, tension, priceHold, twoWayFlow, releasePotential, stage, continuationState, supportsLong, supportsShort, tags
- c16: side, phase (internal), score, tradeReadiness, sideClarity, triggerQuality, executionQuality, risk, trust, blockers
- mtf: bias4h, confirm1h, growth15m, growth5m, gate1mLong, gate1mShort, entryAllowed, mainExecutionBlocker
- execution: executionSide, engineState, displayMode, entryClass, canShowExactExecutionPlan, exact prices/SL/TPs, executionWarnings
- ui: userFacingStatus, title, subtitle, safePhase (MTF-capped, for display), boardSection, mainBlocker, secondaryBlocker, nextPromotionTarget, recentChangeText, doNow

---

## 11. 7D CONTEXT ENGINE

7D scans the full futures universe.

Core 7D factors:
- AccumulationGrowthScore
- TensionGrowthScore
- PriceHoldScore
- TwoWayFlowPersistenceScore
- ReleasePotentialScore

7D may NOT:
- replace trigger confirmation
- create exact execution
- bypass MTF
- overrule C16

7D is background context only. Never the trigger substitute.

---

## 12. C16 ENGINE

C16 is the canonical structural brain.

Phase meanings:
- DORMANT = no meaningful setup structure
- BUILDING = structure forming, too early
- PRESSURIZED = pressure meaningful, directional importance rising
- TRIGGERABLE = local structure mature enough for trigger watch (internal only)
- DECAY = setup losing quality

C16 laws:
- C16 remains canonical
- MTF refines C16 but does not rewrite C16
- TRIGGERABLE is an internal phase — never surfaced directly to operator without MTF confirmation
- if trust is weak, execution tightens
- if risk is high, exact execution blocks

---

## 13. MTF LADDER

4H = bias (LONG / SHORT / NEUTRAL)
1H = confirmation (LONG / SHORT / UNCONFIRMED)
15M = growth score
5M = build score
1M = gate (gate1mLong / gate1mShort)

MTF laws:
- exact execution may not appear if 4H is NEUTRAL
- exact execution may not appear if 1H is UNCONFIRMED
- exact execution may not appear if 15M and 5M are both effectively weak / zero
- 1M gate alone may never justify exact execution
- higher timeframe blockers outrank lower timeframe gate

---

## 14. ENTRY CLASSES

Allowed: NONE, BREAKOUT, PULLBACK, RECLAIM, REVERSAL

EXACT_PLAN requires entryClass != NONE.
If entry class is unresolved, exact execution is blocked.

Early-exact exception allowed only for PULLBACK and RECLAIM with directional 4H, confirmed 1H, and non-zero 15M/5M.

---

## 15. EXACT EXECUTION GATE

EXACT_PLAN allowed only if ALL are true:

1. c16.side != NEUTRAL
2. mtf.bias4h != NEUTRAL
3. mtf.confirm1h matches execution side
4. mtf.growth15m >= 35
5. mtf.growth5m >= 35
6. final 1M gate supports entry
7. entryClass != NONE
8. entry anchor resolved
9. invalidation resolved
10. exact stop-loss resolved
11. at least one valid TP exists
12. at least RR1 >= 1.5
13. trust above execution minimum
14. runtimeMode not DEMO/HISTORICAL/blocked DEGRADED
15. no fatal execution warning exists

Hard rule: if 15M = 0 and 5M = 0, exact execution is blocked.

---

## 16. DISPLAY MODES

NO_PLAN: no meaningful execution structure.
PROVISIONAL_PLAN: setup path may exist, not executable yet. Show projected zones, activation, blockers. NO fake exact prices.
EXACT_PLAN: only when all 15 gate conditions pass. Show exact entry/SL/TPs/RR.
LIVE_MANAGEMENT: only after entry is live/active.

---

## 17. STATUS PROMOTION MATRIX

EARLY_CANDIDATE: 7D interesting, C16 weak, no execution structure
WORTH_WATCHING: directional idea, but 4H/1H not aligned or maturity low
FORMING_SETUP: structure building, missing key confirmation or exact gate
ACTIVE_CANDIDATE: 4H + 1H aligned, C16 strong, but exact execution still blocked
ARMED: execution nearly ready, one gate away, all higher-TF valid
READY: exact execution gate fully passes

Hard caps:
- 4H NEUTRAL OR 1H UNCONFIRMED → max FORMING_SETUP. Never ACTIVE_CANDIDATE, ARMED, or READY.
- LAYER_B tier → max FORMING_SETUP, max PROVISIONAL_PLAN. Never EXACT_PLAN, ARMED, READY.

---

## 18. HEADLINE RULES

Direction Unclear only if side == NEUTRAL or sideClarity < 50.

Title examples by status:
- READY: "Long Ready" / "Short Ready"
- ARMED: "Long Setup Armed" / "Short Setup Armed"
- ACTIVE_CANDIDATE: "Active Long Candidate" / "Active Short Candidate"
- FORMING_SETUP: "Long Bias Forming" / "Short Bias Forming"
- WORTH_WATCHING: "Worth Watching Long" / "Worth Watching Short"
- EARLY_CANDIDATE: "Long Bias Forming" (soft)

ARMED title must be distinct from ACTIVE_CANDIDATE title.

---

## 19. BOARD SECTION RESOLVER

NOW: no foundational blockers (no 4H neutral, no 1H unconfirmed, no trust issue, no degraded runtime, exact gate complete).
BREWING: getting closer but still incomplete.
SEVEN_DAY_BREWING: strong 7D background context, not yet near-term executable.
WATCH_OUT: degraded, stale, trust-reduced, unsafe, decaying.

DIRECTION_UNCLEAR symbols always go to WATCH_OUT.

Board NOW checks must use safePhase (MTF-capped), not raw c16.phase.

---

## 20. PROJECTED EXECUTION CONTEXT

Mandatory bridge between setup awareness and exact execution.
Must show: side, entry class, setup state (safePhase), activation condition, blockers, do now, recent change, reasoning.
Honesty labels: PROJECTED ONLY, NOT EXECUTABLE YET, WATCH ONLY.
No fake exactness.

---

## 21. EXACT EXECUTION PANEL

If EXACT_PLAN allowed: show entry, SL, invalidation, TPs, RRs, entry class.
Consistency law: EXACT_PLAN requires ARMED or READY status. FORMING + EXACT_PLAN is forbidden.

---

## 22. TP RULES

No duplicates. Monotonic in profit direction. No TP on wrong side of entry. No filler targets.
If only 1 valid TP: show TP1 only. At least RR >= 1.5 required.

---

## 23. RUNTIME HEALTH

Modes: LIVE, LIVE_PARTIAL, DEGRADED, OFFLINE, DEMO, HISTORICAL.

Behavioral effects:
- DEMO/HISTORICAL: execution blocked
- DEGRADED: execution restricted or blocked depending on trust
- LIVE_PARTIAL: execution may be unreliable; warn prominently
- stale: reduces trust

Live delta rule: always show real 24h delta. Never placeholder +0.00%.

Do Now must reflect runtime degradation:
- DEGRADED/OFFLINE: "Degraded — do not trade"
- LIVE_PARTIAL: "Runtime partial — data unreliable, stand aside"

---

## 24. RECENT CHANGES

Allowed examples: Setup holding, Pressure improving, Trigger strengthening/weakening, Context strengthening/weakening, Entry anchor resolved, Execution blocked by degraded runtime, No meaningful change.
Do not generate fake activity text.
Do not repeat "Entry anchor resolved" on every cycle if nothing actually changed.

---

## 25. BLOCKER ENGINE

Every symbol: main blocker, secondary blocker, tertiary blocker, next promotion target.
Priority law: higher timeframe blockers outrank lower timeframe blockers.
4H NEUTRAL → main blocker must be 4H issue, not 1M gate.
No repeated duplicate Next Step text.

Watchlist: if nextPromotionTarget substantially duplicates mainBlocker, suppress nextPromotionTarget from the sub-row.

---

## 26. HYSTERESIS

Per-symbol hysteresis buffers for side, user status, display mode, board section, recent-change narration.
Promotion and demotion thresholds must differ.
No one-cycle flapping.

---

## 27. LIST VS DETAIL VISUAL RULE

List rows: no candles. Show symbol, side, status, price, real delta, maybe compact blocker/state.
Detail: candles allowed, only where structurally useful.

---

## 28. TOP-SELECTION ORDERING

2-stage model:
Stage 1: 7D determines inclusion into brewing pool.
Stage 2: ordering by distance to valid entry (computeEntryRank), with heavy penalties for 4H NEUTRAL, 1H UNCONFIRMED, LAYER_B, entryClass NONE, gate blocked.

7D is inclusion gate and tie-breaker only. Never overrides higher-timeframe blocker severity.

Priority order: READY > ARMED > ACTIVE_CANDIDATE > FORMING_SETUP(good) > FORMING_SETUP(weak) > WORTH_WATCHING > background.

---

## 29. CONFIDENCE STACK

Execution confidence combines 7D support, C16 strength, MTF strength, runtime trust.
Confidence is NOT permission. Permission comes only from hard gates.
No exact execution because of score alone.

---

## 30. PHASE-BY-PHASE BUILD ORDER

Phase 0: spec.md into Spec tab.
Phase 1: canonical types, runtime health, symbol discovery, WebSocket channels.
Phase 2: 7D engine, C16 engine, MTF ladder, execution resolver, blocker engine, hysteresis.
Phase 3: Board, Detail, canonical projection, projected execution context, exact execution panel.
Phase 4: Watchlist, Screener, More, runtime diagnostics, settings.
Phase 5: consistency audits, status audits, exact gate audits, delta accuracy audits, mobile polish.

---

## 31. QA / CONSISTENCY AUDIT RULES

Before deploy, verify:

1. Spec tab exists and is populated
2. Board and Detail never contradict
3. Layer B never shows exact execution
4. 4H neutral + 1H unconfirmed never exceeds FORMING_SETUP
5. EXACT_PLAN never coexists with entryClass NONE
6. EXACT_PLAN never coexists with FORMING
7. EXACT_PLAN never appears when 15M and 5M are both dead/zero
8. Projected-only panels never show fake exact values
9. Delta values are real, not placeholders
10. Runtime modes behave materially, not cosmetically
11. Board NOW uses safePhase (MTF-capped), not raw c16.phase
12. ARMED status title is distinct from ACTIVE_CANDIDATE title
13. Do Now reflects runtime degradation (LIVE_PARTIAL, DEGRADED, OFFLINE)
14. Entry anchor text only says "resolved" when entryClass is also resolved
15. DIRECTION_UNCLEAR always routes to WATCH_OUT, never BREWING or NOW

---

## 32. FINAL DIRECTIVE

Build C16 PRO as a strict, clean, live, trust-aware decision engine.

Do not build a prettier version of confusion.
Build a stricter version of truth.

---

## 33. AUDIT CHECKLIST — FINAL PUSH

All items below must pass before production lock:

### Truth Layer
- [ ] Status caps: 4H NEUTRAL -> max WORTH_WATCHING everywhere (Board, Watchlist, Screener, Detail)
- [ ] Status caps: 4H directional + 1H UNCONFIRMED -> max FORMING_SETUP everywhere
- [ ] Layer B max status: FORMING_SETUP
- [ ] Layer B max display mode: PROVISIONAL_PLAN
- [ ] EXACT_PLAN gate: all 15 conditions verified
- [ ] FORMING + EXACT_PLAN: forbidden (floor correction applied)
- [ ] entryClass NONE + EXACT_PLAN: blocked
- [ ] 15M/5M both dead + EXACT_PLAN: blocked (except PULLBACK/RECLAIM)
- [ ] DIRECTION_UNCLEAR: only when side==NEUTRAL or sideClarity<50
- [ ] DIRECTION_UNCLEAR always -> WATCH_OUT board section
- [ ] Board NOW: uses safePhase checks, not raw c16.phase
- [ ] ARMED status title: "Long/Short Setup Armed" (distinct from ACTIVE_CANDIDATE)
- [ ] resolveUserStatus ARMED path: uses safePhase or equivalent structural check (not raw c16.phase)
- [ ] Board SEVEN_DAY_BREWING: uses safePhase checks (not raw c16.phase)

### Runtime Hardening
- [ ] WebSocket slow-retry: never permanent OFFLINE after maxReconnects
- [ ] Slow-retry failure: re-enters slow-retry, not fast reconnect loop
- [ ] Trust: cumulative degradation across cycles (prevTrust passed correctly)
- [ ] No simulated prices when wsConnected=false
- [ ] Do Now: "Degraded — do not trade" when DEGRADED/OFFLINE
- [ ] Do Now: runtime-aware when LIVE_PARTIAL
- [ ] Stale symbols: runtimeMode = LIVE_PARTIAL when staleness > 30000
- [ ] 24h delta: real values from REST + WebSocket (no placeholder +0.00%)

### Execution Discipline
- [ ] TP monotonic: enforced post-derivation
- [ ] TP wrong-side-of-entry: blocked
- [ ] RR1 >= 1.5 required for exact plan
- [ ] Entry class unresolved: exact blocked
- [ ] Early-exact exception: PULLBACK/RECLAIM only with justification
- [ ] executionResolver ARMED engineState: no dependency on raw c16.phase

### Operator UX
- [ ] Next Step wording: no duplication with mainBlocker in Watchlist sub-row
- [ ] recentChangeText: no spurious repeat of "Entry anchor resolved" every cycle
- [ ] Titles are distinct per status level
- [ ] No "Next: Next:" label duplication
- [ ] Do Now and Next Step unique (deduplication applied)
