// tests/run.js - Test runner for Turing Machine arithmetic simulator
const assert = require("node:assert");

global.TM = {};
require("../js/engine.js");
require("../js/machines.js");
require("../js/composite.js");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(err);
    failures.push({ name, err });
  }
}

console.log("Running Turing Machine simulator test suite...\n");

// ==========================================
// M0 Tests
// ==========================================
test("M0: Environment and namespaces initialized", () => {
  assert.ok(global.TM, "TM namespace exists");
  assert.ok(global.TM.createRunner, "TM.createRunner exists");
  assert.ok(global.TM.normalise, "TM.normalise exists");
  assert.ok(global.TM.machines.increment, "increment machine exists");
  assert.ok(global.TM.machines.addition, "addition machine exists");
  assert.ok(global.TM.machines.multiplication, "multiplication machine exists");
});

// ==========================================
// M1 Engine Core Tests
// ==========================================
test("M1: Tape helpers getCell, setCell, stringToCells, normalise", () => {
  const cells = TM.stringToCells("1011", 0);
  assert.strictEqual(TM.getCell(cells, 0), "1");
  assert.strictEqual(TM.getCell(cells, 1), "0");
  assert.strictEqual(TM.getCell(cells, 2), "1");
  assert.strictEqual(TM.getCell(cells, 3), "1");
  assert.strictEqual(TM.getCell(cells, 4), "B");
  assert.strictEqual(TM.getCell(cells, -1), "B");

  TM.setCell(cells, 4, "0");
  assert.strictEqual(TM.getCell(cells, 4), "0");
  TM.setCell(cells, 4, "B");
  assert.strictEqual(TM.getCell(cells, 4), "B");
  assert.strictEqual(cells[4], undefined, "B deletes cell key");

  assert.strictEqual(TM.normalise("00101"), "101");
  assert.strictEqual(TM.normalise("000"), "0");
  assert.strictEqual(TM.normalise(""), "0");
  assert.strictEqual(TM.normalise("1100"), "1100");
});

test("M1: Toy machine step and stepBack round-trip", () => {
  const toyMachine = {
    id: "toy",
    kind: "rules",
    tapeCount: 1,
    tapes: [{ id: "T1", label: "TAPE 1", short: "T1" }],
    states: [
      { id: "q0", label: "STATE 0" },
      { id: "q1", label: "STATE 1" },
      { id: "qf", label: "HALT" }
    ],
    start: "q0",
    halt: ["qf"],
    rules: [
      { id: "r1", state: "q0", read: ["1"], write: ["0"], move: ["R"], next: "q1", note: "Flip 1 to 0 and move R" },
      { id: "r2", state: "q1", read: ["0"], write: ["1"], move: ["R"], next: "qf", note: "Flip 0 to 1 and halt" }
    ],
    layout: () => ({ tapes: [{ cells: { 0: "1", 1: "0" }, head: 0 } ] })
  };

  const runner = TM.createRunner(toyMachine);
  const initialView = runner.view();
  assert.strictEqual(initialView.step, 0);
  assert.strictEqual(initialView.status, "ready");
  assert.strictEqual(initialView.state.id, "q0");
  assert.strictEqual(initialView.reading[0], "1");
  assert.strictEqual(initialView.nextRuleId, "r1");

  const v1 = runner.step();
  assert.strictEqual(v1.step, 1);
  assert.strictEqual(v1.state.id, "q1");
  assert.strictEqual(v1.tapes[0].head, 1);
  assert.strictEqual(v1.tapes[0].cells[0], "0");
  assert.strictEqual(v1.reading[0], "0");
  assert.strictEqual(v1.nextRuleId, "r2");

  const v2 = runner.step();
  assert.strictEqual(v2.step, 2);
  assert.strictEqual(v2.status, "halted");
  assert.strictEqual(v2.state.id, "qf");
  assert.strictEqual(v2.tapes[0].head, 2);
  assert.strictEqual(v2.tapes[0].cells[1], "1");
  assert.strictEqual(v2.nextRuleId, null);

  const v3 = runner.step();
  assert.strictEqual(v3.step, 2);

  const b1 = runner.stepBack();
  assert.strictEqual(b1.step, 1);
  assert.strictEqual(b1.state.id, "q1");
  assert.strictEqual(b1.status, "ready");
  assert.strictEqual(b1.tapes[0].head, 1);
  assert.strictEqual(b1.reading[0], "0");
  assert.strictEqual(b1.nextRuleId, "r2");

  const b0 = runner.stepBack();
  assert.strictEqual(b0.step, 0);
  assert.strictEqual(b0.state.id, "q0");
  assert.strictEqual(b0.status, "ready");
  assert.strictEqual(b0.tapes[0].head, 0);
  assert.strictEqual(b0.reading[0], "1");
  assert.strictEqual(b0.nextRuleId, "r1");
  assert.deepStrictEqual(b0.tapes[0].cells, initialView.tapes[0].cells);
});

test("M1: Stuck detection with incomplete toy machine", () => {
  const incompleteMachine = {
    id: "incomplete",
    kind: "rules",
    tapeCount: 1,
    states: [{ id: "q0", label: "START" }, { id: "qf", label: "HALT" }],
    start: "q0",
    halt: ["qf"],
    rules: [
      { id: "r1", state: "q0", read: ["0"], write: ["1"], move: ["S"], next: "qf", note: "done" }
    ],
    layout: () => ({ tapes: [{ cells: { 0: "1" }, head: 0 }] })
  };

  const runner = TM.createRunner(incompleteMachine);
  assert.strictEqual(runner.view().nextRuleId, null);
  const v = runner.step();
  assert.strictEqual(v.status, "stuck");
  assert.ok(v.message && v.message.includes("No rule matches"));
  assert.strictEqual(v.step, 0);
});

test("M1: Step limit guard (5000) on looping machine", () => {
  const loopMachine = {
    id: "loop",
    kind: "rules",
    tapeCount: 1,
    states: [{ id: "q0", label: "LOOP" }],
    start: "q0",
    halt: ["qf"],
    rules: [
      { id: "r_loop", state: "q0", read: ["B"], write: ["B"], move: ["R"], next: "q0", note: "infinite loop" }
    ],
    layout: () => ({ tapes: [{ cells: {}, head: 0 }] })
  };

  const runner = TM.createRunner(loopMachine);
  const v = runner.runToEnd(5000);
  assert.strictEqual(v.status, "limit");
  assert.strictEqual(v.step, 5000);
  assert.ok(v.message && v.message.includes("5000 steps"));
});

// ==========================================
// M2 Increment and Addition Machines Tests
// ==========================================
test("M2: Increment machine spec vectors & step counts", () => {
  const incVectors = [
    { in: "0", out: "1", steps: 3 },
    { in: "1", out: "10", steps: 4 },
    { in: "1011", out: "1100", steps: 8 },
    { in: "111", out: "1000", steps: 8 },
    { in: "1111", out: "10000", steps: 10 },
    { in: "1000", out: "1001", steps: 6 },
    { in: "0111", out: "1000", steps: 9 },
    { in: "001", out: "010", steps: 6 }
  ];

  for (const vec of incVectors) {
    const runner = TM.createRunner(TM.machines.increment, { x: vec.in });
    const view = runner.runToEnd();
    assert.strictEqual(view.status, "halted", `Increment ${vec.in} halted`);
    const rawResult = TM.machines.increment.readResult(view);
    assert.strictEqual(rawResult, vec.out, `Increment ${vec.in} raw output`);
    assert.strictEqual(view.step, vec.steps, `Increment ${vec.in} step count`);

    const ver = TM.verifyResult(TM.machines.increment, view, { x: vec.in });
    assert.ok(ver.ok, `Increment ${vec.in} verification passed`);
  }
});

test("M2: Increment machine exhaustive test 0..1023", () => {
  for (let n = 0; n <= 1023; n++) {
    const bin = n.toString(2);
    const runner = TM.createRunner(TM.machines.increment, { x: bin });
    const view = runner.runToEnd();
    assert.strictEqual(view.status, "halted");
    const rawResult = TM.machines.increment.readResult(view);
    const expected = (n + 1).toString(2);
    assert.strictEqual(TM.normalise(rawResult), expected, `Increment ${bin}`);
  }
});

test("M2: Addition machine rule table completeness & uniqueness", () => {
  const rules = TM.machines.addition.rules;
  assert.strictEqual(rules.length, 18, "Addition has exactly 18 rules");

  const idSet = new Set();
  const pairSet = new Set();

  for (const r of rules) {
    assert.ok(!idSet.has(r.id), `Duplicate rule id ${r.id}`);
    idSet.add(r.id);

    const key = `${r.state}|${r.read.join(",")}`;
    assert.ok(!pairSet.has(key), `Duplicate (state, read) pair ${key}`);
    pairSet.add(key);

    assert.ok(r.note && r.note.length > 0, `Rule ${r.id} has note`);
  }
});

test("M2: Addition machine spec vectors & step counts", () => {
  const addVectors = [
    { a: "1011", b: "0110", out: "10001", steps: 5 },
    { a: "1", b: "1", out: "10", steps: 2 },
    { a: "111", b: "1", out: "1000", steps: 4 },
    { a: "0", b: "0", out: "0", steps: 2 },
    { a: "101", b: "11111", out: "100100", steps: 6 },
    { a: "1111", b: "1111", out: "11110", steps: 5 }
  ];

  for (const vec of addVectors) {
    const runner = TM.createRunner(TM.machines.addition, { a: vec.a, b: vec.b });
    const view = runner.runToEnd();
    assert.strictEqual(view.status, "halted", `Addition ${vec.a} + ${vec.b} halted`);
    const rawResult = TM.machines.addition.readResult(view);
    assert.strictEqual(rawResult, vec.out, `Addition ${vec.a} + ${vec.b} raw output`);
    assert.strictEqual(view.step, vec.steps, `Addition ${vec.a} + ${vec.b} step count`);

    const ver = TM.verifyResult(TM.machines.addition, view, { a: vec.a, b: vec.b });
    assert.ok(ver.ok, `Addition ${vec.a} + ${vec.b} verification passed`);
  }
});

test("M2: Addition machine 200 random pairs (0..300) with leading zeros", () => {
  for (let i = 0; i < 200; i++) {
    const na = Math.floor(Math.random() * 301);
    const nb = Math.floor(Math.random() * 301);
    let sa = na.toString(2);
    let sb = nb.toString(2);

    if (Math.random() < 0.3) sa = "0" + sa;
    if (Math.random() < 0.3) sb = "00" + sb;

    const runner = TM.createRunner(TM.machines.addition, { a: sa, b: sb });
    const view = runner.runToEnd();
    assert.strictEqual(view.status, "halted");

    const expectedSum = (BigInt(na) + BigInt(nb)).toString(2);
    const rawResult = TM.machines.addition.readResult(view);
    assert.strictEqual(TM.normalise(rawResult), expectedSum, `Addition ${sa} + ${sb}`);
    const expectedSteps = Math.max(sa.length, sb.length) + 1;
    assert.strictEqual(view.step, expectedSteps, `Addition ${sa} + ${sb} step count`);
  }
});

// ==========================================
// M5 Multiplication Machine Tests
// ==========================================
test("M5: Multiplication slide example 101 × 11 takes exactly 18 steps", () => {
  const runner = TM.createRunner(TM.machines.multiplication, { m: "101", n: "11" });
  const view = runner.runToEnd();
  assert.strictEqual(view.status, "halted");
  const rawResult = TM.machines.multiplication.readResult(view);
  assert.strictEqual(TM.normalise(rawResult), "1111", "5 × 3 = 15 ('1111')");
  assert.strictEqual(view.step, 18, "Takes exactly 18 steps");

  const ver = TM.verifyResult(TM.machines.multiplication, view, { m: "101", n: "11" });
  assert.ok(ver.ok, "Numeric verification passed");
});

test("M5: Multiplication spec vectors from 04-MACHINES.md §3", () => {
  const multVectors = [
    { m: "101", n: "11", out: "1111" },
    { m: "101", n: "101", out: "11001" },
    { m: "110", n: "101", out: "11110" },
    { m: "11", n: "0", out: "0" },
    { m: "0", n: "11", out: "0" },
    { m: "1", n: "1", out: "1" },
    { m: "111111", n: "111111", out: "111110000001" }
  ];

  for (const vec of multVectors) {
    const runner = TM.createRunner(TM.machines.multiplication, { m: vec.m, n: vec.n });
    const view = runner.runToEnd();
    assert.strictEqual(view.status, "halted", `Mult ${vec.m} × ${vec.n} halted`);
    const rawResult = TM.machines.multiplication.readResult(view);
    assert.strictEqual(TM.normalise(rawResult), vec.out, `Mult ${vec.m} × ${vec.n} result`);

    const ver = TM.verifyResult(TM.machines.multiplication, view, { m: vec.m, n: vec.n });
    assert.ok(ver.ok, `Mult ${vec.m} × ${vec.n} verification passed`);
  }
});

test("M5: Multiplication history round-trip across macro and ADD steps", () => {
  const runner = TM.createRunner(TM.machines.multiplication, { m: "101", n: "11" });
  const views = [runner.view()];

  // Step forward 10 steps
  for (let i = 0; i < 10; i++) {
    views.push(runner.step());
  }
  assert.strictEqual(runner.view().step, 10);

  // Step back 10 steps
  for (let i = 9; i >= 0; i--) {
    const backView = runner.stepBack();
    assert.strictEqual(backView.step, i, `Step back to ${i}`);
    assert.strictEqual(backView.phase.id, views[i].phase.id, `Phase at step ${i}`);
    assert.strictEqual(backView.status, views[i].status, `Status at step ${i}`);
  }
  assert.strictEqual(runner.view().step, 0);
});

test("M5: Multiplication 300 random pairs (0..63)", () => {
  for (let i = 0; i < 300; i++) {
    const nm = Math.floor(Math.random() * 64);
    const nn = Math.floor(Math.random() * 64);
    const sm = nm.toString(2);
    const sn = nn.toString(2);

    const runner = TM.createRunner(TM.machines.multiplication, { m: sm, n: sn });
    const view = runner.runToEnd();
    assert.strictEqual(view.status, "halted", `Mult ${sm} × ${sn} halted`);

    const expectedProd = (BigInt(nm) * BigInt(nn)).toString(2);
    const rawResult = TM.machines.multiplication.readResult(view);
    assert.strictEqual(TM.normalise(rawResult), expectedProd, `Mult ${sm} × ${sn} output`);
  }
});

console.log(`\nTests completed: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
