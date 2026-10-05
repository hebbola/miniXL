/* main.js — Punto de arranque
   - Verifica módulos
   - Procesa hash entrante (hoja compartida)
   - Render inicial
   - Conecta eventos delegados
   - Expone UI.updateHeaderMode(hasRange)
*/
(function () {
    'use strict';

    // ---------- UI: cambiar header según selección ----------
    var UI = {
        updateHeaderMode: function (hasRange) {
            var shareBtn = document.getElementById('btn-open-share');
            var selActions = document.getElementById('selection-actions');
            if (!shareBtn || !selActions) return;

            if (hasRange) {
                shareBtn.classList.add('hidden');
                selActions.classList.remove('hidden');
                selActions.classList.add('flex');
            } else {
                shareBtn.classList.remove('hidden');
                selActions.classList.add('hidden');
                selActions.classList.remove('flex');
            }
        }
    };
    window.UI = UI;

    // ---------- Arranque ----------
    function boot() {
        var missing = [];
        if (!window.state)         missing.push('state');
        if (!window.State)         missing.push('State');
        if (!window.Selection)     missing.push('Selection');
        if (!window.Grid)          missing.push('Grid');
        if (!window.Cells)         missing.push('Cells');
        if (!window.Columns)       missing.push('Columns');
        if (!window.Clipboard)     missing.push('Clipboard');
        if (!window.Formulas)      missing.push('Formulas');
        if (!window.Sheets)        missing.push('Sheets');
        if (!window.Sharing)       missing.push('Sharing');
        if (!window.showModal)     missing.push('showModal');
        if (!window.LZString)      missing.push('LZString');

        if (missing.length) {
            console.error('Módulos faltantes:', missing);
            document.body.innerHTML =
                '<div style="padding:2rem;font-family:sans-serif">' +
                '<h2>Error al cargar</h2>' +
                '<p>Faltan módulos: ' + missing.join(', ') + '</p>' +
                '</div>';
            return;
        }

        // Procesar hash antes de render
        var fromHash = false;
        try {
            fromHash = window.Sharing.processIncomingHash();
        } catch (e) {
            console.error('Error procesando hash:', e);
        }

        // Render inicial
        window.Grid.render();

        // Selección inicial (A1)
        window.Selection.selectCell(0, 0, false);

        // Eventos
        window.Cells.bindDelegatedEvents();
        window.Columns.bindDelegatedEvents();
        window.Clipboard.bindDelegatedEvents();
        window.Sheets.bindDelegatedEvents();
        window.Sharing.bindDelegatedEvents();
        window.Selection.bindDelegatedEvents();

        // Header: estado inicial
        UI.updateHeaderMode(false);

        // Debug
        window.gridApp = {
            state: window.state,
            render: window.Grid.render,
            selectCell: window.Selection.selectCell,
            getCurrentSheet: window.State.getCurrentSheet,
            modules: {
                State: window.State,
                Selection: window.Selection,
                Grid: window.Grid,
                Cells: window.Cells,
                Columns: window.Columns,
                Clipboard: window.Clipboard,
                Formulas: window.Formulas,
                Sheets: window.Sheets,
                Sharing: window.Sharing
            }
        };

        console.log('%cMiniXL listo', 'color:#1e6b52;font-weight:bold',
            fromHash ? '(hoja recibida por URL)' : '');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
