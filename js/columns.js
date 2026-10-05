/* columns.js — Modal de operaciones + WAVG + chips de peso + hardcodeo
   Expone: window.Columns */
(function () {
    'use strict';

    var S = window.state;

    var activeCol = null;
    var selectedWeights = [];
    var uiState = 'idle';

    // ---------- Abrir modal ----------
    function openOperationModal(colIndex) {
        activeCol = colIndex;
        selectedWeights = [];
        uiState = 'idle';

        var colName = window.State.getColName(colIndex);
        window.showModal(
            'Seleccionar operación',
            'Elige la agregación para la columna ' + colName + ':',
            { showOperationsOptions: true }
        );

        resetOperationsUI();

        var current = window.State.getOp(colIndex);
        if (current && current.op === 'WAVG' && current.weights) {
            selectedWeights = current.weights.slice(0, 1); // solo una
            openWeightsUI();
            renderChips();
        }
    }

    function resetOperationsUI() {
        var strip = document.getElementById('weights-strip');
        if (strip) strip.classList.add('hidden');
    }

    function openWeightsUI() {
        uiState = 'weights-open';
        var strip = document.getElementById('weights-strip');
        if (strip) strip.classList.remove('hidden');
        renderChips();
    }

    // ---------- Chips ----------
    function renderChips() {
        var container = document.getElementById('weights-chips');
        if (!container) return;

        var sheet = window.State.getCurrentSheet();
        var html = '';

        for (var c = 0; c < S.cols; c++) {
            if (c === activeCol) continue;

            var isCalc = !!sheet.operations[c];
            var isSelected = selectedWeights.indexOf(c) !== -1;

            var classes = 'weight-chip';
            if (isCalc) classes += ' disabled';
            else if (isSelected) classes += ' selected';

            html += '<div class="' + classes + '" data-weight-col="' + c + '">' +
                    window.State.getColName(c) +
                    '</div>';
        }

        container.innerHTML = html;
    }

    // ---------- Toggle chip (único) ----------
    function toggleWeightChip(colIndex) {
        var sheet = window.State.getCurrentSheet();
        if (sheet.operations[colIndex]) return;

        if (selectedWeights.length === 1 && selectedWeights[0] === colIndex) {
            selectedWeights = [];
        } else {
            selectedWeights = [colIndex];
        }

        renderChips();
    }

    // ---------- Aplicar operación ----------
    function selectColumnOperation(op) {
        if (op === 'WAVG') {
            if (uiState !== 'weights-open') {
                openWeightsUI();
            }
            return;
        }
        applyOperation({ op: op });
        window.Modal.hide();
    }

    function confirmWAVG() {
        if (!selectedWeights.length) {
            window.Modal.hide();
            return;
        }
        applyOperation({ op: 'WAVG', weights: selectedWeights.slice() });
        window.Modal.hide();
    }

    function applyOperation(opObj) {
        if (activeCol === null) return;

        if (opObj.op === 'WAVG' && opObj.weights && opObj.weights.length) {
            hardcodeWeightColumns(opObj.weights);
        }

        var sheet = window.State.getCurrentSheet();
        sheet.operations[activeCol] = opObj;
        window.State.saveState();

        window.Grid.render();
        window.Selection.paintSelection();

        activeCol = null;
        selectedWeights = [];
        uiState = 'idle';
    }

    function hardcodeWeightColumns(weights) {
        weights.forEach(function (wCol) {
            if (window.State.isCalculatedCol(wCol)) {
                window.State.clearColOperation(wCol);
            }
        });
    }

    // ---------- Delegación ----------
    function bindDelegatedEvents() {
        document.addEventListener('click', function (e) {
            var el = e.target.closest('[data-col-op]');
            if (!el) return;
            var c = parseInt(el.dataset.colOp, 10);
            openOperationModal(c);
        });

        var opsContainer = document.getElementById('modal-operations-container');
        if (opsContainer) {
            opsContainer.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-op]');
                if (!btn) return;
                selectColumnOperation(btn.dataset.op);
            });
        }

        var chipsContainer = document.getElementById('weights-chips');
        if (chipsContainer) {
            chipsContainer.addEventListener('click', function (e) {
                var chip = e.target.closest('[data-weight-col]');
                if (!chip || chip.classList.contains('disabled')) return;
                toggleWeightChip(parseInt(chip.dataset.weightCol, 10));
            });
        }

        var modalOk = document.getElementById('modal-ok');
        if (modalOk) {
            modalOk.addEventListener('click', function (e) {
                if (uiState === 'weights-open') {
                    e.stopImmediatePropagation();
                    confirmWAVG();
                }
            }, true);
        }
    }

    window.Columns = {
        openOperationModal: openOperationModal,
        selectColumnOperation: selectColumnOperation,
        confirmWAVG: confirmWAVG,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
