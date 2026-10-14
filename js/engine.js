(function (g) {
  var TM = (g.TM = g.TM || {});

  var STEP_LIMIT = 5000;
  var MAX_HISTORY = 6000;

  // Tape & Cell Helpers
  function getCell(cells, pos) {
    if (!cells) return "B";
    var val = cells[pos];
    return val === undefined || val === null || val === "B" ? "B" : val;
  }

  function setCell(cells, pos, val) {
    if (val === undefined || val === null || val === "B") {
      delete cells[pos];
    } else {
      cells[pos] = val;
    }
  }

  function cloneCells(cells) {
    var copy = {};
    if (!cells) return copy;
    var keys = Object.keys(cells);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (cells[k] !== undefined && cells[k] !== null && cells[k] !== "B") {
        copy[k] = cells[k];
      }
    }
    return copy;
  }

  function stringToCells(str, startPos) {
    var pos = startPos !== undefined ? startPos : 0;
    var cells = {};
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch !== "B") {
        cells[pos + i] = ch;
      }
    }
    return cells;
  }

  function cellsToString(cells, startPos, endPos) {
    var out = "";
    for (var i = startPos; i <= endPos; i++) {
      out += getCell(cells, i);
    }
    return out;
  }

  function normalise(bits) {
    if (!bits) return "0";
    var s = String(bits).replace(/^0+/, "");
    return s === "" ? "0" : s;
  }

  function verifyResult(machine, view, values) {
    var output = machine.readResult ? machine.readResult(view) : "";
    var exp = machine.expected ? machine.expected(values) : null;
    var normOut = normalise(output);
    var normExp = exp ? normalise(exp.bits) : "";
    var ok = false;
    try {
      ok = BigInt("0b" + normOut) === BigInt("0b" + normExp);
    } catch (e) {
      ok = false;
    }
    return {
      rawOutput: output,
      normOutput: normOut,
      expectedBits: exp ? exp.bits : "",
      normExpected: normExp,
      expectedText: exp ? exp.text : "",
      ok: ok
    };
  }

  function getStateMeta(machine, stateId) {
    if (machine.states) {
      for (var i = 0; i < machine.states.length; i++) {
        if (machine.states[i].id === stateId) {
          return machine.states[i];
        }
      }
    }
    return { id: stateId, label: stateId, desc: "" };
  }

  function matchRule(rules, state, reading) {
    if (!rules) return null;
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.state !== state) continue;
      if (r.read.length !== reading.length) continue;
      var match = true;
      for (var j = 0; j < reading.length; j++) {
        if (r.read[j] !== reading[j]) {
          match = false;
          break;
        }
      }
      if (match) return r;
    }
    return null;
  }

  // Generic Rule-based Machine Runner
  function createRuleRunner(machine, values) {
    var layout = machine.layout(values || {});
    var tapes = [];
    for (var i = 0; i < machine.tapeCount; i++) {
      var tapeDef = (machine.tapes && machine.tapes[i]) || { id: "T" + (i + 1), label: "Tape " + (i + 1), short: "T" + (i + 1) };
      var initialTape = (layout.tapes && layout.tapes[i]) || { cells: {}, head: 0 };
      tapes.push({
        id: tapeDef.id,
        label: tapeDef.label,
        short: tapeDef.short,
        head: initialTape.head || 0,
        cells: cloneCells(initialTape.cells)
      });
    }

    var state = machine.start;
    var stepCount = 0;
    var status = "ready";
    var message = null;
    var lastFired = null;
    var lastNote = null;
    var history = [];

    // If initial state is halt state
    if (machine.halt && machine.halt.indexOf(state) !== -1) {
      status = "halted";
    }

    function computeReading() {
      var r = [];
      for (var i = 0; i < tapes.length; i++) {
        r.push(getCell(tapes[i].cells, tapes[i].head));
      }
      return r;
    }

    function computeNext() {
      if (status !== "ready") {
        return { rule: null, note: status === "halted" ? "Halted." : (message || "") };
      }
      var reading = computeReading();
      var rule = matchRule(machine.rules, state, reading);
      if (!rule) {
        return {
          rule: null,
          note: "No rule matches (" + state + ", " + reading.join(" · ") + "). The machine stops and rejects."
        };
      }
      return { rule: rule, note: rule.note || "" };
    }

    var nextInfo = computeNext();

    function makeSnapshot() {
      var tapeSnaps = [];
      for (var i = 0; i < tapes.length; i++) {
        tapeSnaps.push({
          id: tapes[i].id,
          label: tapes[i].label,
          short: tapes[i].short,
          head: tapes[i].head,
          cells: cloneCells(tapes[i].cells)
        });
      }
      return {
        state: state,
        stepCount: stepCount,
        status: status,
        message: message,
        lastFired: lastFired ? JSON.parse(JSON.stringify(lastFired)) : null,
        lastNote: lastNote,
        tapes: tapeSnaps
      };
    }

    function view() {
      var stateMeta = getStateMeta(machine, state);
      var tapeCopies = [];
      for (var i = 0; i < tapes.length; i++) {
        tapeCopies.push({
          id: tapes[i].id,
          label: tapes[i].label,
          short: tapes[i].short,
          head: tapes[i].head,
          cells: cloneCells(tapes[i].cells)
        });
      }

      var currentReading = computeReading();

      return {
        machineId: machine.id,
        step: stepCount,
        status: status,
        state: { id: state, label: stateMeta.label, sub: null },
        tapes: tapeCopies,
        reading: currentReading,
        nextRuleId: nextInfo.rule ? nextInfo.rule.id : null,
        nextMacro: null,
        lastFired: lastFired ? JSON.parse(JSON.stringify(lastFired)) : null,
        nextNote: nextInfo.note,
        lastNote: lastNote ? (lastNote.indexOf("Did: ") === 0 ? lastNote : "Did: " + lastNote) : null,
        phase: null,
        subMachineId: null,
        message: message
      };
    }

    function step() {
      if (status !== "ready") {
        return view();
      }

      var reading = computeReading();
      var rule = matchRule(machine.rules, state, reading);

      if (!rule) {
        status = "stuck";
        message = "No rule matches (" + state + ", " + reading.join(" · ") + "). The machine stops and rejects.";
        nextInfo = computeNext();
        return view();
      }

      // Record snapshot in history
      history.push(makeSnapshot());
      if (history.length > MAX_HISTORY) {
        history.shift();
      }

      var prevState = state;

      // Apply write and move for each tape
      for (var i = 0; i < tapes.length; i++) {
        var w = rule.write[i];
        setCell(tapes[i].cells, tapes[i].head, w);

        var m = rule.move[i];
        if (m === "L") {
          tapes[i].head -= 1;
        } else if (m === "R") {
          tapes[i].head += 1;
        }
      }

      state = rule.next;
      stepCount += 1;

      lastFired = {
        kind: "rule",
        ruleId: rule.id,
        from: prevState,
        to: state,
        read: reading.slice(),
        write: rule.write.slice(),
        move: rule.move.slice(),
        note: rule.note || ""
      };
      lastNote = rule.note || "";

      if (machine.halt && machine.halt.indexOf(state) !== -1) {
        status = "halted";
      } else if (stepCount >= STEP_LIMIT && status === "ready") {
        status = "limit";
        message = "Stopped after " + STEP_LIMIT + " steps. This should not happen for valid input.";
      }

      nextInfo = computeNext();
      return view();
    }

    function stepBack() {
      if (history.length === 0) {
        return view();
      }
      var snap = history.pop();
      state = snap.state;
      stepCount = snap.stepCount;
      status = snap.status;
      message = snap.message;
      lastFired = snap.lastFired;
      lastNote = snap.lastNote;
      tapes = [];
      for (var i = 0; i < snap.tapes.length; i++) {
        tapes.push({
          id: snap.tapes[i].id,
          label: snap.tapes[i].label,
          short: snap.tapes[i].short,
          head: snap.tapes[i].head,
          cells: cloneCells(snap.tapes[i].cells)
        });
      }
      nextInfo = computeNext();
      return view();
    }

    function reset() {
      history = [];
      tapes = [];
      for (var i = 0; i < machine.tapeCount; i++) {
        var tapeDef = (machine.tapes && machine.tapes[i]) || { id: "T" + (i + 1), label: "Tape " + (i + 1), short: "T" + (i + 1) };
        var initialTape = (layout.tapes && layout.tapes[i]) || { cells: {}, head: 0 };
        tapes.push({
          id: tapeDef.id,
          label: tapeDef.label,
          short: tapeDef.short,
          head: initialTape.head || 0,
          cells: cloneCells(initialTape.cells)
        });
      }
      state = machine.start;
      stepCount = 0;
      status = (machine.halt && machine.halt.indexOf(state) !== -1) ? "halted" : "ready";
      message = null;
      lastFired = null;
      lastNote = null;
      nextInfo = computeNext();
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
        nextInfo = computeNext();
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

  // Top-level createRunner dispatcher
  TM.createRunner = function (machine, values) {
    if (!machine) {
      throw new Error("createRunner: machine definition is required");
    }
    if (machine.kind === "composite") {
      if (typeof TM.createCompositeRunner === "function") {
        return TM.createCompositeRunner(machine, values);
      }
      throw new Error("Composite machine runner not registered yet");
    }
    return createRuleRunner(machine, values);
  };

  // Expose helpers on TM
  TM.getCell = getCell;
  TM.setCell = setCell;
  TM.cloneCells = cloneCells;
  TM.stringToCells = stringToCells;
  TM.cellsToString = cellsToString;
  TM.normalise = normalise;
  TM.verifyResult = verifyResult;
  TM.STEP_LIMIT = STEP_LIMIT;

  if (typeof module !== "undefined" && module.exports) module.exports = TM;
})(typeof globalThis !== "undefined" ? globalThis : this);
