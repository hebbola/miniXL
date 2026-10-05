/* clipboard.js — Copiar / pegar rango de celdas
   Estado actual: STUB mínimo (Fase 1 lo implementa completo).
   Responsabilidad futura:
     - Ctrl+C: copia rango seleccionado como TSV (Excel-compatible)
     - Ctrl+V: pega TSV en la celda activa, expandiendo rango
     - Ctrl+X: corta (copia + limpia)
     - Copia interna + interoperabilidad con Excel / Google Sheets
   Expone: window.Clipboard
*/
(function () {
    'use strict';

    var S = window.state;

    // ---------- Serializar rango a TSV ----------
    function rangeToTSV() {
        var range = window.Selection.getRange();
        var sheet = window.State.getCurrentSheet();
        var lines = [];

        for (var r = range.minRow; r <= range.maxRow; r++) {
            var rowArr = [];
            for (var c = range.minCol; c <= range.maxCol; c++) {
                var key = window.State.getCellKey(r, c);
                var val = sheet.data[key];
                rowArr.push(val === undefined ? '' : String(val));
            }
            lines.push(rowArr.join('\t'));
        }
        return lines.join('\n');
    }

    // ---------- Copiar al portapapeles del sistema ----------
    function copyRange() {
        var tsv = rangeToTSV();
        if (!tsv) return;

        // Fallback para navegadores sin clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(tsv).catch(function () {
                fallbackCopy(tsv);
            });
        } else {
            fallbackCopy(tsv);
        }

        // Marca visual temporal
        flashRange('copy');
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta);
    }

    // ---------- Pegar en celda activa ----------
    function pasteRange(text) {
        if (!text) return;

        var startRow = S.selection.focus.row;
        var startCol = S.selection.focus.col;
        var sheet = window.State.getCurrentSheet();

        // Normalizar saltos de línea
        var rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');

        // Quitar última línea si está vacía
        if (rows.length && rows[rows.length - 1] === '') rows.pop();

        for (var r = 0; r < rows.length; r++) {
            var targetR = startRow + r;
            if (targetR >= S.rows) break;

            var cells = rows[r].split('\t');
            for (var c = 0; c < cells.length; c++) {
                var targetC = startCol + c;
                if (targetC >= S.cols) break;

                var key = window.State.getCellKey(targetR, targetC);
                var val = cells[c];
                if (val === '') {
                    delete sheet.data[key];
                } else {
                    sheet.data[key] = val;
                }
            }
        }

        window.State.saveState();
        window.Grid.render();
        window.Selection.paintSelection();

        // Refrescar todos los summaries de columnas afectadas
        for (var cc = 0; cc < S.cols; cc++) {
            window.Grid.updateColumnSummary(cc);
        }
    }

    // ---------- Cortar ----------
    function cutRange() {
        copyRange();
        // Tras copiar, borrar el rango
        var range = window.Selection.getRange();
        var sheet = window.State.getCurrentSheet();
        for (var r = range.minRow; r <= range.maxRow; r++) {
            for (var c = range.minCol; c <= range.maxCol; c++) {
                delete sheet.data[window.State.getCellKey(r, c)];
            }
        }
        window.State.saveState();
        window.Grid.render();
        window.Selection.paintSelection();
        flashRange('cut');
    }

    // ---------- Feedback visual ----------
    function flashRange(kind) {
        var range = window.Selection.getRange();
        var cls = kind === 'cut' ? 'cell-cut-flash' : 'cell-copy-flash';
        for (var r = range.minRow; r <= range.maxRow; r++) {
            for (var c = range.minCol; c <= range.maxCol; c++) {
                var td = document.querySelector('td[data-row="' + r + '"][data-col="' + c + '"]');
                if (!td) continue;
                td.classList.add(cls);
                (function (el) {
                    setTimeout(function () { el.classList.remove(cls); }, 400);
                })(td);
            }
        }
    }

    // ---------- Detectar Ctrl+C / Ctrl+V / Ctrl+X ----------
    function onKeyDown(e) {
        var ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) return;

        var key = e.key.toLowerCase();

        // Si el usuario está editando texto dentro de una celda,
        // dejamos que el navegador maneje copy/paste nativo.
        var target = e.target;
        if (target && target.classList && target.classList.contains('cell-input')) {
            var hasTextSelected = target.selectionStart !== target.selectionEnd;
            if (hasTextSelected) return; // dejar copy nativo
        }

        if (key === 'c') {
            e.preventDefault();
            copyRange();
        } else if (key === 'x') {
            e.preventDefault();
            cutRange();
        } else if (key === 'v') {
            e.preventDefault();
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then(function (text) {
                    pasteRange(text);
                }).catch(function () {
                    // Fallback silencioso: sin permiso de lectura, no hay pegado
                });
            }
        }
    }

    // ---------- Init ----------
    function bindDelegatedEvents() {
        document.addEventListener('keydown', onKeyDown);
    }

    // API pública
    window.Clipboard = {
        copyRange: copyRange,
        pasteRange: pasteRange,
        cutRange: cutRange,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
