# 04-MACHINES.md — The three machines (source of truth)

All tables below were checked with a reference simulation (exhaustive for increment up to 63 plus 255 and 1023, 500 random pairs for the adder, 300 random pairs for the multiplier). Implement them exactly.

Conventions: `B` is blank. `L`, `R`, `S` are left, right, stay. A rule reads `state, symbols read → symbols written, moves, next state`.

---

## 1. Machine 1: Binary Increment (single tape)

**Idea:** go to the right end, then walk left turning trailing 1s into 0s until you see a 0 (turn it into 1) or run off the left end (write a new leading 1).

- Tape: one tape, label `NUMBER`, short `T1`.
- Layout: input bits at columns `0 … n−1` (MSB at column 0), head at column 0.
- Start state `q0`. Halt state `qf`.
- Result: contents of the tape from the leftmost non-blank cell to the rightmost, as a string.

### States

| id | Display label | Meaning |
|---|---|---|
| `q0` | `SCAN RIGHT` | Move right to the end of the number |
| `q1` | `CARRY LEFT` | Walk left carrying the +1 |
| `qf` | `HALT` | Done |

### Rules

| id | State | Read | Write | Move | Next | Note (use this text) |
|---|---|---|---|---|---|---|
| `inc-1` | q0 | 0 | 0 | R | q0 | `Reads 0 while scanning right. Leaves it and moves right.` |
| `inc-2` | q0 | 1 | 1 | R | q0 | `Reads 1 while scanning right. Leaves it and moves right.` |
| `inc-3` | q0 | B | B | L | q1 | `Reached the end of the number. Turn around and start adding 1 from the last bit.` |
| `inc-4` | q1 | 1 | 0 | L | q1 | `Reads 1: 1 + 1 = 0 with a carry. Write 0, carry on to the left.` |
| `inc-5` | q1 | 0 | 1 | S | qf | `Reads 0: 0 + 1 = 1, no carry left. Write 1 and halt.` |
| `inc-6` | q1 | B | 1 | S | qf | `Ran past the front: every bit was 1. Write a new leading 1 and halt.` |

Step count for an input of `n` bits with `k` trailing 1s: `n + k + 2`.

### Vectors

| Input | Output (raw) | Steps |
|---|---|---|
| `0` | `1` | 3 |
| `1` | `10` | 4 |
| `1011` | `1100` | 8 |
| `111` | `1000` | 8 |
| `1111` | `10000` | 10 |
| `1000` | `1001` | 6 |
| `0111` | `1000` | 9 |
| `001` | `010` | 6 |

(`001` keeps its leading zeros: raw `010`, normalised `10`.)

---

## 2. Machine 2: Binary Addition (three tapes, carry in the state)

**Idea:** process both numbers from the right. At each step read one bit from each, add the carry, write the sum bit on tape 3, and remember the new carry in the state. All three heads move left together. When both numbers have ended, write a final carry (if any) and halt.

- Tapes: `T1` label `A`, `T2` label `B`, `T3` label `RESULT`.
- Layout (all **LSB at column 0**, so columns line up):
  - `A` occupies columns `−(n−1) … 0`, MSB leftmost.
  - `B` occupies columns `−(m−1) … 0`.
  - `RESULT` empty, head at column 0.
  - All three heads at column 0.
- Start state `c0`. Halt state `qf`.
- Blank counts as 0 for the shorter number.
- Result: tape 3 read from its leftmost non-blank cell to its rightmost (the result is written right to left, so it ends up in normal order).

### States

| id | Display label | Meaning |
|---|---|---|
| `c0` | `CARRY 0` | No carry into the next column |
| `c1` | `CARRY 1` | Carry 1 into the next column |
| `qf` | `HALT` | Done |

### Rules (18)

Let `a` be the symbol on tape 1, `b` on tape 2. Tape 3 always reads `B` when a rule is applied. `av`, `bv` = 0 if the symbol is `B`, else its numeric value. For each carry state `c ∈ {0, 1}`, for each `a ∈ {0, 1, B}` and each `b ∈ {0, 1, B}` (9 combinations per state):

**Case 1: both numbers finished (`a = B` and `b = B`)**

| Rule | Write (T1, T2, T3) | Moves | Next |
|---|---|---|---|
| state `c0` | `B, B, B` | `S, S, S` | `qf` |
| state `c1` | `B, B, 1` | `S, S, S` | `qf` |

**Case 2: at least one number still has a bit**

```
s    = av + bv + c
write = (a, b, String(s % 2))     // tapes 1 and 2 are rewritten unchanged
move  = (L, L, L)
next  = "c" + String(Math.floor(s / 2))
```

Rule id format: `"c" + c + "|" + a + b`, for example `c1|10` (carry state c1, a=1, b=0). Order rules by `c` (0 then 1), then `a` in order `0, 1, B`, then `b` in order `0, 1, B`. Read vector is `[a, b, "B"]`.

### Notes (generated, exact templates)

- Case 2 with both symbols numeric: `Reads a=<a>, b=<b>, carry <c>. Sum is <s>: write <s%2>, carry <floor(s/2)>, move all heads left.`
- Case 2 where one number has ended (`a` or `b` is `B`): `Reads a=<a>, b=<b>, carry <c>. A finished number counts as 0. Sum is <s>: write <s%2>, carry <floor(s/2)>, move all heads left.` In this sentence print the word `none` instead of `B`.
- Case 1, `c0`: `Both numbers are finished and there is no carry. Halt.`
- Case 1, `c1`: `Both numbers are finished but a carry of 1 is left. Write it as the new leading bit and halt.`

### Step count

`max(n, m) + 1`, for any inputs (the last step is always the halting rule).

### Vectors

| A | B | Output (raw) | Steps | Decimal check |
|---|---|---|---|---|
| `1011` | `0110` | `10001` | 5 | 11 + 6 = 17 |
| `1` | `1` | `10` | 2 | 1 + 1 = 2 |
| `111` | `1` | `1000` | 4 | 7 + 1 = 8 |
| `0` | `0` | `0` | 2 | 0 + 0 = 0 |
| `101` | `11111` | `100100` | 6 | 5 + 31 = 36 |
| `1111` | `1111` | `11110` | 5 | 15 + 15 = 30 |

If both inputs have leading zeros the output keeps the leading zeros. Always verify numerically.

---

## 3. Machine 3: Binary Multiplication (composite, shift-and-add)

Defined in `03-ENGINE-SPEC.md` §6 (phases READ, ADD, COPY, SHIFT, NEXT). Summary:

```
A = 0
for each bit of N from the least significant bit:
    if bit == 1: A = A + M    (adder machine, real transitions)
    M = M shifted left by one place (append 0)
result = A
```

- Tapes: `M`, `N`, `A`, `T` as in the engine spec.
- Inputs: `m` (multiplicand), `n` (multiplier), each at most 6 bits.
- Macro phases are labelled `MACRO`.

### Phase descriptions (display)

| id | Display | Description |
|---|---|---|
| `READ` | `READ N BIT` | Look at the multiplier bit under the head |
| `ADD` | `ADD` | Run the adder: A + M → T |
| `COPY` | `COPY T → A` | Move the sum from T back to A |
| `SHIFT` | `SHIFT M LEFT` | Append a 0 to M |
| `NEXT` | `NEXT BIT` | Move the N head one place left |
| `DONE` | `HALT` | Finished |

### Vectors

| M | N | Output | Notes |
|---|---|---|---|
| `101` | `11` | `1111` | Slide example. 5 × 3 = 15. **18 steps.** |
| `101` | `101` | `11001` | Includes a 0 bit (skips ADD once). 5 × 5 = 25 |
| `110` | `101` | `11110` | 6 × 5 = 30 |
| `11` | `0` | `0` | Multiplier 0: A stays 0 |
| `0` | `11` | `0` | Multiplicand 0 |
| `1` | `1` | `1` | 1 × 1 = 1 |
| `111111` | `111111` | `111110000001` | Max size: 63 × 63 = 3969 |

For outputs, strip leading zeros before comparing with the table (the raw tape may carry leading zeros).

---

## 4. Presets for the UI

| Machine | Preset label | Values |
|---|---|---|
| Increment | `1011 + 1` | `x = 1011` |
| Increment | `111 + 1 (all ones)` | `x = 111` |
| Increment | `0111 + 1` | `x = 0111` |
| Addition | `1011 + 0110` | `a = 1011, b = 0110` |
| Addition | `111 + 1 (carry chain)` | `a = 111, b = 1` |
| Addition | `101 + 11111 (different lengths)` | `a = 101, b = 11111` |
| Multiplication | `101 × 11` | `m = 101, n = 11` |
| Multiplication | `101 × 101 (has a 0 bit)` | `m = 101, n = 101` |
| Multiplication | `110 × 101` | `m = 110, n = 101` |

Default on load: Increment, `1011`.

---

## 5. Where this differs from the slides (keep these corrections)

These are intentional fixes of drawing problems in the presentation, so the simulator and the diagrams will agree once the slides are updated:

1. **Increment:** while scanning right the machine **stays in `q0`** on both `0` and `1`. It moves to the carry state only when it reads blank. There is no separate `q3`; the all-ones case is handled by the rule `q1, B → 1`.
2. **Adder:** the carry states have **self-loops**: `c0` stays in `c0` when the sum is below 2, and `c1` stays in `c1` when the sum is 2 or 3. Transitions between `c0` and `c1` happen only when the carry changes.
3. **Adder start:** heads start at the right end of both numbers, and a blank on the shorter number counts as 0.
