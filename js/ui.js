(function (g) {
  var TM = (g.TM = g.TM || {});
  TM.ui = TM.ui || {};

  var gearAngles = [0, 0, 0, 0];

  function describeEffect(rule, machine) {
    var parts = [];
    var isMulti = rule.read.length > 1;

    // 1. Writes
    var writes = [];
    for (var i = 0; i < rule.write.length; i++) {
      if (rule.write[i] !== rule.read[i]) {
        var tapeLabel = (machine && machine.tapes && machine.tapes[i] && machine.tapes[i].short) || ("T" + (i + 1));
        if (!isMulti) {
          writes.push("WRITE " + rule.write[i]);
        } else {
          writes.push("WRITE " + rule.write[i] + " ON " + tapeLabel);
        }
      }
    }
    if (writes.length > 0) {
      parts.push(writes.join(", "));
    }

    // 2. Moves
    var allS = true;
    var allSame = true;
    var firstNonS = null;
    for (var j = 0; j < rule.move.length; j++) {
      var m = rule.move[j];
      if (m !== "S") {
        allS = false;
        if (firstNonS === null) {
          firstNonS = m;
        } else if (firstNonS !== m) {
          allSame = false;
        }
      }
    }

    if (!allS) {
      if (allSame) {
        var dir = firstNonS === "L" ? "LEFT" : "RIGHT";
        if (!isMulti) {
          parts.push("MOVE HEAD " + dir);
        } else {
          parts.push("MOVE HEADS " + dir);
        }
      } else {
        var moves = [];
        for (var k = 0; k < rule.move.length; k++) {
          var tLabel = (machine && machine.tapes && machine.tapes[k] && machine.tapes[k].short) || ("T" + (k + 1));
          moves.push(tLabel + " " + rule.move[k]);
        }
        parts.push(moves.join(", "));
      }
    }

    // 3. Next State
    var isHalt = machine && machine.halt && machine.halt.indexOf(rule.next) !== -1;
    var statePart = 'SET STATE = "' + rule.next + '"' + (isHalt ? " (HALT)" : "");
    parts.push(statePart);

    return parts.join("; ");
  }

  // Gear SVG generator
  function createGearSVG(extraClass) {
    return '<svg class="tape-gear ' + extraClass + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="16" fill="#262B2B" stroke="#4A5252" stroke-width="2"/>' +
      '<circle cx="20" cy="20" r="6" fill="#3A4040"/>' +
      '<path d="M 18,2 L 22,2 L 21,6 L 19,6 Z M 18,34 L 22,34 L 21,38 L 19,38 Z M 2,18 L 2,22 L 6,21 L 6,19 Z M 34,18 L 34,22 L 38,21 L 38,19 Z M 7,7 L 10,5 L 12,9 L 9,11 Z M 30,30 L 33,28 L 35,32 L 32,34 Z M 7,33 L 9,35 L 12,31 L 10,29 Z M 30,10 L 32,8 L 35,12 L 33,14 Z" fill="#4A5252"/>' +
      '</svg>';
  }

  // Render Machine Rules Table
  function renderRulesTable(machine, view) {
    var tbody = document.getElementById("rules-tbody");
    var subroutineChip = document.getElementById("subroutine-chip");
    if (!tbody) return;

    var displayMachine = machine;
    if (view && view.subMachineId && TM.machines[view.subMachineId]) {
      displayMachine = TM.machines[view.subMachineId];
      if (subroutineChip) subroutineChip.style.display = "inline-block";
    } else {
      if (subroutineChip) subroutineChip.style.display = "none";
    }

    var rules = displayMachine.rules || [];
    var html = "";

    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      var isActive = view && view.nextRuleId === r.id;
      var isLastFired = view && view.lastFired && view.lastFired.ruleId === r.id;

      var rowClasses = "rule-row";
      if (isActive) rowClasses += " active";
      if (isLastFired) rowClasses += " last-fired";

      var readStr = r.read.join(" · ");
      var effectStr = describeEffect(r, displayMachine);

      html += '<tr class="' + rowClasses + '" id="rule-row-' + r.id + '">' +
        '<td class="rule-col-state">"' + r.state + '"</td>' +
        '<td class="rule-col-read">' + readStr + '</td>' +
        '<td class="rule-col-effect">' + effectStr + '</td>' +
        '</tr>';
    }

    tbody.innerHTML = html;

    // Scroll active rule into view
    if (view && view.nextRuleId) {
      var activeEl = document.getElementById("rule-row-" + view.nextRuleId);
      if (activeEl && typeof activeEl.scrollIntoView === "function") {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }

  // Render Tapes
  function renderTapes(machine, view, prevView) {
    var container = document.getElementById("tapes-container");
    if (!container || !view || !view.tapes) return;

    var isReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var visCount = window.innerWidth < 768 ? 9 : 15;
    var halfVis = Math.floor(visCount / 2);

    var html = "";

    for (var tIdx = 0; tIdx < view.tapes.length; tIdx++) {
      var tape = view.tapes[tIdx];
      var headPos = tape.head;
      var tapeLabel = "TAPE " + (tIdx + 1) + " · " + tape.label;

      // Update gear angles if moved
      if (!isReducedMotion && view.lastFired && view.lastFired.move && view.lastFired.move[tIdx]) {
        var m = view.lastFired.move[tIdx];
        if (m === "L") gearAngles[tIdx] = (gearAngles[tIdx] || 0) - 45;
        if (m === "R") gearAngles[tIdx] = (gearAngles[tIdx] || 0) + 45;
      }
      var angle = gearAngles[tIdx] || 0;

      // Build aria-label for accessibility
      var cellsList = [];
      for (var p = headPos - 3; p <= headPos + 3; p++) {
        var s = TM.getCell(tape.cells, p);
        if (p === headPos) cellsList.push("[head: " + s + "]");
        else cellsList.push(s);
      }
      var ariaLabel = tape.label + ": " + cellsList.join(" ");

      html += '<div class="tape-strip-wrapper" id="tape-wrapper-' + tIdx + '">' +
        '<div class="tape-label-chip">' + tapeLabel + '</div>' +
        '<div class="tape-strip-row">' +
        '<div style="transform: rotate(' + angle + 'deg);" class="tape-gear-wrapper gear-left-wrap">' + createGearSVG("gear-left") + '</div>' +
        '<div class="tape-viewport" role="img" aria-label="' + ariaLabel + '">' +
        '<span class="tape-ellipsis-left" aria-hidden="true">. . .</span>' +
        '<div class="tape-head-assembly" aria-hidden="true">' +
        '<div class="tape-head-cap">' +
        (tIdx === 0
          ? '<span class="head-label"><span class="head-window"></span>READ</span><span class="head-label">WRITE<span class="head-window"></span></span>'
          : '<span class="head-label">T' + (tIdx + 1) + '</span>') +
        '</div>' +
        '<div class="tape-head-beam"></div>' +
        '</div>' +
        '<div class="tape-track" id="tape-track-' + tIdx + '">';

      // Render visible cells with head in center
      for (var col = headPos - halfVis; col <= headPos + halfVis; col++) {
        var sym = TM.getCell(tape.cells, col);
        var isHead = col === headPos;
        var isBlank = sym === "B";

        // Check if symbol changed from prevView for write flash animation
        var isFlash = false;
        if (prevView && prevView.tapes && prevView.tapes[tIdx]) {
          var prevSym = TM.getCell(prevView.tapes[tIdx].cells, col);
          if (prevSym !== sym) {
            isFlash = true;
          }
        }

        var cellClass = "tape-cell";
        if (isBlank) cellClass += " blank-cell";
        if (isHead) cellClass += " head-active";
        if (isFlash) cellClass += " cell-flash";

        html += '<div class="' + cellClass + '" data-pos="' + col + '">' + sym + '</div>';
      }

      html += '</div>' +
        '<span class="tape-ellipsis-right" aria-hidden="true">. . .</span>' +
        '</div>' +
        '<div style="transform: rotate(' + (-angle) + 'deg);" class="tape-gear-wrapper gear-right-wrap">' + createGearSVG("gear-right") + '</div>' +
        '</div>' +
        '</div>';
    }

    container.innerHTML = html;

    // Clean up flash classes after 250ms
    setTimeout(function () {
      var flashed = container.querySelectorAll(".cell-flash");
      flashed.forEach(function (el) {
        el.classList.remove("cell-flash");
      });
    }, 250);
  }

  // Update Status Lamps
  function updateLamps(view, prevView) {
    var lampStep = document.getElementById("lamp-step");
    var lampLeft = document.getElementById("lamp-left");
    var lampRight = document.getElementById("lamp-right");
    if (!lampStep || !lampLeft || !lampRight) return;

    lampStep.className = "lamp";
    lampLeft.className = "lamp";
    lampRight.className = "lamp";

    if (view.status === "halted") {
      lampStep.classList.add("lit-ok");
      lampLeft.classList.add("lit-ok");
      lampRight.classList.add("lit-ok");
      return;
    }

    if (view.status === "stuck" || view.status === "limit") {
      lampStep.classList.add("lit-bad");
      lampLeft.classList.add("lit-bad");
      lampRight.classList.add("lit-bad");
      return;
    }

    // Step flash (150ms)
    if (view.step > 0 && prevView && prevView.step !== view.step) {
      lampStep.classList.add("lit-step");

      // Check head movements
      if (view.lastFired && view.lastFired.move) {
        var hadLeft = view.lastFired.move.some(function (m) { return m === "L"; });
        var hadRight = view.lastFired.move.some(function (m) { return m === "R"; });
        if (hadLeft) lampLeft.classList.add("lit-left");
        if (hadRight) lampRight.classList.add("lit-right");
      }

      setTimeout(function () {
        lampStep.classList.remove("lit-step");
        lampLeft.classList.remove("lit-left");
        lampRight.classList.remove("lit-right");
      }, 150);
    }
  }

  // Render Explain Bar (D4)
  function renderExplain(view) {
    var nextEl = document.getElementById("explain-next");
    var lastEl = document.getElementById("explain-last");
    var liveEl = document.getElementById("aria-live-status");
    if (!nextEl) return;

    if (view.status === "halted") {
      nextEl.textContent = "Halted. Computation successfully completed.";
    } else if (view.status === "stuck") {
      nextEl.textContent = view.message || "No rule matches. The machine stops and rejects.";
    } else if (view.status === "limit") {
      nextEl.textContent = view.message || "Step limit reached (5000).";
    } else {
      nextEl.textContent = view.nextNote || "Ready to step.";
    }

    if (view.lastNote) {
      if (lastEl) {
        lastEl.style.display = "block";
        lastEl.textContent = view.lastNote;
      }
    } else {
      if (lastEl) lastEl.style.display = "none";
    }

    // ARIA live announcement for manual steps
    if (liveEl && view.nextNote) {
      liveEl.textContent = nextEl.textContent;
    }
  }

  // Render Result Banner (D6)
  function renderResult(view, machine, values) {
    var banner = document.getElementById("result-banner");
    if (!banner) return;

    if (view.status !== "halted" && view.status !== "stuck" && view.status !== "limit") {
      banner.style.display = "none";
      return;
    }

    banner.style.display = "flex";
    var tagEl = document.getElementById("result-status-tag");
    var outMainEl = document.getElementById("result-output-main");
    var outDecEl = document.getElementById("result-output-dec");
    var expEl = document.getElementById("result-expected");
    var stepsEl = document.getElementById("result-steps");

    banner.className = "result-banner";

    if (view.status === "halted") {
      var ver = TM.verifyResult(machine, view, values);
      if (ver.ok) {
        banner.classList.add("status-ok");
        if (tagEl) tagEl.textContent = "HALTED ✔";
      } else {
        banner.classList.add("status-bad");
        if (tagEl) tagEl.textContent = "MISMATCH ✖";
      }

      var decVal = BigInt("0b" + TM.normalise(ver.rawOutput)).toString();
      if (outMainEl) outMainEl.textContent = "Output: " + ver.rawOutput;
      if (outDecEl) outDecEl.textContent = "(decimal " + decVal + ")";
      if (expEl) expEl.textContent = "Expected: " + ver.expectedText;
      if (stepsEl) stepsEl.textContent = "Steps: " + view.step;
    } else if (view.status === "stuck") {
      banner.classList.add("status-bad");
      if (tagEl) tagEl.textContent = "STUCK ✖";
      if (outMainEl) outMainEl.textContent = "Rejected";
      if (outDecEl) outDecEl.textContent = "";
      if (expEl) expEl.textContent = view.message || "No transition matches current state and symbol.";
      if (stepsEl) stepsEl.textContent = "Steps: " + view.step;
    } else if (view.status === "limit") {
      banner.classList.add("status-warn");
      if (tagEl) tagEl.textContent = "LIMIT ⚠";
      if (outMainEl) outMainEl.textContent = "Stopped";
      if (outDecEl) outDecEl.textContent = "";
      if (expEl) expEl.textContent = "Stopped after 5000 steps. This should not happen for valid input.";
      if (stepsEl) stepsEl.textContent = "Steps: " + view.step;
    }
  }

  // Render Hardware Link Card (D8)
  function renderHardware(view, machine) {
    var contentEl = document.getElementById("hardware-content");
    if (!contentEl) return;

    if (!machine.hardware) {
      contentEl.innerHTML = '<p class="hardware-text">Simulation active.</p>';
      return;
    }

    var data = machine.hardware(view);
    if (!data) return;

    if (data.type === "increment") {
      contentEl.innerHTML = '<p class="hardware-text">' + data.text + '</p>';
    } else if (data.type === "adder") {
      var truthRows = [
        { a: 0, b: 0, cin: 0, s: 0, cout: 0 },
        { a: 0, b: 0, cin: 1, s: 1, cout: 0 },
        { a: 0, b: 1, cin: 0, s: 1, cout: 0 },
        { a: 0, b: 1, cin: 1, s: 0, cout: 1 },
        { a: 1, b: 0, cin: 0, s: 1, cout: 0 },
        { a: 1, b: 0, cin: 1, s: 0, cout: 1 },
        { a: 1, b: 1, cin: 0, s: 0, cout: 1 },
        { a: 1, b: 1, cin: 1, s: 1, cout: 1 }
      ];

      var rowsHtml = "";
      for (var i = 0; i < truthRows.length; i++) {
        var tr = truthRows[i];
        var isMatch = tr.a === data.a && tr.b === data.b && tr.cin === data.cin;
        rowsHtml += '<tr class="' + (isMatch ? 'active-row' : '') + '">' +
          '<td>' + tr.a + '</td>' +
          '<td>' + tr.b + '</td>' +
          '<td>' + tr.cin + '</td>' +
          '<td>' + tr.s + '</td>' +
          '<td>' + tr.cout + '</td>' +
          '</tr>';
      }

      contentEl.innerHTML =
        '<p class="hardware-text">' + data.text + '</p>' +
        '<table class="alu-truth-table">' +
        '<thead><tr><th>A</th><th>B</th><th>Cin</th><th>Sum</th><th>Cout</th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
        '</table>';
    }
  }

  // Render Trace Log (D7)
  function renderTrace(view) {
    var tbody = document.getElementById("trace-tbody");
    var countEl = document.getElementById("trace-row-count");
    if (!tbody || !view || !view.lastFired) return;

    var row = document.createElement("tr");
    var lf = view.lastFired;
    var writeCol = lf.kind === "macro" ? "MACRO" : lf.write.join(" · ");
    var readCol = lf.kind === "macro" ? (lf.macroId || "MACRO") : lf.read.join(" · ");
    var moveCol = lf.move ? lf.move.join(" · ") : "-";

    row.innerHTML =
      '<td>' + view.step + '</td>' +
      '<td>' + lf.from + '</td>' +
      '<td>' + readCol + '</td>' +
      '<td>' + writeCol + '</td>' +
      '<td>' + moveCol + '</td>' +
      '<td>' + lf.to + '</td>';

    tbody.appendChild(row);

    // Cap at 200 rows in DOM
    while (tbody.children.length > 200) {
      tbody.removeChild(tbody.firstChild);
    }

    if (countEl) {
      countEl.textContent = "(" + view.step + " steps)";
    }

    // Auto-scroll trace table container
    var container = tbody.closest(".trace-table-container");
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function resetTrace() {
    var tbody = document.getElementById("trace-tbody");
    var countEl = document.getElementById("trace-row-count");
    if (tbody) tbody.innerHTML = "";
    if (countEl) countEl.textContent = "(0 steps)";
  }

  // Master Render Function
  function renderView(view, prevView, machine, values) {
    // 1. State readout
    var stateDisplay = document.getElementById("state-display");
    var stateId = document.getElementById("state-id");
    if (stateDisplay) {
      if (view.state && view.state.sub) {
        stateDisplay.textContent = view.state.label + " · " + view.state.sub;
      } else {
        stateDisplay.textContent = view.state ? view.state.label : "";
      }
    }
    if (stateId) {
      stateId.textContent = view.state ? view.state.id : "";
    }

    // 2. Step counter
    var counterEl = document.getElementById("step-counter");
    if (counterEl) {
      counterEl.textContent = "STEP " + view.step;
    }

    // 3. Multiplier phase stepper & macro card handling
    var stepperContainer = document.getElementById("phase-stepper-container");
    var macroCard = document.getElementById("macro-card");
    var rulesWrapper = document.getElementById("rules-table-wrapper");

    if (machine.kind === "composite") {
      if (stepperContainer) stepperContainer.style.display = "block";
      // Update phase stepper highlight
      var steps = document.querySelectorAll(".phase-step");
      steps.forEach(function (stepEl) {
        var phaseKey = stepEl.getAttribute("data-phase");
        stepEl.classList.remove("active", "skipped");
        if (view.phase && view.phase.id === phaseKey) {
          stepEl.classList.add("active");
        }
        if (view.phase && view.phase.skipped && view.phase.skipped.indexOf(phaseKey) !== -1) {
          stepEl.classList.add("skipped");
        }
      });

      // If in macro phase, show macro card and hide rules table
      if (view.nextMacro) {
        if (macroCard) {
          macroCard.style.display = "block";
          var mTitle = document.getElementById("macro-title");
          var mDesc = document.getElementById("macro-desc");
          if (mTitle) mTitle.textContent = view.nextMacro.label;
          if (mDesc) mDesc.textContent = view.nextMacro.desc;
        }
        if (rulesWrapper) rulesWrapper.style.display = "none";
      } else {
        if (macroCard) macroCard.style.display = "none";
        if (rulesWrapper) rulesWrapper.style.display = "flex";
        renderRulesTable(machine, view);
      }
    } else {
      if (stepperContainer) stepperContainer.style.display = "none";
      if (macroCard) macroCard.style.display = "none";
      if (rulesWrapper) rulesWrapper.style.display = "flex";
      renderRulesTable(machine, view);
    }

    // 4. Tape rendering
    renderTapes(machine, view, prevView);

    // 5. Lamps
    updateLamps(view, prevView);

    // 6. Explain bar
    renderExplain(view);

    // 7. Result banner
    renderResult(view, machine, values);

    // 8. Hardware card
    renderHardware(view, machine);

    // 9. Trace log
    if (view.step > 0 && (!prevView || view.step !== prevView.step)) {
      renderTrace(view);
    }
  }

  // Expose UI functions
  TM.ui.describeEffect = describeEffect;
  TM.ui.renderView = renderView;
  TM.ui.renderRulesTable = renderRulesTable;
  TM.ui.renderTapes = renderTapes;
  TM.ui.renderExplain = renderExplain;
  TM.ui.renderResult = renderResult;
  TM.ui.renderHardware = renderHardware;
  TM.ui.renderTrace = renderTrace;
  TM.ui.resetTrace = resetTrace;

  if (typeof module !== "undefined" && module.exports) module.exports = TM;
})(typeof globalThis !== "undefined" ? globalThis : this);
