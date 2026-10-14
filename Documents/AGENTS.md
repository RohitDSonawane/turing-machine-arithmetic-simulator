# AGENTS.md — Turing Machine Arithmetic Simulator

Read this file first. It is the entry point for any coding agent working on this project.

## 1. What you are building

A small, static web app that **animates three Turing Machines doing binary arithmetic**:

1. **Binary Increment** (single tape)
2. **Binary Addition** (three tapes, carry kept in the state)
3. **Binary Multiplication** (shift-and-add, calls the adder as a subroutine)

The visitor loads an input, presses **Step** or **Run**, and watches the tape, the read/write head, the current state and the active transition rule change in real time. It is a teaching and demo tool for a university group presentation ("From Tape to ALU: Arithmetic on Turing Machines", course Theory of Computation, FA2).

The visual reference is a screenshot of a retro "Turing Machine" explainer: red background, dark machine panel with `STATE:` and `RULES:` areas, a read/write head slot, and a tape strip with gears at both ends. Use it for **layout and mood only**. See `02-UI-SPEC.md` for what to reproduce and what must not be copied.

## 2. Read order

| Order | File | Purpose |
|---|---|---|
| 1 | `AGENTS.md` | This file: rules, stack, layout, commands |
| 2 | `01-SCOPE.md` | What is in and out. **Binding.** |
| 3 | `03-ENGINE-SPEC.md` | Data model, step semantics, engine API |
| 4 | `04-MACHINES.md` | The three machines, exact transition tables, test vectors |
| 5 | `02-UI-SPEC.md` | Layout, components, styling, interactions |
| 6 | `05-TASKS.md` | Ordered milestones with acceptance criteria. **Work through it in order.** |

## 3. Hard rules

1. **Stay inside `01-SCOPE.md`.** If a feature is not listed as MUST, SHOULD or COULD there, do not build it. If you think something is missing, write it in `NOTES.md` instead of building it.
2. **No frameworks, no bundler, no npm runtime dependencies.** Plain HTML, CSS and JavaScript (ES2019, no modules). The app must work by double-clicking `index.html` (`file://`) and by any static server. Dev tooling is limited to Node.js for running tests.
3. **Engine and UI are separate.** Files in `js/engine.js`, `js/machines.js`, `js/composite.js` must not touch the DOM. They must run under Node for tests.
4. **The machine tables in `04-MACHINES.md` are the source of truth.** They were verified with a reference simulation. Do not "improve" them. If a test fails, fix the code, not the table.
5. **Tests first for logic.** Milestones M1 and M2 are not done until `node tests/run.js` passes.
6. **No third-party brand assets.** No PBS, Crash Course or other logos, no copied artwork or screenshots in the repo. Draw everything in CSS or inline SVG. Fonts may come from Google Fonts with system fallbacks.
7. **Accessibility baseline.** Keyboard-operable controls, visible focus, `aria-live` status line, `prefers-reduced-motion` respected, text contrast at least 4.5:1 on panels.
8. **Keep it small.** Target under 1,500 lines of JS+CSS in total. Prefer clear code over clever code. Comment the *why*.
9. **When the docs are ambiguous**, pick the simplest option that satisfies the docs, and record the decision in `NOTES.md` (one line each). Do not stop to ask.

## 4. Tech stack

- HTML5, CSS3 (custom properties, grid, flex, `@keyframes`), vanilla JS.
- Fonts (with fallbacks): title `Bungee` → `Impact, sans-serif`; machine readouts `VT323` or `Press Start 2P` → `ui-monospace, monospace`; body `Inter` → `system-ui, sans-serif`.
- Tests: plain Node.js script, `node:assert`. No test framework.

## 5. Directory layout

```
tm-simulator/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── engine.js        # Runner for rule-table machines (multi-tape capable)
│   ├── machines.js      # Increment + Adder definitions, presets, validators
│   ├── composite.js     # Multiplier (phase machine that calls the adder)
│   ├── ui.js            # DOM rendering + controls
│   └── main.js          # Wiring, keyboard shortcuts, startup
├── tests/
│   └── run.js           # Node test runner (vectors + randomized checks)
├── NOTES.md             # Decisions and open questions (agent writes this)
└── README.md            # 10-line "how to run" (agent writes this at the end)
```

Every JS file is an IIFE that attaches to a shared global namespace and also exports for Node:

```js
(function (g) {
  var TM = (g.TM = g.TM || {});
  // ... define things on TM ...
  if (typeof module !== "undefined" && module.exports) module.exports = TM;
})(typeof globalThis !== "undefined" ? globalThis : this);
```

`index.html` loads scripts in this order: `engine.js`, `machines.js`, `composite.js`, `ui.js`, `main.js`.
`tests/run.js` starts with `global.TM = {}` and then `require`s the first three files.

## 6. Commands

```
node tests/run.js                 # run all logic tests
python3 -m http.server 8000       # optional: serve the folder, open http://localhost:8000
```

## 7. Definition of done (whole project)

- All milestones in `05-TASKS.md` are ticked.
- `node tests/run.js` exits 0.
- The manual checklist at the end of `05-TASKS.md` passes in a current Chrome and Firefox.
- The app loads with no console errors and no network requests other than optional font loading.

## 8. Glossary

- **Tape**: infinite row of cells, each holding one symbol (`0`, `1` or blank `B`). Cells are addressed by integer position (can be negative).
- **Head**: points at one cell per tape; reads it, writes it, then moves `L`, `R` or `S` (stay).
- **State**: the machine's single piece of internal memory (for the adder, the carry).
- **Rule / transition**: `(state, symbols read) → (symbols written, moves, next state)`.
- **Macro step**: one animated step of the multiplier that stands for a small sub-machine (copy, shift, next bit). Always labelled as a macro in the UI.
- **LSB / MSB**: least / most significant bit.
