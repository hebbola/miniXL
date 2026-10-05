/* columns.js — Modal de operaciones + WAVG + chips + hardcodeo
   Regla: click en chip aplica WAVG inmediato. Ω hace toggle de la franja.
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

        hideWeightsUI();

        var current = window.State.getOp(colIndex);
        if (current && current.op === 'WAVG' && current.weights) {
            selectedWeights = current.weights.slice(0, 1);
            showWeightsUI();
        }
    }

    // ---------- Franja de pesos ----------
    function hideWeightsUI() {
        uiState = 'idle';
        var strip = document.getElementById('weights-strip');
        if (strip) strip.classList.add('hidden');
    }

    function showWeightsUI() {
        uiState = 'weights-open';
        var strip = document.getElementById('weights-strip');
        if (strip) strip.classList.remove('hidden');
        renderChips();
    }

    function toggleWeightsUI() {
        if (uiState === 'weights-open') hideWeightsUI();
        else showWeightsUI();
    }

    // ---------- Chips ----------
    function renderChips() {
        var container = document.getElementById('weights-chips');
        if (!container) return;

        var html = '';
        for (var c = 0; c < S.cols; c++) {
            if (c === activeCol) continue;
            var isSelected = selectedWeights.indexOf(c) !== -1;
            var classes = 'weight-chip' + (isSelected ? ' selected' : '');
            html += '<div class="' + classes + '" data-weight-col="' + c + '">' +
                    window.State.getColName(c) +
                    '</div>';
        }
        container.innerHTML = html;
    }

    // ---------- Aplicar operación ----------
    function selectColumnOperation(op) {
        if (op === 'WAVG') {
            toggleWeightsUI();
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
        var w = selectedWeights.slice();
        // Cerrar modal PRIMERO
        window.Modal.hide();
        applyOperation({ op: 'WAVG', weights: w });
    }

    function applyOperation(opObj) {
        if (activeCol === null) {
            console.warn('applyOperation: activeCol null');
            return;
        }

        try {
            if (opObj.op === 'WAVG' && opObj.weights && opObj.weights.length) {
                hardcodeWeightColumns(opObj.weights);
            }

            var sheet = window.State.getCurrentSheet();
            sheet.operations[activeCol] = opObj;
            window.State.saveState();

            window.Grid.render();
            if (window.Selection && window.Selection.paintSelection) {
                window.Selection.paintSelection();
            }
        } catch (e) {
            console.error('applyOperation error:', e);
        } finally {
            activeCol = null;
            selectedWeights = [];
            uiState = 'idle';
        }
    }

    function hardcodeWeightColumns(weights) {
        var sheet = window.State.getCurrentSheet();
        weights.forEach(function (wCol) {
            if (!sheet.operations[wCol]) return;
            for (var r = 0; r < S.rows; r++) {
                var key = window.State.getCellKey(r, wCol);
                var v = sheet.data[key];
                if (v !== undefined && v !== '') sheet.data[key] = String(v);
            }
            delete sheet.operations[wCol];
        });
        window.State.saveState();
    }

    // ---------- Delegación GLOBAL ----------
    function bindDelegatedEvents() {

        // 1) Header de columna → abrir modal
        document.addEventListener('click', function (e) {
            var el = e.target.closest && e.target.closest('[data-col-op]');
            if (!el) return;
            var c = parseInt(el.dataset.colOp, 10);
            openOperationModal(c);
        });

        // 2) Botones de operación del modal
        document.addEventListener('click', function (e) {
            var btn = e.target.closest && e.target.closest('#modal-operations-container [data-op]');
            if (!btn) return;
            selectColumnOperation(btn.dataset.op);
        });

        // 3) Chips de peso (delegado a document)
        document.addEventListener('click', function (e) {
            var chip = e.target.closest && e.target.closest('#weights-chips [data-weight-col]');
            if (!chip) return;
            var colIdx = parseInt(chip.dataset.weightCol, 10);
            selectedWeights = [colIdx];
            renderChips();
            confirmWAVG();
        });

        // 4) Botón Aceptar del modal: si estamos en modo pesos, aplicar WAVG
        document.addEventListener('click', function (e) {
            var ok = e.target.closest && e.target.closest('#modal-ok');
            if (!ok) return;
            if (uiState === 'weights-open') {
                e.stopImmediatePropagation();
                e.preventDefault();
                confirmWAVG();
            }
        }, true);
    }

    window.Columns = {
        openOperationModal: openOperationModal,
        selectColumnOperation: selectColumnOperation,
        confirmWAVG: confirmWAVG,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
