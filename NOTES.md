# Implementation Notes & Decisions

## Architectural & Design Decisions

1. **Namespace & Module Pattern**:
   - Universal IIFE wrapper exposing `TM` on `globalThis` / `window` in the browser, and exporting via `module.exports = TM` for Node.js test execution.
   - Script load order in browser: `engine.js` -> `machines.js` -> `composite.js` -> `ui.js` -> `main.js`.
   - Node test harness initializes `global.TM = {}` then requires engine, machines, and composite modules.

2. **Tape Representation & Coordinates**:
   - Sparse object representation `{ [position: number]: symbol }`.
   - Blank symbol is strictly `"B"`. Unset or `"B"` positions are treated identically. Writing `"B"` deletes the key.
   - Increment: input bits start at column 0 (MSB at 0, LSB at n-1), head starts at 0.
   - Addition & Multiplication: numbers are placed with LSB at column 0 (positions `-(len-1)` through `0`), aligning columns naturally across tapes.

3. **Multi-tape Runner**:
   - Generic rule engine in `engine.js` supports arbitrary tape counts.
   - Deterministic single rule match per step. If no rule matches, runner transitions to `"stuck"`.
   - Step limit is enforced at 5,000 steps.

4. **Machine Definitions & Tests (M1 & M2)**:
   - Incrementor accurately verified across 0..1023 and edge cases (all ones, trailing ones, single bit).
   - Adder with 18 rules verified against exact templates, 200 randomized pairs, differing bit lengths, and leading zeros.

5. **Composite Multiplier Architecture (M5)**:
   - Built around the shift-and-add algorithm using phases `READ`, `ADD`, `COPY`, `SHIFT`, `NEXT`.
   - Reuses `TM.machines.addition` as an embedded sub-machine during the `ADD` phase, maintaining pure separation of concerns.
   - Verified that `101 × 11` runs in exactly 18 transitions (matching reference calculation).
   - Verified against 300 random test pairs (0..63) and history forward/back stepping.

6. **UI Polish, Visuals & Accessibility (M3, M4, M6)**:
   - Retro arcade aesthetic faithfully implemented with custom CSS variables, corner rivets, animated lamps, head assembly with `READ`/`WRITE` labels, and SVG gears.
   - High contrast ratios (exceeding 4.5:1) for all typography on dark panels.
   - Fully responsive down to 360px viewport width (adapting visible tape cells from 15 to 9, wrapping control bars).
   - Reduced-motion queries respected (`prefers-reduced-motion: reduce`).
