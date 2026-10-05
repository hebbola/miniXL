/* cells.js — Comportamiento de las celdas
   Responsabilidad:
     - Editar valor (input → state)
     - Navegación con teclado (flechas, Enter, Tab)
     - Cambiar modo de teclado (numérico / texto)
   Expone: window.Cells
*/
(function () {
    'use strict';

    var S = window.state;

    // ---------- Edición de valor ----------
    function onInput(e) {
        var input = e.target;
        var r = parseInt(input.dataset.row, 10);
        var c = parseInt(input.dataset.col, 10);
        var value = input.value;

        window.State.setCellValue(r, c, value);
        window.Grid.updateColumnSummary(c);

        // Fase 2: si empieza por '=', avisar a formulas.js
        if (window.Formulas && window.Formulas.onCellEdited) {
            window.Formulas.onCellEdited(r, c, value);
        }
    }

    // ---------- Navegación ----------
    function onKeyDown(e) {
        var input = e.target;
        var r = parseInt(input.dataset.row, 10);
        var c = parseInt(input.dataset.col, 10);
        var targetR = r;
        var targetC = c;

        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.keyCode === 13) {
            targetR = Math.min(S.rows - 1, r + 1);
            e.preventDefault();
        } else if (e.key === 'ArrowUp') {
            targetR = Math.max(0, r - 1);
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && input.selectionEnd === input.value.length) {
            targetC = Math.min(S.cols - 1, c + 1);
            e.preventDefault();
        } else if (e.key === 'ArrowLeft' && input.selectionStart === 0) {
            targetC = Math.max(0, c - 1);
            e.preventDefault();
        } else if (e.key === 'Tab') {
            targetR = Math.min(S.rows - 1, r + 1);
            e.preventDefault();
        }

        if (targetR !== r || targetC !== c) {
            window.Selection.selectCell(targetR, targetC, true);
        }
    }

    // ---------- Foco ----------
    function onFocus(e) {
        var input = e.target;
        var r = parseInt(input.dataset.row, 10);
        var c = parseInt(input.dataset.col, 10);
        window.Selection.selectCell(r, c, false);
    }

    // ---------- Cambiar teclado (numérico / texto) ----------
    function toggleKeyboardType(r, c, e) {
        if (e) e.stopPropagation();
        var sheet = window.State.getCurrentSheet();
        sheet.keyboardMode = sheet.keyboardMode === 'numeric' ? 'text' : 'numeric';
        var numeric = sheet.keyboardMode === 'numeric';
        window.State.saveState();

        document.querySelectorAll('.cell-input').forEach(function (i) {
            i.setAttribute('inputmode', numeric ? 'decimal' : 'text');
        });
        document.querySelectorAll('.keyboard-toggle-btn').forEach(function (btn) {
            btn.classList.toggle('active-numeric', numeric);
        });

        var input = document.getElementById('cell_' + r + '_' + c);
        if (input) {
            input.blur();
            setTimeout(function () { input.focus(); }, 30);
        }
    }

    // ---------- Delegación global ----------
    // Se llama una sola vez desde main.js
    function bindDelegatedEvents() {
        var table = document.getElementById('spreadsheet-table');
        if (!table) return;

        // input
        table.addEventListener('input', function (e) {
            if (e.target.classList.contains('cell-input')) onInput(e);
        });

        // keydown
        table.addEventListener('keydown', function (e) {
            if (e.target.classList.contains('cell-input')) onKeyDown(e);
        });

        // focus (captura porque no burbujea)
        table.addEventListener('focusin', function (e) {
            if (e.target.classList.contains('cell-input')) onFocus(e);
        });

        // click en botón 123 (delegado por data-attribute)
        table.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-toggle-kb]');
            if (!btn) return;
            var parts = btn.dataset.toggleKb.split('_');
            toggleKeyboardType(parseInt(parts[0], 10), parseInt(parts[1], 10), e);
        });
    }

    // API pública
    window.Cells = {
        bindDelegatedEvents: bindDelegatedEvents,
        toggleKeyboardType: toggleKeyboardType
    };
})();
