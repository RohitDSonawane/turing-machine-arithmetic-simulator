(function (g) {
  var TM = (g.TM = g.TM || {});
  TM.machines = TM.machines || {};

  // Helper to extract non-blank span as a string
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

  // ==========================================
  // Machine 1: Binary Increment (single tape)
  // ==========================================
  TM.machines.increment = {
    id: "increment",
    title: "Binary Increment",
    kind: "rules",
    blank: "B",
    tapeCount: 1,
    tapes: [{ id: "T1", label: "NUMBER", short: "T1" }],
    states: [
      { id: "q0", label: "SCAN RIGHT", desc: "Move right to the end of the number." },
      { id: "q1", label: "CARRY LEFT", desc: "Walk left carrying the +1." },
      { id: "qf", label: "HALT", desc: "Done." }
    ],
    start: "q0",
    halt: ["qf"],
    rules: [
      { id: "inc-1", state: "q0", read: ["0"], write: ["0"], move: ["R"], next: "q0", note: "Reads 0 while scanning right. Leaves it and moves right." },
      { id: "inc-2", state: "q0", read: ["1"], write: ["1"], move: ["R"], next: "q0", note: "Reads 1 while scanning right. Leaves it and moves right." },
      { id: "inc-3", state: "q0", read: ["B"], write: ["B"], move: ["L"], next: "q1", note: "Reached the end of the number. Turn around and start adding 1 from the last bit." },
      { id: "inc-4", state: "q1", read: ["1"], write: ["0"], move: ["L"], next: "q1", note: "Reads 1: 1 + 1 = 0 with a carry. Write 0, carry on to the left." },
      { id: "inc-5", state: "q1", read: ["0"], write: ["1"], move: ["S"], next: "qf", note: "Reads 0: 0 + 1 = 1, no carry left. Write 1 and halt." },
      { id: "inc-6", state: "q1", read: ["B"], write: ["1"], move: ["S"], next: "qf", note: "Ran past the front: every bit was 1. Write a new leading 1 and halt." }
    ],
    inputs: [
      { id: "x", label: "Binary number", maxLen: 12, placeholder: "1011" }
    ],
    presets: [
      { label: "1011 + 1", values: { x: "1011" } },
      { label: "111 + 1 (all ones)", values: { x: "111" } },
      { label: "0111 + 1", values: { x: "0111" } }
    ],
    layout: function (values) {
      var x = (values && values.x) ? String(values.x) : "0";
      var cells = {};
      for (var i = 0; i < x.length; i++) {
        cells[i] = x.charAt(i);
      }
      return {
        tapes: [
          { cells: cells, head: 0 }
        ]
      };
    },
    readResult: function (view) {
      if (!view || !view.tapes || !view.tapes[0]) return "0";
      return readTapeSpan(view.tapes[0].cells);
    },
    expected: function (values) {
      var x = (values && values.x) ? String(values.x) : "0";
      var v = BigInt("0b" + TM.normalise(x));
      var ans = v + 1n;
      return {
        text: v.toString() + " + 1 = " + ans.toString(),
        bits: ans.toString(2)
      };
    },
    hardware: function (view) {
      return {
        type: "increment",
        text: "Increment is a chain of half-adders: flip trailing 1s, stop at the first 0. Counters and the program counter do this in hardware."
      };
    }
  };

  // ==========================================
  // Machine 2: Binary Addition (three tapes)
  // ==========================================
  function generateAdditionRules() {
    var rules = [];
    var carries = [0, 1];
    var symbols = ["0", "1", "B"];

    for (var ci = 0; ci < carries.length; ci++) {
      var c = carries[ci];
      var stateId = "c" + c;

      for (var ai = 0; ai < symbols.length; ai++) {
        var a = symbols[ai];
        for (var bi = 0; bi < symbols.length; bi++) {
          var b = symbols[bi];
          var ruleId = "c" + c + "|" + a + b;
          var read = [a, b, "B"];

          if (a === "B" && b === "B") {
            // Case 1: both finished
            if (c === 0) {
              rules.push({
                id: ruleId,
                state: stateId,
                read: read,
                write: ["B", "B", "B"],
                move: ["S", "S", "S"],
                next: "qf",
                note: "Both numbers are finished and there is no carry. Halt."
              });
            } else {
              rules.push({
                id: ruleId,
                state: stateId,
                read: read,
                write: ["B", "B", "1"],
                move: ["S", "S", "S"],
                next: "qf",
                note: "Both numbers are finished but a carry of 1 is left. Write it as the new leading bit and halt."
              });
            }
          } else {
            // Case 2: at least one number still has a bit
            var av = a === "B" ? 0 : Number(a);
            var bv = b === "B" ? 0 : Number(b);
            var s = av + bv + c;
            var sumBit = String(s % 2);
            var nextCarry = Math.floor(s / 2);
            var nextState = "c" + nextCarry;
            var note;

            if (a !== "B" && b !== "B") {
              note = "Reads a=" + a + ", b=" + b + ", carry " + c + ". Sum is " + s + ": write " + sumBit + ", carry " + nextCarry + ", move all heads left.";
            } else {
              var aLabel = a === "B" ? "none" : a;
              var bLabel = b === "B" ? "none" : b;
              note = "Reads a=" + aLabel + ", b=" + bLabel + ", carry " + c + ". A finished number counts as 0. Sum is " + s + ": write " + sumBit + ", carry " + nextCarry + ", move all heads left.";
            }

            rules.push({
              id: ruleId,
              state: stateId,
              read: read,
              write: [a, b, sumBit],
              move: ["L", "L", "L"],
              next: nextState,
              note: note
            });
          }
        }
      }
    }
    return rules;
  }

  TM.machines.addition = {
    id: "addition",
    title: "Binary Addition",
    kind: "rules",
    blank: "B",
    tapeCount: 3,
    tapes: [
      { id: "T1", label: "A", short: "A" },
      { id: "T2", label: "B", short: "B" },
      { id: "T3", label: "RESULT", short: "RES" }
    ],
    states: [
      { id: "c0", label: "CARRY 0", desc: "No carry into the next column." },
      { id: "c1", label: "CARRY 1", desc: "Carry 1 into the next column." },
      { id: "qf", label: "HALT", desc: "Done." }
    ],
    start: "c0",
    halt: ["qf"],
    rules: generateAdditionRules(),
    inputs: [
      { id: "a", label: "A", maxLen: 10, placeholder: "1011" },
      { id: "b", label: "B", maxLen: 10, placeholder: "0110" }
    ],
    presets: [
      { label: "1011 + 0110", values: { a: "1011", b: "0110" } },
      { label: "111 + 1 (carry chain)", values: { a: "111", b: "1" } },
      { label: "101 + 11111 (different lengths)", values: { a: "101", b: "11111" } }
    ],
    layout: function (values) {
      var a = (values && values.a) ? String(values.a) : "0";
      var b = (values && values.b) ? String(values.b) : "0";

      // LSB at column 0: positions from -(len-1) to 0
      var cellsA = {};
      for (var i = 0; i < a.length; i++) {
        var posA = i - (a.length - 1);
        cellsA[posA] = a.charAt(i);
      }

      var cellsB = {};
      for (var j = 0; j < b.length; j++) {
        var posB = j - (b.length - 1);
        cellsB[posB] = b.charAt(j);
      }

      return {
        tapes: [
          { cells: cellsA, head: 0 },
          { cells: cellsB, head: 0 },
          { cells: {}, head: 0 }
        ]
      };
    },
    readResult: function (view) {
      if (!view || !view.tapes || !view.tapes[2]) return "0";
      return readTapeSpan(view.tapes[2].cells);
    },
    expected: function (values) {
      var a = (values && values.a) ? String(values.a) : "0";
      var b = (values && values.b) ? String(values.b) : "0";
      var va = BigInt("0b" + TM.normalise(a));
      var vb = BigInt("0b" + TM.normalise(b));
      var sum = va + vb;
      return {
        text: va.toString() + " + " + vb.toString() + " = " + sum.toString(),
        bits: sum.toString(2)
      };
    },
    hardware: function (view) {
      // Hardware full adder row computation
      var stateId = view && view.state ? view.state.id : "c0";
      var cin = stateId === "c1" ? 1 : 0;
      var aSym = (view && view.reading && view.reading[0]) || "B";
      var bSym = (view && view.reading && view.reading[1]) || "B";
      var aVal = aSym === "B" ? 0 : Number(aSym);
      var bVal = bSym === "B" ? 0 : Number(bSym);
      var sum = aVal + bVal + cin;
      var sumBit = sum % 2;
      var cout = Math.floor(sum / 2);

      return {
        type: "adder",
        a: aVal,
        b: bVal,
        cin: cin,
        sum: sumBit,
        cout: cout,
        text: "This is what a 1-bit full adder in an ALU computes. The carry state (c0/c1) plays the role of the carry wire."
      };
    }
  };

  if (typeof module !== "undefined" && module.exports) module.exports = TM;
})(typeof globalThis !== "undefined" ? globalThis : this);
