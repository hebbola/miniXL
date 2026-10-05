/* selection.js — Selección de celdas y rangos
   Responsabilidad:
     - Marcar/desmarcar celda activa
     - Detectar y pintar rango (anchor → focus)
     - Exponer helpers de rango para clipboard.js y columns.js
   Expone: window.Selection
*/
(function () {
    'use strict';

    var S = window.state;

    // ---------- Helpers de rango ----------
    function getRange() {
        var a = S.selection.anchor;
        var f = S.selection.focus;
        return {
            minRow: Math.min(a.row, f.row),
            maxRow: Math.max(a.row, f.row),
            minCol: Math.min(a.col, f.col),
            maxCol: Math.max(a.col, f.col)
        };
    }

    function isCellInRange(row, col) {
        var r = getRange();
        return row >= r.minRow && row <= r.maxRow && col >= r.minCol && col <= r.maxCol;
    }

    function hasRange() {
        var a = S.selection.anchor;
        var f = S.selection.focus;
        return a.row !== f.row || a.col !== f.col;
    }

    // ---------- Pintado visual ----------
    function clearHighlight() {
        document.querySelectorAll('td.cell-selected, td.cell-in-range').forEach(function (td) {
            td.classList.remove('cell-selected', 'cell-in-range');
        });
    }

    function paintSelection() {
        clearHighlight();
        var range = getRange();

        for (var r = range.minRow; r <= range.maxRow; r++) {
            for (var c = range.minCol; c <= range.maxCol; c++) {
                var td = document.querySelector('td[data-row="' + r + '"][data-col="' + c + '"]');
                if (!td) continue;
                if (r === S.selection.focus.row && c === S.selection.focus.col) {
                    td.classList.add('cell-selected');
                } else {
                    td.classList.add('cell-in-range');
                }
            }
        }
    }

    // ---------- API principal ----------
    function setAnchor(row, col) {
        S.selection.anchor = { row: row, col: col };
        S.selection.focus = { row: row, col: col };
        paintSelection();
    }

    function setFocus(row, col) {
        S.selection.focus = { row: row, col: col };
        paintSelection();
    }

    function selectCell(row, col, focusInput) {
        if (focusInput === undefined) focusInput = true;

        setAnchor(row, col);

        var input = document.getElementById('cell_' + row + '_' + col);
        if (!input) return;

        var container = document.getElementById('grid-container');
        if (container) {
            var td = input.parentElement.parentElement;
            var tdRect = td.getBoundingClientRect();
            var containerRect = container.getBoundingClientRect();
            var targetLeft = container.scrollLeft + (tdRect.left - containerRect.left) - (containerRect.width / 2) + (tdRect.width / 2);
            var targetTop = container.scrollTop + (tdRect.top - containerRect.top) - (containerRect.height / 2) + (tdRect.height / 2);
            container.scrollTo({
                left: Math.max(0, targetLeft),
                top: Math.max(0, targetTop),
                behavior: 'smooth'
            });
        }

        if (focusInput) {
            setTimeout(function () {
                input.focus();
                input.select();
            }, 50);
        }
    }

    // ---------- Init ----------
    // Arrancar con la celda A1 seleccionada
    setTimeout(function () { setAnchor(0, 0); }, 0);

    // API pública
    window.Selection = {
        getRange: getRange,
        isCellInRange: isCellInRange,
        hasRange: hasRange,
        setAnchor: setAnchor,
        setFocus: setFocus,
        selectCell: selectCell,
        paintSelection: paintSelection,
        clearHighlight: clearHighlight
    };
})();
