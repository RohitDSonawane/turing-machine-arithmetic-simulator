(function (g) {
  var TM = (g.TM = g.TM || {});
  TM.machines = TM.machines || {};

  var STEP_LIMIT = 5000;
  var MAX_HISTORY = 6000;

  // Helper to read non-blank span
  function readTapeSpan(cells) {
    if (!cells) return "0";
    var keys = Object.keys(cells).map(Number);
    if (keys.length === 0) return "0";
    var min = Math.min.apply(null, keys);
    var max = Math.max.apply(null, keys);
    var str = "";
    for (var i = min; i <= max; i++) {
      var val = cells[i];
      str += (val === undefined || val === null || val === "B") ? "B" : val;
    }
    return str === "" ? "0" : str;
  }

  // Multiplier Machine Definition
  TM.machines.multiplication = {
    id: "multiplication",
    title: "Binary Multiplication",
    kind: "composite",
    tapeCount: 4,
    tapes: [
      { id: "M", label: "M (multiplicand)", short: "M" },
      { id: "N", label: "N (multiplier)", short: "N" },
      { id: "A", label: "A (accumulator)", short: "A" },
      { id: "T", label: "T (temp result)", short: "T" }
    ],
    states: [
      { id: "READ", label: "READ N BIT", desc: "Look at the multiplier bit under the head." },
      { id: "ADD", label: "ADD", desc: "Run the adder subroutine: A + M → T." },
      { id: "COPY", label: "COPY T → A", desc: "Move the sum from T back into A." },
      { id: "SHIFT", label: "SHIFT M LEFT", desc: "Append a 0 to M." },
      { id: "NEXT", label: "NEXT BIT", desc: "Move the N head one place left." },
      { id: "DONE", label: "HALT", desc: "Finished." }
    ],
    inputs: [
      { id: "m", label: "M (multiplicand)", maxLen: 6, placeholder: "101" },
      { id: "n", label: "N (multiplier)", maxLen: 6, placeholder: "11" }
    ],
    presets: [
      { label: "101 × 11", values: { m: "101", n: "11" } },
      { label: "101 × 101 (has a 0 bit)", values: { m: "101", n: "101" } },
      { label: "110 × 101", values: { m: "110", n: "101" } }
    ],
    layout: function (values) {
      var m = (values && values.m) ? String(values.m) : "0";
      var n = (values && values.n) ? String(values.n) : "0";

      // M at -(m.length - 1) ... 0
      var cellsM = {};
      for (var i = 0; i < m.length; i++) {
        var posM = i - (m.length - 1);
        cellsM[posM] = m.charAt(i);
      }

      // N at -(n.length - 1) ... 0
      var cellsN = {};
      for (var j = 0; j < n.length; j++) {
        var posN = j - (n.length - 1);
        cellsN[posN] = n.charAt(j);
      }

      // A initialized with single "0" at column 0
      var cellsA = { 0: "0" };

      // T initially empty
      var cellsT = {};

      return {
        tapes: [
          { cells: cellsM, head: 0 },
          { cells: cellsN, head: 0 },
          { cells: cellsA, head: 0 },
          { cells: cellsT, head: 0 }
        ]
      };
    },
    readResult: function (view) {
      if (!view || !view.tapes || !view.tapes[2]) return "0";
      return readTapeSpan(view.tapes[2].cells);
    },
    expected: function (values) {
      var m = (values && values.m) ? String(values.m) : "0";
      var n = (values && values.n) ? String(values.n) : "0";
      var vm = BigInt("0b" + TM.normalise(m));
      var vn = BigInt("0b" + TM.normalise(n));
      var prod = vm * vn;
      return {
        text: vm.toString() + " × " + vn.toString() + " = " + prod.toString(),
        bits: prod.toString(2)
      };
    },
    hardware: function (view) {
      if (view && view.phase && view.phase.id === "ADD") {
        // Use adder's hardware card row
        var aSym = view.reading[2]; // A is tape 2
        var bSym = view.reading[0]; // M is tape 0
        var stateId = (view.adderState) || "c0";
        var cin = stateId === "c1" ? 1 : 0;
        var aVal = aSym === "B" ? 0 : Number(aSym);
        var bVal = bSym === "B" ? 0 : Number(bSym);
        var sum = aVal + bVal + cin;
        return {
          type: "adder",
          a: aVal,
          b: bVal,
          cin: cin,
          sum: sum % 2,
          cout: Math.floor(sum / 2),
          text: "During ADD, the ALU 1-bit full adder computes sum bits into temp tape T."
        };
      }
      return {
        type: "increment",
        text: "Binary multiplication uses repeated shift-and-add: inspecting multiplier bits and accumulating shifted multiplicands."
      };
    }
  };

  // Composite Runner implementation
  function createCompositeRunner(machine, values) {
    var adderMachine = TM.machines.addition;
    var layout = machine.layout(values || {});

    var tapes = [
      { id: "M", label: "M (multiplicand)", short: "M", head: 0, cells: TM.cloneCells(layout.tapes[0].cells) },
      { id: "N", label: "N (multiplier)", short: "N", head: 0, cells: TM.cloneCells(layout.tapes[1].cells) },
      { id: "A", label: "A (accumulator)", short: "A", head: 0, cells: TM.cloneCells(layout.tapes[2].cells) },
      { id: "T", label: "T (temp result)", short: "T", head: 0, cells: TM.cloneCells(layout.tapes[3].cells) }
    ];

    var phase = "READ";
    var stepCount = 0;
    var status = "ready";
    var message = null;
    var lastFired = null;
    var lastNote = null;
    var currentBit = null;
    var history = [];

    // Inner adder state (active during ADD)
    var adderState = null;

    function getAdderMatchingRule() {
      if (phase !== "ADD" || !adderState) return null;
      var readA = TM.getCell(tapes[2].cells, tapes[2].head);
      var readM = TM.getCell(tapes[0].cells, tapes[0].head);
      var readT = TM.getCell(tapes[3].cells, tapes[3].head);
      var reading = [readA, readM, readT];

      for (var i = 0; i < adderMachine.rules.length; i++) {
        var r = adderMachine.rules[i];
        if (r.state === adderState &&
            r.read[0] === reading[0] &&
            r.read[1] === reading[1] &&
            r.read[2] === reading[2]) {
          return r;
        }
      }
      return null;
    }

    function computeNextMacro() {
      if (status !== "ready") return null;

      var bitUnderHead = TM.getCell(tapes[1].cells, tapes[1].head);

      if (phase === "READ") {
        var desc;
        if (bitUnderHead === "1") {
          desc = "Look at the multiplier bit under the head: 1. It is 1, so add M to A.";
        } else if (bitUnderHead === "0") {
          desc = "Look at the multiplier bit under the head: 0. It is 0, so skip the addition.";
        } else {
          desc = "Look at the multiplier bit under the head: blank. No more bits: multiplication is finished.";
        }
        return {
          id: "READ",
          label: "READ N BIT",
          desc: desc
        };
      } else if (phase === "COPY") {
        return {
          id: "COPY",
          label: "COPY T → A",
          desc: "Copy the sum from T back into the accumulator A."
        };
      } else if (phase === "SHIFT") {
        return {
          id: "SHIFT",
          label: "SHIFT M LEFT",
          desc: "Shift M one place left by appending a 0."
        };
      } else if (phase === "NEXT") {
        return {
          id: "NEXT",
          label: "NEXT BIT",
          desc: "Move to the next multiplier bit on the left."
        };
      }
      return null;
    }

    function makeSnapshot() {
      var tapeCopies = [];
      for (var i = 0; i < tapes.length; i++) {
        tapeCopies.push({
          id: tapes[i].id,
          label: tapes[i].label,
          short: tapes[i].short,
          head: tapes[i].head,
          cells: TM.cloneCells(tapes[i].cells)
        });
      }
      return {
        phase: phase,
        stepCount: stepCount,
        status: status,
        message: message,
        lastFired: lastFired ? JSON.parse(JSON.stringify(lastFired)) : null,
        lastNote: lastNote,
        currentBit: currentBit,
        adderState: adderState,
        tapes: tapeCopies
      };
    }

    function view() {
      var tapeCopies = [];
      for (var i = 0; i < tapes.length; i++) {
        tapeCopies.push({
          id: tapes[i].id,
          label: tapes[i].label,
          short: tapes[i].short,
          head: tapes[i].head,
          cells: TM.cloneCells(tapes[i].cells)
        });
      }

      var currentReading = [
        TM.getCell(tapes[0].cells, tapes[0].head),
        TM.getCell(tapes[1].cells, tapes[1].head),
        TM.getCell(tapes[2].cells, tapes[2].head),
        TM.getCell(tapes[3].cells, tapes[3].head)
      ];

      var nextMacro = computeNextMacro();
      var adderRule = getAdderMatchingRule();
      var nextRuleId = (phase === "ADD" && adderRule) ? adderRule.id : null;

      var stateLabel = phase;
      var stateSub = null;
      var subMachineId = null;

      if (phase === "ADD") {
        stateLabel = "ADD";
        stateSub = adderState === "c1" ? "CARRY 1" : "CARRY 0";
        subMachineId = "addition";
      } else if (phase === "READ") {
        stateLabel = "READ N BIT";
      } else if (phase === "COPY") {
        stateLabel = "COPY T → A";
      } else if (phase === "SHIFT") {
        stateLabel = "SHIFT M LEFT";
      } else if (phase === "NEXT") {
        stateLabel = "NEXT BIT";
      } else if (phase === "DONE") {
        stateLabel = "HALT";
      }

      var nextNote = "";
      if (status === "halted") {
        nextNote = "Halted. Computation successfully completed.";
      } else if (status === "stuck") {
        nextNote = message || "No matching rule found.";
      } else if (status === "limit") {
        nextNote = message || "Step limit reached.";
      } else if (phase === "ADD" && adderRule) {
        nextNote = adderRule.note;
      } else if (nextMacro) {
        nextNote = nextMacro.desc;
      }

      var skippedPhases = [];
      if (currentBit === "0") {
        skippedPhases = ["ADD", "COPY"];
      }

      return {
        machineId: "multiplication",
        step: stepCount,
        status: status,
        state: { id: phase, label: stateLabel, sub: stateSub },
        adderState: adderState,
        tapes: tapeCopies,
        reading: currentReading,
        nextRuleId: nextRuleId,
        nextMacro: nextMacro,
        lastFired: lastFired ? JSON.parse(JSON.stringify(lastFired)) : null,
        nextNote: nextNote,
        lastNote: lastNote ? (lastNote.indexOf("Did: ") === 0 ? lastNote : "Did: " + lastNote) : null,
        phase: { id: phase, skipped: skippedPhases, bit: currentBit },
        subMachineId: subMachineId,
        message: message
      };
    }

    function step() {
      if (status !== "ready") return view();

      // Record snapshot
      history.push(makeSnapshot());
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      var currentHeadN = tapes[1].head;
      var bitN = TM.getCell(tapes[1].cells, currentHeadN);

      if (phase === "READ") {
        currentBit = bitN;
        if (bitN === "B") {
          status = "halted";
          phase = "DONE";
          lastFired = {
            kind: "macro",
            macroId: "READ",
            from: "READ",
            to: "DONE",
            read: [TM.getCell(tapes[0].cells, tapes[0].head), bitN, TM.getCell(tapes[2].cells, tapes[2].head), TM.getCell(tapes[3].cells, tapes[3].head)],
            note: "Look at the multiplier bit under the head: blank. No more bits: multiplication is finished."
          };
          lastNote = lastFired.note;
        } else if (bitN === "1") {
          phase = "ADD";
          // Initialize adder run
          tapes[0].head = 0; // M
          tapes[2].head = 0; // A
          tapes[3].head = 0; // T
          tapes[3].cells = {}; // clear T
          adderState = "c0";

          lastFired = {
            kind: "macro",
            macroId: "READ",
            from: "READ",
            to: "ADD",
            read: [TM.getCell(tapes[0].cells, tapes[0].head), bitN, TM.getCell(tapes[2].cells, tapes[2].head), TM.getCell(tapes[3].cells, tapes[3].head)],
            note: "Look at the multiplier bit under the head: 1. It is 1, so add M to A."
          };
          lastNote = lastFired.note;
        } else if (bitN === "0") {
          // Skip ADD and COPY -> go directly to SHIFT
          phase = "SHIFT";
          lastFired = {
            kind: "macro",
            macroId: "READ",
            from: "READ",
            to: "SHIFT",
            read: [TM.getCell(tapes[0].cells, tapes[0].head), bitN, TM.getCell(tapes[2].cells, tapes[2].head), TM.getCell(tapes[3].cells, tapes[3].head)],
            note: "Look at the multiplier bit under the head: 0. It is 0, so skip the addition."
          };
          lastNote = lastFired.note;
        }
      } else if (phase === "ADD") {
        var rule = getAdderMatchingRule();
        if (!rule) {
          status = "stuck";
          message = "No rule for adder state " + adderState;
          return view();
        }

        var prevAdderState = adderState;
        // Apply adder rule:
        // Tape 1 of adder = A (tapes[2])
        // Tape 2 of adder = M (tapes[0])
        // Tape 3 of adder = T (tapes[3])
        TM.setCell(tapes[2].cells, tapes[2].head, rule.write[0]);
        TM.setCell(tapes[0].cells, tapes[0].head, rule.write[1]);
        TM.setCell(tapes[3].cells, tapes[3].head, rule.write[2]);

        if (rule.move[0] === "L") tapes[2].head -= 1;
        if (rule.move[1] === "L") tapes[0].head -= 1;
        if (rule.move[2] === "L") tapes[3].head -= 1;

        adderState = rule.next;

        lastFired = {
          kind: "rule",
          ruleId: rule.id,
          from: prevAdderState,
          to: adderState,
          read: rule.read.slice(),
          write: rule.write.slice(),
          move: rule.move.slice(),
          note: rule.note
        };
        lastNote = rule.note;

        // Check if adder halted
        if (adderMachine.halt.indexOf(adderState) !== -1) {
          phase = "COPY";
        }
      } else if (phase === "COPY") {
        // A := contents of T; T := empty; heads of A, M, T reset to column 0 -> phase = SHIFT
        tapes[2].cells = TM.cloneCells(tapes[3].cells);
        tapes[3].cells = {};
        tapes[0].head = 0; // M
        tapes[2].head = 0; // A
        tapes[3].head = 0; // T
        phase = "SHIFT";

        lastFired = {
          kind: "macro",
          macroId: "COPY",
          from: "COPY",
          to: "SHIFT",
          read: ["-", "-", "-", "-"],
          note: "Copy the sum from T back into the accumulator A."
        };
        lastNote = lastFired.note;
      } else if (phase === "SHIFT") {
        // M := M + "0" (append zero on the right; digits move 1 column left, LSB stays at 0)
        var oldCellsM = tapes[0].cells;
        var newCellsM = {};
        var keysM = Object.keys(oldCellsM).map(Number);
        for (var k = 0; k < keysM.length; k++) {
          var p = keysM[k];
          newCellsM[p - 1] = oldCellsM[p];
        }
        newCellsM[0] = "0";
        tapes[0].cells = newCellsM;
        tapes[0].head = 0;
        phase = "NEXT";

        lastFired = {
          kind: "macro",
          macroId: "SHIFT",
          from: "SHIFT",
          to: "NEXT",
          read: ["-", "-", "-", "-"],
          note: "Shift M one place left by appending a 0."
        };
        lastNote = lastFired.note;
      } else if (phase === "NEXT") {
        // headN := headN - 1 -> phase = READ
        tapes[1].head -= 1;
        phase = "READ";

        lastFired = {
          kind: "macro",
          macroId: "NEXT",
          from: "NEXT",
          to: "READ",
          read: ["-", "-", "-", "-"],
          note: "Move to the next multiplier bit on the left."
        };
        lastNote = lastFired.note;
      }

      stepCount += 1;

      if (stepCount >= STEP_LIMIT && status === "ready") {
        status = "limit";
        message = "Stopped after " + STEP_LIMIT + " steps. This should not happen for valid input.";
      }

      return view();
    }

    function stepBack() {
      if (history.length === 0) return view();
      var snap = history.pop();
      phase = snap.phase;
      stepCount = snap.stepCount;
      status = snap.status;
      message = snap.message;
      lastFired = snap.lastFired;
      lastNote = snap.lastNote;
      currentBit = snap.currentBit;
      adderState = snap.adderState;

      tapes = [];
      for (var i = 0; i < snap.tapes.length; i++) {
        tapes.push({
          id: snap.tapes[i].id,
          label: snap.tapes[i].label,
          short: snap.tapes[i].short,
          head: snap.tapes[i].head,
          cells: TM.cloneCells(snap.tapes[i].cells)
        });
      }
      return view();
    }

    function reset() {
      history = [];
      var initLayout = machine.layout(values || {});
      tapes = [
        { id: "M", label: "M (multiplicand)", short: "M", head: 0, cells: TM.cloneCells(initLayout.tapes[0].cells) },
        { id: "N", label: "N (multiplier)", short: "N", head: 0, cells: TM.cloneCells(initLayout.tapes[1].cells) },
        { id: "A", label: "A (accumulator)", short: "A", head: 0, cells: TM.cloneCells(initLayout.tapes[2].cells) },
        { id: "T", label: "T (temp result)", short: "T", head: 0, cells: TM.cloneCells(initLayout.tapes[3].cells) }
      ];
      phase = "READ";
      stepCount = 0;
      status = "ready";
      message = null;
      lastFired = null;
      lastNote = null;
      currentBit = null;
      adderState = null;
      return view();
    }

    function runToEnd(limit) {
      var maxSteps = limit !== undefined ? limit : STEP_LIMIT;
      while (status === "ready" && stepCount < maxSteps) {
        step();
      }
      if (status === "ready" && stepCount >= maxSteps) {
        status = "limit";
        message = "Stopped after " + maxSteps + " steps. This should not happen for valid input.";
      }
      return view();
    }

    return {
      view: view,
      step: step,
      stepBack: stepBack,
      reset: reset,
      runToEnd: runToEnd
    };
  }

  // Register composite runner with TM
  TM.createCompositeRunner = createCompositeRunner;

  if (typeof module !== "undefined" && module.exports) module.exports = TM;
})(typeof globalThis !== "undefined" ? globalThis : this);
