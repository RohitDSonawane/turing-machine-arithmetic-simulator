# 01-SCOPE.md — Scope (binding)

## 1. Goal

Give the presenters a live, correct, good-looking simulator they can run in front of an examiner to show that a Turing Machine can **increment, add and multiply binary numbers**, and to connect each step to what an ALU does.

## 2. Users

- **Presenter** (team member): runs the demo, steps through an example, answers "show me the transition table".
- **Viewer** (examiner or classmate with no TOC background): should understand what is happening from the screen alone, including a plain-English sentence for every step.

## 3. In scope

Priority key: **M** = must, **S** = should (build after all M items), **C** = could (only if everything else is done).

### 3.1 Machines

| ID | Item | Priority |
|---|---|---|
| F1 | Binary Increment machine, single tape | M |
| F2 | Binary Addition machine, three tapes (A, B, result), carry in state | M |
| F3 | Binary Multiplication, shift-and-add, using the adder as a subroutine, four tapes (M, N, A, T) | M |
| F4 | Machine selector (three tabs) | M |

### 3.2 Simulation

| ID | Item | Priority |
|---|---|---|
| S1 | Step forward one transition | M |
| S2 | Run / Pause with speed slider | M |
| S3 | Reset to the loaded input | M |
| S4 | Step back one step (history stack) | S |
| S5 | Jump to end (run to halt instantly, capped at 5,000 steps) | S |
| S6 | Step counter and halt detection | M |
| S7 | "Stuck" detection (no matching rule) and step-limit guard with a clear message | M |

### 3.3 Display

| ID | Item | Priority |
|---|---|---|
| D1 | Machine panel with big `STATE:` readout | M |
| D2 | `RULES:` table for the active machine, active rule highlighted and auto-scrolled into view | M |
| D3 | One tape strip per tape, head marker with READ and WRITE slot, strip slides when the head moves | M |
| D4 | Plain-English "what just happened / what happens next" line for every step | M |
| D5 | Input panel with validation (binary digits only, length limits) and **preset examples from the slides** | M |
| D6 | Result banner on halt: output bits, decimal value, and a correctness check against the expected value | M |
| D7 | Trace log (table of steps: #, state, read, write, move, next state) | S |
| D8 | Hardware link card: shows the 1-bit full-adder truth-table row matching the current adder step and one sentence tying the state to the ALU carry | S |
| D9 | Decorative machine details (LED lamps that blink on a step, gears that turn on a move) | S |
| D10 | Show/hide blank symbols toggle | C |
| D11 | Keyboard shortcuts (Space run/pause, → step, ← step back, R reset) | S |

### 3.4 Quality

| ID | Item | Priority |
|---|---|---|
| Q1 | Works offline via `file://` | M |
| Q2 | Logic tests in Node (vectors + randomized) | M |
| Q3 | Responsive down to 360 px wide (stacked layout, fewer visible cells) | S |
| Q4 | `prefers-reduced-motion` support | S |
| Q5 | ARIA live status line, focus styles | S |

## 4. Out of scope (do not build)

- Editing or creating custom machines, a rule editor, importing or exporting machine files.
- Nondeterministic machines, universal Turing machine, halting-problem demos.
- Other automata (DFA, NFA, PDA, Mealy) or any other topic from the FA2 list.
- Subtraction, division, decimal input, negative numbers, fractional numbers.
- Backend, database, user accounts, analytics, sharing links, persistence (localStorage) of any kind.
- Build tooling, TypeScript, frameworks, package publishing, CI.
- Sound effects, multi-language support, themes other than the one specified.
- Exporting traces (CSV/PDF), screenshots, video recording.
- Scrubbing a timeline slider (only step back one at a time).
- Formal proofs or complexity measurement dashboards. A single step counter is enough.

## 5. Constraints and assumptions

- Input alphabet is `{0, 1}`; tape alphabet adds blank `B`. Binary numbers are written MSB first, as on paper.
- Limits: Increment ≤ 12 bits. Addition ≤ 10 bits per operand. Multiplication ≤ 6 bits per operand. Leading zeros are allowed and preserved on the tape.
- The multiplier uses **macro steps** for copy, shift and next-bit. This is deliberate and must be disclosed in the UI (badge `MACRO`) and in the footer note. The adder part inside it runs as real transitions.
- The simulator is a teaching aid. It must not claim that a CPU literally contains a tape.

## 6. Success criteria

1. The four slide examples run and produce the stated results: `1011+1=1100`, `111+1=1000`, `1011+0110=10001`, `101×11=1111`, plus the extra vectors in `04-MACHINES.md`.
2. A viewer with no TOC knowledge can tell, for any step, what symbol is read, what is written, which way the head goes and what the next state is.
3. A presenter can answer "show me the transition table" by pointing at the RULES panel.
4. `node tests/run.js` passes with at least 200 randomized cases per machine.

## 7. How this maps to the FA2 rubric

| Rubric item | What the simulator provides |
|---|---|
| Selection and relevance | Directly implements "machines for binary addition, increment, or multiplication" from the topic list |
| Conceptual understanding | Real transition tables, carry as state, multitape design, composition of machines, ALU link card |
| Presentation and visuals | Live animation, clear panels, consistent style |
| Contribution to ideas | Original simulator, reuse of the adder inside the multiplier, hardware-link card |
