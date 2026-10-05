/* clipboard.js — Copiar / cortar / pegar rangos (TSV)
   Interoperable con Excel y Google Sheets.
   Expone: window.Clipboard */
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

    // ---------- Pegar TSV desde celda activa ----------
    function pasteRange(text) {
        if (!text) return;

        var startRow = S.selection.focus.row;
        var startCol = S.selection.focus.col;
        var sheet = window.State.getCurrentSheet();

        var rows = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
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
                if (val === '') delete sheet.data[key];
                else sheet.data[key] = val;
            }
        }

        window.State.saveState();
        window.Grid.render();
        window.Selection.paintSelection();
        refreshAllSummaries();
    }

    function refreshAllSummaries() {
        for (var c = 0; c < S.cols; c++) window.Grid.updateColumnSummary(c);
    }

    // ---------- Acciones públicas (usadas por botones del header) ----------
    function copyRange() {
        var tsv = rangeToTSV();
        copyToClipboard(tsv);
        flashRange('copy');
    }

    function cutRange() {
        var tsv = rangeToTSV();
        copyToClipboard(tsv);

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
        refreshAllSummaries();
        flashRange('cut');
    }

    function pasteFromSystem() {
        // Se dispara el evento paste nativo. En navegadores no seguros
        // solo funciona si el foco está en un input/contenteditable.
        // Alternativa: pedir permiso y leer.
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(function (text) {
                if (text) pasteRange(text);
            }).catch(function () {
                // Silencioso
            });
        }
    }

    // ---------- Copiar al portapapeles del sistema ----------
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).catch(function () {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
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

    // ---------- Feedback visual ----------
    function flashRange(kind) {
        var range = window.Selection.getRange();
        var cls = kind === 'cut' ? 'cell-cut-flash' : 'cell-copy-flash';
        for (var r = range.minRow; r <= range.maxRow; r++) {
            for (var c = range.minCol; c <= range.maxCol; c++) {
                var td = document.querySelector('td[data-row="' + r + '"][data-col="' + c + '"]');
                if (!td) continue;
                (function (el) {
                    el.classList.add(cls);
                    setTimeout(function () { el.classList.remove(cls); }, 400);
                })(td);
            }
        }
    }

    // ---------- Eventos nativos copy / cut / paste ----------
    function onNativeCopy(e) {
        // Si el usuario está editando dentro de un input con texto seleccionado,
        // dejamos pasar el copy nativo.
        var t = e.target;
        if (t && t.classList && t.classList.contains('cell-input')) {
            if (t.selectionStart !== t.selectionEnd) return;
        }

        var tsv = rangeToTSV();
        if (!tsv) return;

        e.clipboardData.setData('text/plain', tsv);
        e.preventDefault();
        flashRange('copy');
    }

    function onNativeCut(e) {
        var t = e.target;
        if (t && t.classList && t.classList.contains('cell-input')) {
            if (t.selectionStart !== t.selectionEnd) return;
        }

        var tsv = rangeToTSV();
        if (!tsv) return;

        e.clipboardData.setData('text/plain', tsv);
        e.preventDefault();

        // Borrar el rango
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
        refreshAllSummaries();
        flashRange('cut');
    }

    function onNativePaste(e) {
        // Igual: si está en un input con foco, dejamos paste nativo
        var t = e.target;
        if (t && t.classList && t.classList.contains('cell-input')) return;

        var text = e.clipboardData.getData('text/plain');
        if (!text) return;

        e.preventDefault();
        pasteRange(text);
    }

    // ---------- Botones del header (modo selección) ----------
    function bindHeaderButtons() {
        var btnCopy  = document.getElementById('btn-sel-copy');
        var btnCut   = document.getElementById('btn-sel-cut');
        var btnPaste = document.getElementById('btn-sel-paste');
        var btnClose = document.getElementById('btn-sel-close');

        if (btnCopy)  btnCopy.addEventListener('click', copyRange);
        if (btnCut)   btnCut.addEventListener('click', cutRange);
        if (btnPaste) btnPaste.addEventListener('click', pasteFromSystem);
        if (btnClose) btnClose.addEventListener('click', function () {
            window.Selection.clearSelection();
        });
    }

    function bindDelegatedEvents() {
        document.addEventListener('copy',  onNativeCopy);
        document.addEventListener('cut',   onNativeCut);
        document.addEventListener('paste', onNativePaste);
        bindHeaderButtons();
    }

    window.Clipboard = {
        copyRange: copyRange,
        cutRange: cutRange,
        pasteRange: pasteRange,
        pasteFromSystem: pasteFromSystem,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
