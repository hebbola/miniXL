/* main.js — Punto de arranque
   Responsabilidad:
     - Comprobar que todos los módulos estén cargados
     - Procesar hash entrante (hoja compartida por URL)
     - Renderizar grid
     - Conectar todos los eventos delegados
     - Exponer window.gridApp para compatibilidad (debug)
*/
(function () {
    'use strict';

    function boot() {
        // --- Comprobar módulos ---
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

        // --- Procesar hash ANTES de renderizar (crea hoja nueva si aplica) ---
        var fromHash = false;
        try {
            fromHash = window.Sharing.processIncomingHash();
        } catch (e) {
            console.error('Error procesando hash:', e);
        }

        // --- Render inicial ---
        window.Grid.render();

        // --- Seleccionar A1 ---
        window.Selection.selectCell(0, 0, false);

        // --- Conectar eventos delegados ---
        window.Cells.bindDelegatedEvents();
        window.Columns.bindDelegatedEvents();
        window.Clipboard.bindDelegatedEvents();
        window.Sheets.bindDelegatedEvents();
        window.Sharing.bindDelegatedEvents();

        // --- Compatibilidad / debug ---
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

        console.log('%cMiniXL listo', 'color:#1e6b52;font-weight:bold', fromHash ? '(hoja recibida por URL)' : '');
    }

    // --- Arrancar cuando el DOM esté listo ---
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
