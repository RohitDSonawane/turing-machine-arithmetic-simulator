# 05-TASKS.md — Implementation plan

Work through the milestones **in order**. Do not start a milestone until the previous one's acceptance criteria pass. Tick the boxes as you go. Record decisions in `NOTES.md`.

Reminders: scope is in `01-SCOPE.md`; engine details in `03-ENGINE-SPEC.md`; tables and vectors in `04-MACHINES.md`; visuals in `02-UI-SPEC.md`.

---

## M0 — Scaffold

- [ ] Create the directory layout from `AGENTS.md` §5 with empty files.
- [ ] `index.html` loads the CSS and the five scripts in the right order, has the page skeleton (header, tabs, panel, tapes, explain bar, controls, input panel, result banner, hardware card, trace, footer) as semantic HTML with ids/classes you will use later.
- [ ] Each JS file has the IIFE + `module.exports` wrapper.

**Accept:** opening `index.html` shows an unstyled skeleton with no console errors. `node -e "global.TM={};require('./js/engine.js')"` runs without error.

---

## M1 — Engine core (tested)

- [ ] `engine.js`: tape helpers (`getCell`, `setCell`, string ↔ cells), `createRunner` for `kind: "rules"`, history, `view()`, `step()`, `stepBack()`, `reset()`, `runToEnd()`, limit guard, stuck handling. Follow `03-ENGINE-SPEC.md` §3–§5.
- [ ] `normalise(bits)` helper and numeric verification helper.
- [ ] `tests/run.js` with a tiny `test(name, fn)` helper and a summary; exit code 1 on failure.
- [ ] Tests: step/back round-trip (step n times, back n times, view equals the initial view), stuck detection with a deliberately incomplete toy machine, limit guard with a toy machine that loops.

**Accept:** `node tests/run.js` passes the engine tests.

---

## M2 — Increment and Addition machines (tested)

- [ ] `machines.js`: `TM.machines.increment` exactly as `04-MACHINES.md` §1, including notes, states, presets, `layout`, `readResult`, `expected`.
- [ ] `TM.machines.addition`: generate the 18 rules in the documented order with the exact note templates; `layout` aligns LSBs at column 0; `readResult` reads tape 3.
- [ ] Tests: every vector in §1 and §2 of `04-MACHINES.md` (output **and** step count). Exhaustive increment for 0..1023. 200 random pairs (0..300) for the adder, including different lengths and leading zeros. Rule table checks: adder has 18 unique rule ids, all 18 `(state, read)` pairs are distinct.

**Accept:** all tests pass. Print the adder's rule table once in a test (for eyeballing) and confirm it matches the spec.

---

## M3 — Static UI shell (no logic yet)

- [ ] `styles.css` with the tokens from `02-UI-SPEC.md` §2, page background with the 0/1 pattern, title style, machine panel with rivets, rules table styling, tape strip with gears and head, explain bar, control bar, input card, result banner, hardware card, trace table, footer.
- [ ] Use hard-coded sample content (a mock addition) just to check visuals at 1280 px, 800 px and 390 px widths.
- [ ] Reduced-motion media query and focus styles.

**Accept:** side by side with the reference image, the page has the same structure (title, panel with STATE and RULES, head with READ/WRITE, strip with gears), and no layout breaks at the three widths. Remove the mock content afterwards.

---

## M4 — Wire the UI to rule machines

- [ ] `ui.js`: functions `renderView(view, prevView, machine)`, `renderRules(machine, view)`, `renderTapes(...)`, `renderExplain(...)`, `renderResult(...)`, `renderHardware(...)`, `renderTrace(...)`. Pure DOM updates from a View; no business logic.
- [ ] `describeEffect(rule)` exactly as in `02-UI-SPEC.md` §4.2.
- [ ] Tape sliding animation and write flash as specified (§5), honouring reduced motion.
- [ ] Input panel: validation, live decimal values, presets, `Load onto tape`.
- [ ] `main.js`: tabs, controls (Step, Back, Run/Pause, To end, Reset, speed slider), keyboard shortcuts, startup with Increment `1011`.
- [ ] Result banner with numeric verification.
- [ ] Trace log.
- [ ] Hardware card (Increment and Addition variants).

**Accept:** run the manual checklist items 1–12 below for Increment and Addition.

---

## M5 — Composite multiplier

- [ ] `composite.js`: `TM.machines.multiplication` and the phase machine from `03-ENGINE-SPEC.md` §6, registered with `createRunner` for `kind: "composite"`.
- [ ] Tests: all multiplication vectors in `04-MACHINES.md` §3, step count 18 for `101 × 11`, 300 random pairs (0..63), history round-trip across macro and ADD steps.
- [ ] UI: four tapes, phase stepper, macro card, `SUBROUTINE: ADD` chip, macro disclosure line in footer, N head walking left.
- [ ] Hardware card during ADD.

**Accept:** `node tests/run.js` passes; manual checklist items 13–16.

---

## M6 — Polish and docs

- [ ] Responsive pass at 360 px (9 visible cells, stacked layout, controls wrap).
- [ ] ARIA: live region, `aria-label` on tape strips and buttons, focus order.
- [ ] Contrast check of orange and yellow text on the panel; adjust if below 4.5:1.
- [ ] Remove dead code, add comments explaining *why* where non-obvious.
- [ ] Write `README.md` (how to run, how to run tests, what each file does, 10 lines).
- [ ] Final `NOTES.md` with decisions and any known limitations.

**Accept:** definition of done in `AGENTS.md` §7.

---

## Manual checklist (run in Chrome and Firefox)

1. Page loads on `file://` with Increment `1011` loaded, no console errors.
2. Step 8 times: output `1100`, banner green, step counter 8.
3. Back 3 times, Step 3 times: same final state.
4. Run at slow speed: strip slides smoothly, rules table highlight follows, explain bar updates, Pause works mid-run.
5. To end: jumps straight to `HALTED ✔`.
6. Load `111`: new leading `1` is written, output `1000`.
7. Invalid input (`12`, empty, 13 bits) shows an inline error and disables `Load`; running machine is unaffected.
8. Switch to Addition: three strips, columns aligned, all heads in the centre column, state `CARRY 0`.
9. Load `1011 + 0110`: five steps, output `10001`, decimal 17 shown as expected.
10. Load `101 + 11111`: short number's blanks are treated as 0; output `100100`.
11. Hardware card highlights the right truth-table row each step.
12. Keyboard: Space, →, ←, R work; typing in an input does not trigger them.
13. Switch to Multiplication: four strips, phase stepper visible, footer shows the macro note.
14. `101 × 11`: 18 steps, output `1111`, `ADD` rules table appears only during ADD with the `SUBROUTINE: ADD` chip.
15. `101 × 101`: `ADD` is struck through for the middle bit.
16. `111111 × 111111`: finishes without hitting the step limit; output `111110000001`.
17. Tab to 360 px width: layout stacks, nothing overflows horizontally.
18. Enable "reduce motion" in OS settings: no sliding or gear rotation, app still fully usable.

---

## Demo script for the group presentation (about 5 minutes)

1. **Increment (1 min).** Load `1011`. Step slowly. Say: scan right to the end, then flip trailing 1s to 0 until a 0 appears. Point at the RULES panel: this is the whole machine, six rules. Then run `111` to show the new leading 1.
2. **Addition (2 min).** Load `1011 + 0110`. Point out that the state is the **carry**. Step through two columns, reading the explain bar. Show the hardware card: same truth table as a 1-bit full adder. Then run `101 + 11111` to show different lengths.
3. **Multiplication (1.5 min).** Load `101 × 11`. Show the phase stepper: look at the bit, add, copy, shift, next. Stress that ADD is the same adder machine, run as a subroutine. Then `101 × 101` to show the skipped addition.
4. **Close (30 s).** A TM shows the logic of arithmetic. A CPU does it with circuits, but the carry state and the shift-and-add loop are the same ideas.

**Likely questions:** where is the transition table (RULES panel); what happens with unequal lengths (blank counts as 0); is a real ALU a Turing Machine (no, same ideas, different implementation); why macro steps in the multiplier (they stand for small sub-machines; the adder part runs as real transitions).
