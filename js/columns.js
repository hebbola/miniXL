/* columns.js — Operaciones sobre columnas (Σ, Ø, ↑, ↓, #)
   Responsabilidad:
     - Abrir modal de selección de operación al hacer clic en el header de una columna
     - Aplicar la operación elegida
   Fase 1: permitirá elegir rango específico (no toda la columna).
   Expone: window.Columns
*/
(function () {
    'use strict';

    var activeCol = null;

    // ---------- Abrir modal de operaciones ----------
    function openOperationModal(colIndex) {
        activeCol = colIndex;
        var colName = window.State.getColName(colIndex);
        window.showModal(
            'Seleccionar operación',
            'Elige la agregación para la columna ' + colName + ':',
            { showOperationsOptions: true }
        );
    }

    // ---------- Aplicar operación elegida ----------
    function selectColumnOperation(op) {
        window.Modal.hide();
        if (activeCol === null) return;

        var sheet = window.State.getCurrentSheet();
        sheet.operations[activeCol] = op;
        window.State.saveState();

        window.Grid.render();
        window.Selection.paintSelection();

        activeCol = null;
    }

    // ---------- Delegación de eventos ----------
    function bindDelegatedEvents() {
        // Click en el botón de operación de la columna (data-col-op="N")
        document.addEventListener('click', function (e) {
            var el = e.target.closest('[data-col-op]');
            if (!el) return;
            var c = parseInt(el.dataset.colOp, 10);
            openOperationModal(c);
        });

        // Click en cada operación del modal (data-op="SUM" | "AVG" | ...)
        var opsContainer = document.getElementById('modal-operations-container');
        if (opsContainer) {
            opsContainer.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-op]');
                if (!btn) return;
                selectColumnOperation(btn.dataset.op);
            });
        }
    }

    // API pública
    window.Columns = {
        openOperationModal: openOperationModal,
        selectColumnOperation: selectColumnOperation,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
