(function (g) {
  var TM = (g.TM = g.TM || {});

  var currentMachineId = "increment";
  var currentRunner = null;
  var currentValues = {};
  var prevView = null;
  var runIntervalId = null;

  // DOM Elements
  var tabIncrement = document.getElementById("tab-increment");
  var tabAddition = document.getElementById("tab-addition");
  var tabMultiplication = document.getElementById("tab-multiplication");
  var machineSubtitle = document.getElementById("machine-subtitle");
  var footerMacroNote = document.getElementById("footer-macro-note");

  var btnReset = document.getElementById("btn-reset");
  var btnBack = document.getElementById("btn-back");
  var btnStep = document.getElementById("btn-step");
  var btnRun = document.getElementById("btn-run");
  var runIcon = document.getElementById("run-icon");
  var runText = document.getElementById("run-text");
  var btnToEnd = document.getElementById("btn-to-end");
  var speedSlider = document.getElementById("speed-slider");

  var inputFieldsContainer = document.getElementById("input-fields-container");
  var decimalPreviewText = document.getElementById("decimal-preview-text");
  var inputErrorMsg = document.getElementById("input-error-msg");
  var presetsChips = document.getElementById("presets-chips");
  var btnLoad = document.getElementById("btn-load");
  var btnToggleRules = document.getElementById("btn-toggle-rules");
  var rulesScrollArea = document.getElementById("rules-scroll-area");

  function getStepIntervalMs() {
    if (!speedSlider) return 500;
    var val = Number(speedSlider.value);
    // Slider min 80, max 1200. Slow on left, fast on right.
    // Left (80) -> 1200ms; Right (1200) -> 80ms.
    var ms = 1280 - val;
    return Math.max(80, Math.min(1200, ms));
  }

  function pauseSimulation() {
    if (runIntervalId) {
      clearInterval(runIntervalId);
      runIntervalId = null;
    }
    if (btnRun) {
      btnRun.classList.remove("running");
      if (runIcon) runIcon.textContent = "⏵";
      if (runText) runText.textContent = "Run";
    }
  }

  function updateButtonStates(view) {
    var isHalted = view.status === "halted";
    var isStuck = view.status === "stuck";
    var isLimit = view.status === "limit";
    var isStopped = isHalted || isStuck || isLimit;

    if (btnStep) btnStep.disabled = isStopped;
    if (btnRun) btnRun.disabled = isStopped;
    if (btnBack) btnBack.disabled = view.step === 0;
    if (btnToEnd) btnToEnd.disabled = isStopped;
  }

  function render() {
    if (!currentRunner) return;
    var machine = TM.machines[currentMachineId];
    var view = currentRunner.view();
    TM.ui.renderView(view, prevView, machine, currentValues);
    updateButtonStates(view);
    prevView = view;
  }

  function executeStep() {
    if (!currentRunner) return;
    var view = currentRunner.step();
    render();
    if (view.status !== "ready") {
      pauseSimulation();
    }
  }

  function startSimulation() {
    pauseSimulation();
    var view = currentRunner.view();
    if (view.status !== "ready") return;

    if (btnRun) {
      btnRun.classList.add("running");
      if (runIcon) runIcon.textContent = "⏸";
      if (runText) runText.textContent = "Pause";
    }

    var intervalMs = getStepIntervalMs();
    runIntervalId = setInterval(function () {
      executeStep();
    }, intervalMs);
  }

  function toggleRunPause() {
    if (runIntervalId) {
      pauseSimulation();
    } else {
      startSimulation();
    }
  }

  // Input Validation and Live Decimal Preview
  function validateInputs() {
    var machine = TM.machines[currentMachineId];
    if (!machine || !machine.inputs) return false;

    var vals = {};
    var isValid = true;
    var errorText = "";
    var decPreviewParts = [];

    for (var i = 0; i < machine.inputs.length; i++) {
      var inputDef = machine.inputs[i];
      var inputEl = document.getElementById("input-field-" + inputDef.id);
      var val = inputEl ? inputEl.value.trim() : "";
      vals[inputDef.id] = val;

      if (!val) {
        isValid = false;
        errorText = "Field '" + inputDef.label + "' cannot be empty.";
        break;
      }
      if (!/^[01]+$/.test(val)) {
        isValid = false;
        errorText = "Field '" + inputDef.label + "' must contain only binary digits (0 and 1).";
        break;
      }
      if (val.length > inputDef.maxLen) {
        isValid = false;
        errorText = "Field '" + inputDef.label + "' maximum length is " + inputDef.maxLen + " bits.";
        break;
      }

      var dec = BigInt("0b" + TM.normalise(val)).toString();
      decPreviewParts.push(inputDef.label + " = " + dec);
    }

    if (inputErrorMsg) {
      if (!isValid) {
        inputErrorMsg.textContent = errorText;
        inputErrorMsg.style.display = "block";
      } else {
        inputErrorMsg.style.display = "none";
      }
    }

    if (decimalPreviewText) {
      if (isValid) {
        decimalPreviewText.textContent = "= " + decPreviewParts.join(", ");
      } else {
        decimalPreviewText.textContent = "—";
      }
    }

    if (btnLoad) {
      btnLoad.disabled = !isValid;
    }

    return isValid ? vals : false;
  }

  function loadInput(values) {
    pauseSimulation();
    var machine = TM.machines[currentMachineId];
    currentValues = Object.assign({}, values);

    // Populate form fields
    if (machine.inputs) {
      for (var i = 0; i < machine.inputs.length; i++) {
        var inputDef = machine.inputs[i];
        var el = document.getElementById("input-field-" + inputDef.id);
        if (el && currentValues[inputDef.id] !== undefined) {
          el.value = currentValues[inputDef.id];
        }
      }
    }

    validateInputs();
    currentRunner = TM.createRunner(machine, currentValues);
    prevView = null;
    TM.ui.resetTrace();
    render();
  }

  // Render Machine Inputs & Presets Form
  function setupInputPanel() {
    var machine = TM.machines[currentMachineId];
    if (!machine || !inputFieldsContainer) return;

    // 1. Build Inputs
    var inputsHtml = "";
    for (var i = 0; i < machine.inputs.length; i++) {
      var inputDef = machine.inputs[i];
      inputsHtml += '<div class="input-field-group">' +
        '<label class="input-label" for="input-field-' + inputDef.id + '">' + inputDef.label + ' (max ' + inputDef.maxLen + ' bits):</label>' +
        '<input type="text" class="binary-input" id="input-field-' + inputDef.id + '" ' +
        'inputmode="numeric" placeholder="' + (inputDef.placeholder || 'e.g. 1011') + '" ' +
        'maxlength="' + inputDef.maxLen + '" autocomplete="off" spellcheck="false">' +
        '</div>';
    }
    inputFieldsContainer.innerHTML = inputsHtml;

    // Attach live validation
    var fieldEls = inputFieldsContainer.querySelectorAll(".binary-input");
    fieldEls.forEach(function (el) {
      el.addEventListener("input", function () {
        validateInputs();
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          var validated = validateInputs();
          if (validated) loadInput(validated);
        }
      });
    });

    // 2. Build Presets Chips
    if (presetsChips) {
      var presetsHtml = "";
      var presets = machine.presets || [];
      for (var p = 0; p < presets.length; p++) {
        var preset = presets[p];
        presetsHtml += '<button type="button" class="preset-chip" data-preset-idx="' + p + '">' +
          preset.label +
          '</button>';
      }
      presetsChips.innerHTML = presetsHtml;

      var chipEls = presetsChips.querySelectorAll(".preset-chip");
      chipEls.forEach(function (chip) {
        chip.addEventListener("click", function () {
          var idx = Number(chip.getAttribute("data-preset-idx"));
          var chosenPreset = machine.presets[idx];
          if (chosenPreset && chosenPreset.values) {
            loadInput(chosenPreset.values);
          }
        });
      });
    }

    // Load default preset values
    var defaultValues = (machine.presets && machine.presets[0] && machine.presets[0].values) || {};
    loadInput(defaultValues);
  }

  // Switch Machine Tab
  function selectMachine(machineId) {
    if (!TM.machines[machineId]) return;
    pauseSimulation();
    currentMachineId = machineId;

    // Update Tab Buttons
    var tabs = [tabIncrement, tabAddition, tabMultiplication];
    tabs.forEach(function (btn) {
      if (!btn) return;
      var matches = btn.getAttribute("data-machine") === machineId;
      btn.classList.toggle("active", matches);
      btn.setAttribute("aria-selected", matches ? "true" : "false");
    });

    // Subtitle & Footer Macro Note
    if (machineSubtitle) {
      var tapeWord = TM.machines[machineId].tapeCount === 1 ? "1 tape" : TM.machines[machineId].tapeCount + " tapes";
      machineSubtitle.textContent = TM.machines[machineId].title + " · " + tapeWord;
    }
    if (footerMacroNote) {
      footerMacroNote.style.display = machineId === "multiplication" ? "block" : "none";
    }

    setupInputPanel();
  }

  // Wire Control Bar Buttons
  function setupControls() {
    if (btnStep) {
      btnStep.addEventListener("click", function () {
        pauseSimulation();
        executeStep();
      });
    }

    if (btnBack) {
      btnBack.addEventListener("click", function () {
        pauseSimulation();
        if (currentRunner) {
          currentRunner.stepBack();
          render();
        }
      });
    }

    if (btnReset) {
      btnReset.addEventListener("click", function () {
        pauseSimulation();
        if (currentRunner) {
          currentRunner.reset();
          prevView = null;
          TM.ui.resetTrace();
          render();
        }
      });
    }

    if (btnRun) {
      btnRun.addEventListener("click", function () {
        toggleRunPause();
      });
    }

    if (btnToEnd) {
      btnToEnd.addEventListener("click", function () {
        pauseSimulation();
        if (currentRunner) {
          currentRunner.runToEnd();
          render();
        }
      });
    }

    if (speedSlider) {
      speedSlider.addEventListener("input", function () {
        if (runIntervalId) {
          // Restart timer with new interval immediately
          startSimulation();
        }
      });
    }

    if (btnLoad) {
      btnLoad.addEventListener("click", function () {
        var vals = validateInputs();
        if (vals) {
          loadInput(vals);
        }
      });
    }

    if (btnToggleRules && rulesScrollArea) {
      btnToggleRules.addEventListener("click", function () {
        var isExpanded = rulesScrollArea.classList.toggle("expanded");
        btnToggleRules.textContent = isExpanded ? "Collapse rules" : "Show all rules";
      });
    }

    // Machine Tab Click Handlers
    [tabIncrement, tabAddition, tabMultiplication].forEach(function (tab) {
      if (tab) {
        tab.addEventListener("click", function () {
          var id = tab.getAttribute("data-machine");
          selectMachine(id);
        });
      }
    });

    // Keyboard Shortcuts (Space, ArrowRight, ArrowLeft, R)
    window.addEventListener("keydown", function (e) {
      // Ignore if inside an input field
      if (e.target && e.target.tagName === "INPUT") {
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        toggleRunPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        pauseSimulation();
        executeStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        pauseSimulation();
        if (currentRunner) {
          currentRunner.stepBack();
          render();
        }
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        pauseSimulation();
        if (currentRunner) {
          currentRunner.reset();
          prevView = null;
          TM.ui.resetTrace();
          render();
        }
      }
    });
  }

  // App Initialization
  function init() {
    setupControls();
    // Start with Increment tab and preset 1011
    selectMachine("increment");
  }

  // Start after DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  if (typeof module !== "undefined" && module.exports) module.exports = TM;
})(typeof globalThis !== "undefined" ? globalThis : this);
