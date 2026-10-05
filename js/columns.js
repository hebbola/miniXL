/* columns.js — Modal de operaciones + WAVG + chips de peso + hardcodeo
   Expone: window.Columns */
(function () {
    'use strict';

    var S = window.state;

    var activeCol = null;
    var selectedWeights = [];  // columnas elegidas como peso
    var uiState = 'idle';      // 'idle' | 'weights-open'

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

        // Precargar pesos si la columna ya es WAVG
        var current = window.State.getOp(colIndex);
        if (current && current.op === 'WAVG' && current.weights) {
            selectedWeights = current.weights.slice();
            openWeightsUI();
            renderChips();
        }
    }

    function resetOperationsUI() {
        var strip = document.getElementById('weights-strip');
        if (strip) strip.classList.add('hidden');
        var container = document.getElementById('modal-operations-container');
        if (container) container.classList.remove('space-y-4');
    }

    // ---------- Abrir franja de pesos ----------
    function openWeightsUI() {
        uiState = 'weights-open';
        var strip = document.getElementById('weights-strip');
        if (strip) strip.classList.remove('hidden');
        renderChips();
    }

    // ---------- Renderizar chips de columna ----------
    function renderChips() {
        var container = document.getElementById('weights-chips');
        if (!container) return;

        var sheet = window.State.getCurrentSheet();
        var html = '';

        for (var c = 0; c < S.cols; c++) {
            // No puede ser peso ella misma
            if (c === activeCol) continue;

            // No puede ser peso si es una columna calculada
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

    // ---------- Click en chip ----------
    function toggleWeightChip(colIndex) {
        var sheet = window.State.getCurrentSheet();
        if (sheet.operations[colIndex]) return; // bloqueado

        var i = selectedWeights.indexOf(colIndex);
        if (i === -1) selectedWeights.push(colIndex);
        else selectedWeights.splice(i, 1);

        renderChips();
    }

    // ---------- Hardcodear columnas que van a ser peso ----------
    function hardcodeWeightColumns(weights) {
        var sheet = window.State.getCurrentSheet();

        weights.forEach(function (wCol) {
            // Si ya es calculada → hardcodear
            if (sheet.operations[wCol]) {
                var opObj = window.State.getOp(wCol);
                // Recalcular fila a fila SOLO si es operación fila-a-fila (no aplica aquí)
                // Como las ops actuales (SUM/AVG/etc) son de columna, "hardcodear" una
                // columna calculada por columna no tiene sentido fila a fila.
                // En este diseño, las columnas calculadas no aportan valor por fila,
                // así que hardcodeamos cada fila con el valor crudo que tuviera.
                // En la práctica: si la columna estaba calculada, sus celdas están vacías.
                // → dejamos como están y solo borramos la operación.
                window.State.clearColOperation(wCol);
            }
        });
    }

    // ---------- Aplicar operación elegida ----------
    function selectColumnOperation(op) {
        if (op === 'WAVG') {
            // Mostrar franja de pesos, no cerrar modal
            if (uiState !== 'weights-open') {
                openWeightsUI();
                return;
            }
            // Ya estaba abierta: no aplicar aún; el usuario debe pulsar Aceptar
            return;
        }

        // Operación normal: aplicar directo y cerrar
        applyOperation({ op: op });
        window.Modal.hide();
    }

    // ---------- Botón Aceptar del modal para WAVG ----------
    function confirmWAVG() {
        if (!selectedWeights.length) {
            // Sin pesos → cancelar WAVG, no hacer nada
            window.Modal.hide();
            return;
        }
        applyOperation({ op: 'WAVG', weights: selectedWeights.slice() });
        window.Modal.hide();
    }

    function applyOperation(opObj) {
        if (activeCol === null) return;

        // Si va a llevar pesos, primero hay que liberar las columnas peso
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

    // ---------- Delegación de eventos ----------
    function bindDelegatedEvents() {
        // Click en header de columna → abrir modal
        document.addEventListener('click', function (e) {
            var el = e.target.closest('[data-col-op]');
            if (!el) return;
            var c = parseInt(el.dataset.colOp, 10);
            openOperationModal(c);
        });

        // Click en botones de operación del modal
        var opsContainer = document.getElementById('modal-operations-container');
        if (opsContainer) {
            opsContainer.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-op]');
                if (!btn) return;
                selectColumnOperation(btn.dataset.op);
            });
        }

        // Click en chips de peso (delegado)
        var chipsContainer = document.getElementById('weights-chips');
        if (chipsContainer) {
            chipsContainer.addEventListener('click', function (e) {
                var chip = e.target.closest('[data-weight-col]');
                if (!chip || chip.classList.contains('disabled')) return;
                toggleWeightChip(parseInt(chip.dataset.weightCol, 10));
            });
        }

        // Interceptar botón Aceptar del modal cuando WAVG está abierto
        var modalOk = document.getElementById('modal-ok');
        if (modalOk) {
            // Usamos captura para ejecutar antes que el handler de modal.js
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
