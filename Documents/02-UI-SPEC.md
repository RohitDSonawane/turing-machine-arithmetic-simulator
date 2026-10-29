# 02-UI-SPEC.md — UI specification

Priority tags (M/S/C) match `01-SCOPE.md`. IDs like D1 refer to the same table.

## 1. Reference and what to take from it

The reference screenshot shows a retro "machine" explainer. Reproduce its **structure and mood**:

- Saturated red page background with a faint repeating pattern of tiny `0`/`1` digits.
- Big yellow block-letter title `TURING MACHINE` with a purple outline and offset shadow.
- A wide dark-slate machine panel with a riveted border, split into:
  - left: `STATE:` label, a decorative toggle/dial, `RULES:` label, three small round knobs;
  - right: the current state in large pixel-style orange-red text, and a three-column rules table (`STATE | CURRENT SYMBOL | EFFECT`).
- Below the panel: a trapezoid read/write head with `READ` and `WRITE` labels pointing down into a dark tape strip with orange symbols, a gear at each end and `...` dots beyond the ends.
- Small decorative extras: red LED lamps and wires on top of the panel.

**Do not** reproduce: any logo or watermark (PBS, Crash Course, closed-caption badge), the YouTube chrome, or any pixel from the screenshot. Build everything with CSS and inline SVG. Do not name or credit the reference inside the app.

## 2. Design tokens

Define as CSS custom properties on `:root`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#E94B5A` | Page background |
| `--bg-pattern` | `rgba(255,255,255,0.07)` | 0/1 digit pattern (SVG data-URI or repeated text, behind content) |
| `--panel` | `#3A4040` | Machine panel, tape cells |
| `--panel-edge` | `#262B2B` | Panel borders, rivets |
| `--panel-lite` | `#4A5252` | Table row stripes |
| `--ink` | `#F5F0E6` | Light text on panel |
| `--orange` | `#F59A2B` | Symbols, rule text |
| `--state` | `#EF5B3F` | Big state readout |
| `--yellow` | `#FFE600` | Title, active-rule highlight, head glow |
| `--purple` | `#5B2A86` | Title outline and shadow |
| `--ok` | `#3FD17F` | Halted OK |
| `--bad` | `#FF3B3B` | Stuck / mismatch |
| `--radius` | `10px` | Panels |

Fonts: see `AGENTS.md`. State readout and tape symbols use the pixel/mono face; rule table uses the same face at smaller size; explanatory text uses the body face.

Contrast: orange/yellow/ink text on `--panel` must be at least 4.5:1. If a combination fails, lighten the text, not the panel.

## 3. Page layout (desktop ≥ 1100 px)

Top to bottom, centred column, max width 1180 px:

1. **Header**: title `TURING MACHINE` (yellow block letters). Under it a one-line subtitle: the selected machine's title, for example `Binary Addition · 3 tapes`.
2. **Machine tabs** (F4, M): three arcade-style buttons `INCREMENT`, `ADDITION`, `MULTIPLICATION`. Selected tab is yellow with dark text. Switching tabs resets the runner and loads that machine's default preset.
3. **Machine panel** (D1, D2, M): see §4.
4. **Tape section** (D3, M): one strip per tape, see §5.
5. **Explain bar** (D4, M): see §6.
6. **Control bar** (S1–S6, M): see §7.
7. **Two-column row**:
   - left: **Input panel** (D5, M), see §8;
   - right: **Result banner** (D6, M) above **Hardware link card** (D8, S).
8. **Trace log** (D7, S): collapsible section, collapsed by default.
9. **Footer**: `Built for Theory of Computation · FA2 · From Tape to ALU` and the macro disclosure line (only when Multiplication is selected): `COPY, SHIFT and NEXT BIT are macro steps that stand for small sub-machines. ADD runs as real transitions.`

Tablet (700–1099 px): same order, input panel and result banner stack. Mobile (<700 px, Q3): single column, tape shows 9 cells, rules table shows 3 rows, controls wrap onto two lines.

## 4. Machine panel (D1, D2)

A dark rounded rectangle with a 6 px `--panel-edge` border and four corner rivets (CSS radial gradients). Two zones.

### 4.1 Left zone (about 38% width)

- Label `STATE:` in yellow, outlined, large.
- **State readout** (D1): the state's display label in large uppercase pixel text in `--state`, for example `CARRY 1`. It sits in the wide top-right plate of the panel, as in the reference. Below it, in small text, the state id (`c1`).
- Decorative toggle graphic (S, D9): pure CSS. Optional.
- Label `RULES:` in yellow.
- Three round knobs (D9) that act as **lamps**: lamp 1 lights on every step, lamp 2 lights when the head moved left, lamp 3 lights when it moved right. Halted: all three lit green. Stuck: all three lit red.

### 4.2 Right zone: rules table (D2, M)

- Header row: `STATE | READ | EFFECT` (for the multiplier also shows a small `SUBROUTINE: ADD` chip when relevant, see §4.4).
- Rows come from the machine definition (`rules` array). One row per rule.
- Visible height: 4 rows on desktop (like the reference), scrollable. A toggle `Show all rules` expands the table to full height.
- **Active rule**: the rule that will fire on the next step (`view.nextRuleId`). Highlight with yellow left bar, brighter background and a soft glow. Scroll it into view smoothly (`scrollIntoView({block:"nearest"})`).
- **Last fired rule**: dim outline, so the viewer sees what just ran.
- Columns:
  - `STATE`: the state's short id in quotes style, for example `"c1"` (matching the reference's `"EVEN"`).
  - `READ`: symbols read, one per tape, joined with ` · `. Single tape: `1`. Three tapes: `1 · 0 · B`. Blank is shown as `B`.
  - `EFFECT`: text built by `describeEffect(rule)` below, two lines max.

`describeEffect(rule)` rules:

1. For each tape where `write[i] !== read[i]`, add `WRITE x` (single tape) or `WRITE x ON TAPE n` (multi tape, using the tape's short label if present).
2. Moves: if all moves are `S`, add nothing. If all non-`S` moves are the same, add `MOVE HEAD LEFT/RIGHT` (single tape) or `MOVE HEADS LEFT/RIGHT` (multi tape). If they differ, list per tape: `T1 L, T2 R`.
3. Always end with `SET STATE = "<next id>"`. For halting transitions append ` (HALT)`.
4. Rules that only change state and stay put still print the `SET STATE` line, so the row is never empty.

### 4.3 Hardware knobs and wires (D9, S)

Wires are two thin SVG paths in `#B63B3B` that curve from the panel's side to the top edge. LED lamps on top of the panel blink briefly (150 ms) on each step. Pure decoration; hide under `prefers-reduced-motion`.

### 4.4 Multiplier variant

- The rules table shows the **adder's rules** while the multiplier is in its ADD phase, with the chip `SUBROUTINE: ADD`.
- In macro phases the table is replaced by a single **macro card** with the same highlight style: a `MACRO` badge, the macro name (`READ N BIT`, `COPY T → A`, `SHIFT M LEFT`, `NEXT BIT`), and its one-line description from the definition.
- A **phase stepper** sits above the table: `READ N BIT → ADD → COPY → SHIFT → NEXT`. The current phase is highlighted yellow. `ADD` is skipped (shown struck through) when the current multiplier bit is 0.
- The `STATE:` readout shows the phase name; when in ADD it shows `ADD · CARRY 1` style text.

## 5. Tape strips (D3, M)

Render one strip per tape, stacked, in the order given by the machine definition.

Per strip:

- Left label chip with the tape's label, for example `TAPE 1 · A`.
- A dark rounded strip containing **15 visible cells** (9 on mobile), the head at the centre cell. Cells are 52×52 px (40×40 on mobile) with a 2 px gap and `--panel-lite` borders. Symbols are `--orange`, 28 px, pixel font. Blank shows a dim `B` (`opacity: .35`) by default.
- A **gear** (SVG) at each end of the strip, centred vertically, partly overlapping the strip like the reference. Gears rotate 45° per move in the direction of tape travel (D9).
- Beyond the visible cells a faint `. . .` is drawn at each end.
- **Head**: a trapezoid cap above the centre cell with labels `READ` (left half) and `WRITE` (right half) and two small circular windows. A thin yellow "beam" connects it to the centre cell. The centre cell has a yellow outline glow.
  - In multi-tape machines show the `READ`/`WRITE` labels only on the first strip's head. Other heads show a plain cap with the tape number.

**Movement model (important):** the head stays in the screen centre and the **strip slides**. Moving the head `R` slides the strip left by one cell, moving `L` slides it right. Implementation: keep an integer `center` position per tape; render cells for `center-VIS-1 … center+VIS+1` inside an `overflow:hidden` container; on a move, apply a CSS transform transition of one cell width over `0.6 × stepDuration` ms, then on `transitionend` update `center` and re-render without transition. If a new step arrives before the transition ends (fast speeds), finish it immediately.

**Write animation:** when a cell's symbol changes, flash the cell (`--yellow` background fading to normal over 250 ms).

**Multi-tape alignment:** in Addition and Multiplication, all tapes start with their LSB at column 0 so columns line up vertically. Because each strip is centred on its own head, strips stay aligned whenever heads share a column (always true in the adder).

Accessibility: each strip has `role="img"` and an `aria-label` that is updated each step, for example `Tape 1, A: 1 0 1 1, head on the last 1`.

## 6. Explain bar (D4, M)

A light card under the tapes with an icon and a single sentence, updated on every step. Two parts:

1. **Next:** what will happen if you press Step, built from the active rule's `note`. Example: `Reads 1 on tape A, 1 on tape B, carry 0. Sum is 2: write 0, carry 1, move all heads left.`
2. **Last:** the previous step's note in smaller, dimmer text.

When halted show `Halted. <result sentence>`. When stuck show `No rule matches (<state>, <read>). The machine stops and rejects.`

The same text goes to the ARIA live region (`aria-live="polite"`), but only the **Next** sentence, and only on manual steps (not while running at speed, to avoid spamming screen readers).

## 7. Control bar (S1–S6, S4, S5, D11)

Buttons (arcade style, 44 px tall minimum):

`⟲ Reset` · `◀ Back` (S) · `▶ Step` · `⏵ Run / ⏸ Pause` · `⏭ To end` (S)

Plus a **speed slider** labelled `Slow ↔ Fast`, mapping to a step interval from 1200 ms down to 80 ms (default 500 ms), and a **step counter** `STEP 7`.

Behaviour:

- Run advances one step per interval until halted/stuck/limit, then reverts the button to `Run` (disabled when halted until Reset).
- Changing the slider while running takes effect on the next tick.
- `Step`, `Back`, `To end` pause a running simulation first.
- `Back` disabled at step 0. `Step` and `Run` disabled when halted, stuck or at limit.
- `To end` runs without animation, then renders the final view once, and sets the step counter.
- Keyboard (D11): Space = Run/Pause, → = Step, ← = Back, R = Reset. Ignore when focus is in a text input.

## 8. Input panel (D5, M)

A light card with a title `LOAD INPUT`.

- Inputs per machine:
  - Increment: `Binary number`.
  - Addition: `A` and `B`.
  - Multiplication: `M (multiplicand)` and `N (multiplier)`.
- Each field: monospace text input, `inputmode="numeric"`, placeholder `e.g. 1011`, live validation: only `0`/`1`, non-empty, within the length limit from `01-SCOPE.md`. Invalid input shows a red inline message and disables `Load`.
- Under the fields, show the **decimal value** of each valid input live, for example `= 11`.
- Preset chips (from the slides): `1011 + 1`, `111 + 1`, `1011 + 0110`, `101 × 11`, plus the extra presets in `04-MACHINES.md`. Clicking a chip fills the fields and loads it immediately.
- `Load onto tape` button: builds the runner, resets the step counter, renders the initial view.
- On first page load, the Increment tab is selected and preset `1011` is loaded.

## 9. Result banner (D6, M)

Hidden until the machine halts (or gets stuck). On halt, show:

```
HALTED   Output: 10001      (decimal 17)
Expected: 11 + 6 = 17        Steps: 5
```

- Green when the numeric value equals the expected value, otherwise red with `MISMATCH`.
- Output is read from the result tape (see `04-MACHINES.md`), shown raw (leading zeros kept) and normalised.
- On stuck or limit, show a red banner with the reason.

## 10. Hardware link card (D8, S)

Visible on Addition and Multiplication (during ADD) and a short static variant on Increment.

- **Addition / ADD phase:** a small 3-column truth-table row, updated every step, showing `a  b  carry-in → sum  carry-out` for the step about to run, with the matching row highlighted in a static 8-row full-adder truth table. One sentence below: `This is what a 1-bit full adder in an ALU computes. The carry state (c0/c1) plays the role of the carry wire.`
- **Increment:** one sentence: `Increment is a chain of half-adders: flip trailing 1s, stop at the first 0. Counters and the program counter do this in hardware.`
- Caveat line (always): `A real CPU does not use a tape; this shows the same idea in electronics.`

## 11. Trace log (D7, S)

A collapsible `<details>` titled `Trace`. A table with columns `#`, `State`, `Read`, `Write`, `Move`, `Next`. One row per executed step, newest at the bottom, auto-scrolling. Macro rows show `MACRO` in the `Write` column and the macro name in `Read`. Clear on Reset and on Load. Cap to the last 200 rows in the DOM.

## 12. States the UI must handle

| State | Look |
|---|---|
| Ready (loaded, step 0) | Lamps off, rules table shows the first active rule |
| Running | Lamp 1 pulses, Run button shows Pause |
| Halted OK | Lamps green, result banner green, Step/Run disabled |
| Stuck | Lamps red, banner red with explanation |
| Step limit (5,000) | Banner amber: `Stopped after 5000 steps. This should not happen for valid input.` |
| Invalid input | Inline error, `Load` disabled, current run untouched |

## 12.1 Motion

Respect `prefers-reduced-motion: reduce`: no strip sliding, no gear rotation, no LED blink. Cells update instantly; the active-rule highlight and write flash remain (flash becomes a static 250 ms outline).

## 13. Out of scope for the UI

Dark/light theme switch, drag-and-drop of cells, editing cells by clicking, scrubbing timeline, tooltips with tutorial tours, onboarding wizard.
