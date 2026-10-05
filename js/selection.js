/* selection.js — Selección de celdas, rangos, arrastre (pointer events)
   Expone: window.Selection */
(function () {
    'use strict';

    var S = window.state;

    var dragState = null;

    // ---------- Helpers ----------
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

    function isSingleCell() { return !hasRange(); }

    // ---------- Pintado ----------
    function clearHighlight() {
        document.querySelectorAll('td.cell-selected, td.cell-in-range').forEach(function (td) {
            td.classList.remove('cell-selected', 'cell-in-range');
        });
    }

    function removeHandles() {
        document.querySelectorAll('.drag-handle, .edge-handle').forEach(function (el) { el.remove(); });
    }

    function makeEdge(side) {
        var el = document.createElement('div');
        el.className = 'edge-handle ' + side;
        el.dataset.handle = side;
        return el;
    }

    function addHandles() {
        var r = getRange();
        var td = document.querySelector('td[data-row="' + r.maxRow + '"][data-col="' + r.maxCol + '"]');
        if (!td) return;

        var drag = document.createElement('div');
        drag.className = 'drag-handle';
        drag.dataset.handle = 'drag';
        td.appendChild(drag);

        if (!hasRange()) return;

        var topTd   = document.querySelector('td[data-row="' + r.minRow + '"][data-col="' + r.minCol + '"]');
        var botTd   = document.querySelector('td[data-row="' + r.maxRow + '"][data-col="' + r.minCol + '"]');
        var leftTd  = document.querySelector('td[data-row="' + r.minRow + '"][data-col="' + r.minCol + '"]');
        var rightTd = document.querySelector('td[data-row="' + r.minRow + '"][data-col="' + r.maxCol + '"]');

        if (topTd)   topTd.appendChild(makeEdge('top'));
        if (botTd)   botTd.appendChild(makeEdge('bottom'));
        if (leftTd)  leftTd.appendChild(makeEdge('left'));
        if (rightTd) rightTd.appendChild(makeEdge('right'));
    }

    function paintSelection() {
        clearHighlight();
        removeHandles();

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

        addHandles();

        if (window.UI && window.UI.updateHeaderMode) {
            window.UI.updateHeaderMode(hasRange());
        }
    }

    // ---------- API ----------
    function setAnchor(row, col) {
        S.selection.anchor = { row: row, col: col };
        S.selection.focus  = { row: row, col: col };
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
            var targetTop  = container.scrollTop  + (tdRect.top  - containerRect.top)  - (containerRect.height / 2) + (tdRect.height / 2);
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

    function clearSelection() {
        selectCell(S.selection.anchor.row, S.selection.anchor.col, false);
    }

    // ---------- Detección de celda bajo un punto ----------
    function cellFromPoint(x, y) {
        var el = document.elementFromPoint(x, y);
        if (!el) return null;
        var td = el.closest ? el.closest('td[data-row]') : null;
        if (!td) return null;
        return {
            row: parseInt(td.dataset.row, 10),
            col: parseInt(td.dataset.col, 10)
        };
    }

    // ---------- Pointer Events ----------
    function onPointerDown(e) {
        // Solo botón principal (o touch)
        if (e.pointerType === 'mouse' && e.button !== 0) return;

        var handle = e.target.dataset ? e.target.dataset.handle : null;

        if (handle === 'drag') {
            e.preventDefault();
            e.stopPropagation();
            dragState = {
                mode: 'extend',
                anchorRow: S.selection.anchor.row,
                anchorCol: S.selection.anchor.col,
                pointerId: e.pointerId
            };
            attachDragListeners();
            return;
        }

        if (handle) {
            e.preventDefault();
            e.stopPropagation();
            var range = getRange();
            dragState = {
                mode: 'move',
                anchorRow: range.minRow,
                anchorCol: range.minCol,
                endRow: range.maxRow,
                endCol: range.maxCol,
                pointerId: e.pointerId
            };
            attachDragListeners();
            return;
        }
    }

    function attachDragListeners() {
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
    }

    function detachDragListeners() {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
    }

    function onPointerMove(e) {
        if (!dragState) return;
        if (e.pointerId !== dragState.pointerId) return;

        e.preventDefault();

        var cell = cellFromPoint(e.clientX, e.clientY);
        if (!cell) return;

        if (dragState.mode === 'extend') {
            S.selection.anchor = { row: dragState.anchorRow, col: dragState.anchorCol };
            S.selection.focus  = { row: cell.row, col: cell.col };
            paintSelection();
        } else if (dragState.mode === 'move') {
            var rSpan = dragState.endRow - dragState.anchorRow;
            var cSpan = dragState.endCol - dragState.anchorCol;

            var newAnchorRow = Math.max(0, Math.min(S.rows - 1 - rSpan, cell.row));
            var newAnchorCol = Math.max(0, Math.min(S.cols - 1 - cSpan, cell.col));

            S.selection.anchor = { row: newAnchorRow, col: newAnchorCol };
            S.selection.focus  = { row: newAnchorRow + rSpan, col: newAnchorCol + cSpan };
            paintSelection();
        }
    }

    function onPointerUp(e) {
        if (dragState && e.pointerId !== dragState.pointerId) return;
        dragState = null;
        detachDragListeners();
    }

    // ---------- Init ----------
    function bindDelegatedEvents() {
        var table = document.getElementById('spreadsheet-table');
        if (!table) return;
        table.addEventListener('pointerdown', onPointerDown);
        // Deshabilitar gestos nativos de scroll sobre los handles
        table.style.touchAction = 'pan-x pan-y';
    }

    setTimeout(function () { setAnchor(0, 0); }, 0);

    window.Selection = {
        getRange: getRange,
        isCellInRange: isCellInRange,
        hasRange: hasRange,
        isSingleCell: isSingleCell,
        setAnchor: setAnchor,
        setFocus: setFocus,
        selectCell: selectCell,
        clearSelection: clearSelection,
        paintSelection: paintSelection,
        clearHighlight: clearHighlight,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
