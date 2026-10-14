# 🕹️ Turing Machine Arithmetic Simulator: From Tape to ALU

An interactive, retro-arcade styled educational simulator that animates Turing Machines executing binary arithmetic. Designed to bridge the gap between theoretical automata and real-world computer architecture, demonstrating how the fundamental operations of a CPU Arithmetic Logic Unit (ALU) emerge directly from Turing Machine transitions.

---

## Highlights

- **Pure Web Technologies**: Vanilla HTML5, CSS3, and JavaScript (ES2019). No frameworks, no bundlers, no build steps, and zero runtime dependencies.
- **Works 100% Offline**: Open `index.html` directly in any browser via `file://`.
- **Interactive Retro Arcade Aesthetic**: Dark slate chassis, corner rivets, illuminated status lamps (`STEP`, `LEFT`, `RIGHT`), dynamic read/write tape head assembly, rotating mechanical gears, and custom slimline arcade scrollbars.
- **ALU Hardware Connection**: Live 1-bit full adder truth table card highlighting the exact electronic circuit equivalent for every computational step.
- **Plain-English Explanations**: Real-time explain bar detailing what symbol is read, what is written, which way the heads move, and why the next state is selected.
- **Subroutine Composition**: Demonstrates higher-order automata by executing the 3-tape adder as a callable subroutine inside the shift-and-add multiplier.

---

## Machines Implemented

| Machine | Tapes | Algorithm & Concept | Hardware Link |
|---|---|---|---|
| **Binary Increment** | 1 Tape (`NUMBER`) | Scans right to LSB, walks left flipping trailing `1`s to `0` until a `0` or blank is encountered. | Chain of half-adders (program counter / counter circuits). |
| **Binary Addition** | 3 Tapes (`A`, `B`, `RESULT`) | Aligns operands at column 0. Evaluates sum column-by-column moving left, storing the carry directly in the automaton state (`c0` / `c1`). | 1-bit full adder truth table and ALU carry wire. |
| **Binary Multiplication** | 4 Tapes (`M`, `N`, `A`, `T`) | Shift-and-add algorithm using phases (`READ` → `ADD` → `COPY` → `SHIFT` → `NEXT`). Calls the 3-tape adder as an internal subroutine. | Multiplier accumulator and barrel shifter logic. |

---

## How to Run

### 1. Direct Browser Access (Recommended)
Double-click `index.html` or open it directly in Google Chrome, Mozilla Firefox, Microsoft Edge, or Safari:
```bash
# Terminal launch commands
start index.html       # Windows
open index.html        # macOS
xdg-open index.html    # Linux
```

### 2. Local HTTP Server (Optional)
```bash
python -m http.server 8000
# Then open: http://localhost:8000
```

### 3. Deploy to GitHub Pages (One-Click)
1. Go to repository **Settings** → **Pages**.
2. Under **Branch**, select `main` and root folder `/ (root)`.
3. Click **Save**. The simulator will be live immediately with no build pipeline required.

---

## Running the Test Suite

The simulator includes a deterministic test suite containing 14 test groups and over 1,500 assertions (covering exact slide vectors, exhaustive checks up to 1023, and randomized multi-digit property tests):

```bash
node tests/run.js
```

Sample output:
```text
Running Turing Machine simulator test suite...

  ✓ M0: Environment and namespaces initialized
  ✓ M1: Tape helpers getCell, setCell, stringToCells, normalise
  ✓ M1: Toy machine step and stepBack round-trip
  ✓ M1: Stuck detection with incomplete toy machine
  ✓ M1: Step limit guard (5000) on looping machine
  ✓ M2: Increment machine spec vectors & step counts
  ✓ M2: Increment machine exhaustive test 0..1023
  ✓ M2: Addition machine rule table completeness & uniqueness
  ✓ M2: Addition machine spec vectors & step counts
  ✓ M2: Addition machine 200 random pairs (0..300) with leading zeros
  ✓ M5: Multiplication slide example 101 × 11 takes exactly 18 steps
  ✓ M5: Multiplication spec vectors from 04-MACHINES.md §3
  ✓ M5: Multiplication history round-trip across macro and ADD steps
  ✓ M5: Multiplication 300 random pairs (0..63)

Tests completed: 14 passed, 0 failed.
```

---

## Keyboard Controls

| Key | Action |
|---|---|
| `Space` | Run / Pause simulation |
| `→` (Right Arrow) | Step forward one transition |
| `←` (Left Arrow) | Step backward one transition (history undo) |
| `R` or `r` | Reset to initial tape input |

*(Keyboard shortcuts are automatically suppressed while focus is inside an input field).*

---

## Repository Structure

```text
.
├── index.html          # Semantic HTML5 chassis and component structure
├── css/
│   └── styles.css      # Retro arcade design system, animations, responsive layout
├── js/
│   ├── engine.js       # Generic deterministic multi-tape Turing machine engine
│   ├── machines.js     # Increment & Addition specifications, rule generators
│   ├── composite.js    # Multiplier composite machine delegating to the adder
│   ├── ui.js           # Pure DOM view rendering, tape sliding, and lamp pulses
│   └── main.js         # Event wiring, keyboard controls, presets, playback loop
├── tests/
│   └── run.js          # Standalone Node test runner (zero external packages)
├── Documents/          # Original architecture, specifications, and course rubrics
├── NOTES.md            # Architectural log and design decisions
├── LICENSE             # MIT License
└── README.md           # Project overview and documentation
```

---

## Academic Context

Developed for **Theory of Computation (TOC)** — *Topic: "From Tape to ALU: Arithmetic on Turing Machines"*. Designed as a live presentation and demonstration tool to visually prove that foundational computer arithmetic can be rigorously executed on deterministic Turing machines.

## License

This project is open-source and available under the [MIT License](LICENSE).
