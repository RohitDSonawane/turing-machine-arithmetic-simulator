# 03-ENGINE-SPEC.md — Engine specification

Applies to `js/engine.js` (generic runner), `js/machines.js` (definitions) and `js/composite.js` (multiplier). **No DOM access** in these files. Everything is deterministic.

## 1. Conventions

- Blank symbol is the string `"B"`. Binary symbols are `"0"` and `"1"`.
- A tape is a sparse object `cells: { [position: number]: symbol }`. A missing key means blank. Positions are integers and may be negative.
- Each tape has a head position (integer).
- Moves: `"L"` (position − 1), `"R"` (position + 1), `"S"` (stay).
- Writing `"B"` deletes the key.

## 2. Machine definition (rule machines)

A plain object, created in `machines.js`.

```js
{
  id: "increment",              // unique
  title: "Binary Increment",    // shown in subtitle
  kind: "rules",                // "rules" | "composite"
  blank: "B",
  tapeCount: 1,
  tapes: [ { id: "T1", label: "NUMBER", short: "T1" } ],
  states: [                     // display metadata for every state id
    { id: "q0", label: "SCAN RIGHT", desc: "Move to the right end of the number." },
    ...
  ],
  start: "q0",
  halt: ["qf"],
  rules: [
    { id: "r1", state: "q0", read: ["0"], write: ["0"], move: ["R"], next: "q0", note: "..." },
    ...
  ],
  inputs: [ { id: "x", label: "Binary number", maxLen: 12, placeholder: "1011" } ],
  presets: [ { label: "1011 + 1", values: { x: "1011" } } ],
  layout(values)   -> { tapes: [ { cells: {...}, head: 0 } ] },   // initial tapes
  readResult(view) -> string,            // raw output bits from final tapes
  expected(values) -> { text: "11 + 1 = 12", bits: "1100" },      // normalised expected bits + explanation
  hardware(view)   -> object|null        // optional data for the hardware card
}
```

Rules must be **complete**: for every reachable `(state, symbols read)` pair there is exactly one rule. Rules are listed in a stable, human-friendly order (grouped by state). Rule ids are unique within the machine.

## 3. Runner API (`TM.createRunner`)

```js
const runner = TM.createRunner(machine, values);  // values = { x: "1011" } etc.
runner.view()      // current View (see §4)
runner.step()      // advance one step, returns new View
runner.stepBack()  // undo one step, returns View (no-op at step 0)
runner.reset()     // back to the initial layout, returns View
runner.runToEnd(limit = 5000) // advance until not "ready", returns View
```

`createRunner` dispatches on `machine.kind`: `"rules"` uses the generic engine in `engine.js`; `"composite"` uses the phase machine from `composite.js` (§6). Both return objects with the same API, so the UI never cares which one it has.

### 3.1 Step semantics (rules machines)

```
if status !== "ready": return view unchanged
read   = tapes.map(t => t.cells[t.head] ?? "B")
rule   = machine.rules.find(r => r.state === state && r.read equals read)
if no rule: status = "stuck"; message set; return
push snapshot to history
for each tape i: write rule.write[i] at head; then head += move(rule.move[i])
state = rule.next; steps += 1
if machine.halt includes state: status = "halted"
if steps >= LIMIT (5000) and status === "ready": status = "limit"
```

Reading `view.nextRuleId` must **not** run the step: the runner computes the matching rule for the current configuration after each step (and at init) and stores it.

### 3.2 History

`history` is an array of snapshots (deep copies of tapes, heads, state, steps, status, lastFired, lastNote, and for composite machines the phase data). `stepBack()` pops one. Cap at 6,000 entries (never reached because of the step limit).

## 4. View object (what the UI renders)

```js
{
  machineId: "addition",
  step: 3,                                  // steps executed so far
  status: "ready" | "halted" | "stuck" | "limit",
  state: { id: "c1", label: "CARRY 1", sub: null },   // sub: extra text for composite (e.g. phase)
  tapes: [ { id: "T1", label: "A", short: "T1", cells: {...copy...}, head: -2 } , ... ],
  reading: ["1","0","B"],                   // symbols under the heads now
  nextRuleId: "c1|10",                      // rule that will fire next, or null (halted, stuck, or macro)
  nextMacro: null | { id: "COPY", label: "COPY T → A", desc: "..." },
  lastFired: null | { kind: "rule"|"macro", ruleId, macroId, from: "c0", to: "c1",
                      read: [...], write: [...], move: [...], note: "..." },
  nextNote: "Reads ...",                    // plain-English sentence for the explain bar (Next)
  lastNote: "Wrote 0 ...",                  // plain-English sentence for the last step
  phase: null | { id: "ADD", skipped: ["ADD"], bit: "1" },   // composite only
  subMachineId: null | "addition",          // composite only: which rule table to show
  message: null | "No rule for (c0, B,B,X)"
}
```

Views are immutable snapshots: return copies of `cells`, so the UI can diff against the previous view to animate writes and moves.

The UI derives movement from `lastFired.move` and writes from comparing `cells`.

## 5. Results and verification

`readResult(view)` returns the raw output bits string (see `04-MACHINES.md` for which tape and how). `normalise(bits)` strips leading zeros but keeps at least one digit (`"0010"` → `"10"`, `"000"` → `"0"`). The UI shows both.

`expected(values)` computes the expected numeric result with `BigInt` (so there is no precision issue), returns `{ bits, text }`. Verification is **numeric**: `BigInt("0b" + normalise(output)) === BigInt("0b" + expected.bits)`.

## 6. Composite machine (multiplier) — `js/composite.js`

`TM.machines.multiplication` has `kind: "composite"` and no `rules` of its own. It holds a reference to the adder definition (`subMachine: TM.machines.addition`) and four tapes.

### 6.1 Tapes and layout

| Index | id | Label | Initial content |
|---|---|---|---|
| 0 | `M` | M (multiplicand) | M's bits, LSB at column 0 (i.e. cells −(len−1) … 0) |
| 1 | `N` | N (multiplier) | N's bits, LSB at column 0 |
| 2 | `A` | A (accumulator) | the single symbol `0` at column 0 |
| 3 | `T` | T (temp result) | empty |

All heads start at column 0. The N head will walk left, one cell per iteration.

### 6.2 Phases (each phase transition is one step)

```
READ   : s = N[headN]
           s == "B"  -> halt (status "halted"), phase DONE
           s == "1"  -> phase = ADD  (initialise adder run, see below)
           s == "0"  -> phase = SHIFT (ADD skipped)
ADD    : advance the adder sub-machine by ONE real transition per step.
         When the adder reaches its halt state -> phase = COPY
COPY   : A := contents of T (right-aligned so its LSB is at column 0); T := empty
         heads of A, M, T reset to column 0 -> phase = SHIFT
SHIFT  : M := M + "0" (append a zero on the right; digits move one column left,
         LSB stays at column 0) -> phase = NEXT
NEXT   : headN := headN - 1 -> phase = READ
```

READ, COPY, SHIFT, NEXT are **macros**: one animated step each, with `lastFired.kind = "macro"` and a note. ADD steps are real adder rules (`lastFired.kind = "rule"`, `ruleId` from the adder's table).

### 6.3 Running the adder as a subroutine

When entering ADD, create an inner configuration for the adder with this tape mapping:

| Adder tape | Multiplier tape |
|---|---|
| Tape 1 (input A) | A (index 2) |
| Tape 2 (input B) | M (index 0) |
| Tape 3 (result) | T (index 3) |

Head columns: all three at column 0 (so columns line up). Inner state starts at the adder's `start`. Each ADD step applies one adder rule to the mapped tapes. The multiplier's view shows `state.label` = `ADD`, `state.sub` = the adder state label (for example `CARRY 1`), and `subMachineId = "addition"`, so the UI shows the adder's rule table with the `SUBROUTINE: ADD` chip.

### 6.4 Notes for each macro (use these sentences)

- READ: `Look at the multiplier bit under the head: <bit>.` + (`It is 1, so add M to A.` | `It is 0, so skip the addition.` | `No more bits: multiplication is finished.`)
- COPY: `Copy the sum from T back into the accumulator A.`
- SHIFT: `Shift M one place left by appending a 0.`
- NEXT: `Move to the next multiplier bit on the left.`

### 6.5 Step counting

Every phase transition counts as one step, including the final `READ` that sees blank and halts. Reference value: `101 × 11` takes **18** steps (8 for the first bit, 9 for the second, 1 final READ).

### 6.6 Result

Result is the content of tape A read left to right (strip blanks). Verify numerically against `BigInt(m) * BigInt(n)`.

## 7. Plain-English notes

Every rule has a `note`, and `nextNote` / `lastNote` are built from it. Notes are written once in `machines.js`:

- Hand-written for the increment rules.
- Generated for the adder with a helper (see `04-MACHINES.md` §3 for the exact templates).

`nextNote` prefix: nothing. `lastNote` prefix: `Did: `. Keep sentences under 140 characters.

## 8. Error handling

- Unknown rule, malformed machine definition, bad inputs passed to `createRunner`: throw `Error` with a clear message. The UI catches and shows it in the result banner.
- The engine never loops forever: `runToEnd` and Run both respect `LIMIT = 5000`.

## 9. Test hooks

`tests/run.js` must be able to run any machine headlessly:

```js
const r = TM.createRunner(TM.machines.addition, { a: "1011", b: "0110" });
const v = r.runToEnd();
assert.equal(v.status, "halted");
assert.equal(TM.machines.addition.readResult(v), "10001");
assert.equal(v.step, 5);
```
