/* grid.js — Render de la tabla + cálculo de operaciones (incluye WAVG)
   Expone: window.Grid */
(function () {
    'use strict';

    var S = window.state;

    var OP_NAMES = {
        'SUM': 'Suma', 'AVG': 'Promedio', 'MAX': 'Máximo',
        'MIN': 'Mínimo', 'COUNT': 'Conteo', 'WAVG': 'Pond.'
    };

    function escapeAttr(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ---------- Valores numéricos de una columna ----------
    function numericValues(colIndex) {
        var sheet = window.State.getCurrentSheet();
        var out = [];
        for (var r = 0; r < S.rows; r++) {
            var v = sheet.data[window.State.getCellKey(r, colIndex)];
            if (v !== undefined && v !== '' && !isNaN(v)) out.push(parseFloat(v));
        }
        return out;
    }

    // ---------- WAVG: promedio ponderado ----------
    function calculateWAVG(colIndex, weightCols) {
        var sheet = window.State.getCurrentSheet();
        var sumVP = 0, sumP = 0;

        for (var r = 0; r < S.rows; r++) {
            var vRaw = sheet.data[window.State.getCellKey(r, colIndex)];
            if (vRaw === undefined || vRaw === '' || isNaN(vRaw)) continue;

            var pesoFila = 0;
            for (var i = 0; i < weightCols.length; i++) {
                var pRaw = sheet.data[window.State.getCellKey(r, weightCols[i])];
                if (pRaw === undefined || pRaw === '') continue;
                var p = parseFloat(pRaw);
                if (isNaN(p)) continue;
                pesoFila += p;
            }
            if (pesoFila === 0) continue;

            sumVP += parseFloat(vRaw) * pesoFila;
            sumP  += pesoFila;
        }

        if (sumP === 0) return '-';
        return (sumVP / sumP).toFixed(2);
    }

    // ---------- Cálculo principal del resumen de columna ----------
    function calculateColumnSummary(colIndex) {
        var opObj = window.State.getOp(colIndex);
        var op = opObj ? opObj.op : 'SUM';
        var values = numericValues(colIndex);

        if (op === 'WAVG') {
            var weights = opObj.weights || [];
            if (!weights.length) return '-';
            return calculateWAVG(colIndex, weights);
        }

        if (values.length === 0) return '-';

        switch (op) {
            case 'SUM':   return values.reduce(function (a, b) { return a + b; }, 0).toLocaleString();
            case 'AVG':   return (values.reduce(function (a, b) { return a + b; }, 0) / values.length).toFixed(2);
            case 'MAX':   return Math.max.apply(null, values).toLocaleString();
            case 'MIN':   return Math.min.apply(null, values).toLocaleString();
            case 'COUNT': return values.length;
            default:      return '-';
        }
    }

    function updateColumnSummary(colIndex) {
        var el = document.getElementById('summary_col_' + colIndex);
        if (el) el.innerText = calculateColumnSummary(colIndex);
    }

    // ---------- Etiqueta de hoja ----------
    function updateSheetSelectorLabel() {
        var sheet = window.State.getCurrentSheet();
        var label = document.getElementById('current-sheet-label');
        if (label && sheet) label.innerText = sheet.name;
    }

    // ---------- Render ----------
    function render() {
        updateSheetSelectorLabel();

        var table = document.getElementById('spreadsheet-table');
        var sheet = window.State.getCurrentSheet();
        var html = '';

        html += '<thead>';

        // Fila 1: resumen de columnas
        html += '<tr>';
        html += '<th class="sticky top-0 left-0 z-30 border border-slate-300 w-12 h-9 text-xs text-slate-600 font-bold text-center select-none bg-slate-200">Σ</th>';
        for (var c = 0; c < S.cols; c++) {
            var opObj = sheet.operations[c] || { op: 'SUM' };
            var op = opObj.op || 'SUM';
            var summaryVal = calculateColumnSummary(c);
            var opTitle = OP_NAMES[op] || 'Suma';

            // Tooltip enriquecido para WAVG
            var title = 'Haz clic para cambiar operación';
            if (op === 'WAVG' && opObj.weights) {
                var wNames = opObj.weights.map(function (w) { return window.State.getColName(w); }).join(', ');
                title = 'Ponderado por: ' + wNames + ' — clic para editar';
            }

            html += '<th class="sticky top-0 z-20 border border-slate-300 h-9 px-2 text-xs font-medium text-slate-700 text-center select-none min-w-[100px] max-w-[100px] w-[100px] bg-slate-50">';
            html += '<div class="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-slate-100 transition rounded" data-col-op="' + c + '" title="' + escapeAttr(title) + '">';
            html += '<span class="text-[10px] text-pine-green font-bold truncate w-full">' + opTitle + '</span>';
            html += '<div class="text-pine-green font-bold text-sm truncate w-full" id="summary_col_' + c + '">' + summaryVal + '</div>';
            html += '</div></th>';
        }
        html += '</tr>';

        // Fila 2: letras
        html += '<tr>';
        html += '<th class="sticky top-9 left-0 z-30 border border-slate-300 w-12 h-8 text-xs text-slate-500 font-semibold text-center select-none bg-slate-100">#</th>';
        for (var c2 = 0; c2 < S.cols; c2++) {
            html += '<th class="sticky top-9 z-20 border border-slate-300 h-8 px-2 text-xs font-semibold text-center select-none min-w-[100px] max-w-[100px] w-[100px] bg-slate-100">';
            html += '<div class="flex items-center justify-center space-x-1">';
            html += '<span class="text-slate-600">' + window.State.getColName(c2) + '</span>';
            html += '</div></th>';
        }
        html += '</tr>';
        html += '</thead>';

        // Body
        html += '<tbody>';
        for (var r = 0; r < S.rows; r++) {
            html += '<tr>';
            html += '<th class="sticky left-0 z-10 border border-slate-300 w-12 h-8 text-xs text-slate-500 font-semibold text-center select-none bg-slate-100">' + (r + 1) + '</th>';
            for (var c3 = 0; c3 < S.cols; c3++) {
                var cellKey = window.State.getCellKey(r, c3);
                var rawVal = sheet.data[cellKey];
                var val = (rawVal === undefined || rawVal === null) ? '' : escapeAttr(rawVal);
                var isNumeric = sheet.keyboardMode === 'numeric';
                var toggleClass = isNumeric ? 'keyboard-toggle-btn active-numeric' : 'keyboard-toggle-btn';

                html += '<td class="border border-slate-300 h-8 p-0 relative bg-white hover:bg-slate-50 transition-colors min-w-[100px] max-w-[100px] w-[100px]" data-row="' + r + '" data-col="' + c3 + '">';
                html += '<div class="cell-container">';
                html += '<input type="text" inputmode="' + (isNumeric ? 'decimal' : 'text') + '" class="cell-input" value="' + val + '" ';
                html += 'data-row="' + r + '" data-col="' + c3 + '" ';
                html += 'id="cell_' + r + '_' + c3 + '" enterkeyhint="next" tabindex="' + (c3 * S.rows + r + 1) + '">';
                html += '<button type="button" class="' + toggleClass + '" data-toggle-kb="' + r + '_' + c3 + '" title="Cambiar teclado">123</button>';
                html += '</div></td>';
            }
            html += '</tr>';
        }
        html += '</tbody>';

        table.innerHTML = html;
    }

    window.Grid = {
        render: render,
        calculateColumnSummary: calculateColumnSummary,
        updateColumnSummary: updateColumnSummary,
        updateSheetSelectorLabel: updateSheetSelectorLabel,
        numericValues: numericValues
    };
})();
