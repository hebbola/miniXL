/* sheets.js — Gestión de hojas (crear, cambiar, borrar, listar)
   Responsabilidad:
     - Modal de gestión de hojas
     - Crear hoja nueva (con nombre)
     - Cambiar entre hojas
     - Eliminar hoja
   Expone: window.Sheets
*/
(function () {
    'use strict';

    var S = window.state;

    // ---------- Abrir modal de gestión ----------
    function openManager() {
        var modalTitle = document.getElementById('modal-title');
        var modalMsg = document.getElementById('modal-message');
        var inputContainer = document.getElementById('modal-input-container');
        var sheetsContainer = document.getElementById('modal-sheets-container');
        var operationsContainer = document.getElementById('modal-operations-container');
        var shareContainer = document.getElementById('modal-share-container');
        var modal = document.getElementById('custom-modal');
        var btnOk = document.getElementById('modal-ok');
        var btnCancel = document.getElementById('modal-cancel');

        modalTitle.innerText = 'Gestión de Hojas';
        modalMsg.innerText = 'Selecciona una hoja o crea una nueva:';

        inputContainer.classList.add('hidden');
        shareContainer.classList.add('hidden');
        operationsContainer.classList.add('hidden');
        sheetsContainer.classList.remove('hidden');
        btnCancel.classList.add('hidden');
        btnOk.classList.remove('hidden');
        btnOk.innerText = 'Cerrar';

        renderList();

        modal.classList.remove('hidden');

        // Clonar el botón OK para limpiar listeners viejos
        var newOk = btnOk.cloneNode(true);
        btnOk.parentNode.replaceChild(newOk, btnOk);
        newOk.addEventListener('click', function () {
            modal.classList.add('hidden');
        });
    }

    // ---------- Render de la lista de hojas dentro del modal ----------
    function renderList() {
        var sheetsContainer = document.getElementById('modal-sheets-container');
        var html = '';

        // Botón "Nueva Hoja"
        html += '<div class="flex items-center space-x-2.5 p-2.5 rounded-2xl border border-dashed border-pine-green/60 bg-pine-light hover:bg-pine-light/80 transition cursor-pointer mb-2" data-action="new-sheet">';
        html += '<div class="w-7 h-7 rounded-full bg-pine-green text-white flex items-center justify-center font-bold text-sm">+</div>';
        html += '<span class="text-sm font-semibold text-pine-green">Nueva Hoja</span>';
        html += '</div>';

        // Lista de hojas
        html += S.sheets.map(function (s) {
            var isActive = s.id === S.activeSheetId;
            return '<div class="flex items-center justify-between p-2.5 rounded-2xl border ' +
                (isActive ? 'border-pine-green bg-pine-light' : 'border-slate-100 bg-slate-50 hover:bg-slate-100') +
                ' transition">' +
                '<div class="flex items-center space-x-2.5 cursor-pointer flex-1" data-action="switch-sheet" data-sheet-id="' + s.id + '">' +
                    '<div class="w-2.5 h-2.5 rounded-full ' + (isActive ? 'bg-pine-green' : 'bg-slate-300') + '"></div>' +
                    '<span class="text-sm font-medium ' + (isActive ? 'text-pine-green font-bold' : 'text-slate-700') + '">' + escapeHtml(s.name) + '</span>' +
                '</div>' +
                '<button class="w-8 h-8 rounded-full hover:bg-red-100 flex items-center justify-center text-slate-400 hover:text-red-600 transition" data-action="delete-sheet" data-sheet-id="' + s.id + '" title="Eliminar hoja">' +
                    '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>' +
                '</button>' +
            '</div>';
        }).join('');

        sheetsContainer.innerHTML = html;
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // ---------- Crear hoja nueva ----------
    function createNew() {
        // Cerrar el modal de gestión para mostrar el de nombre
        window.Modal.hide();
        setTimeout(function () {
            window.showModal('Nueva hoja', 'Nombre de la nueva hoja:', {
                showInput: true,
                defaultValue: 'Hoja ' + (S.sheets.length + 1),
                callback: function (sheetName) {
                    if (!sheetName || !sheetName.trim()) return;
                    window.State.addSheet(sheetName.trim());
                    window.Grid.render();
                    window.Selection.selectCell(0, 0, false);
                }
            });
        }, 100);
    }

    // ---------- Cambiar de hoja ----------
    function switchTo(sheetId) {
        window.State.setActiveSheet(sheetId);
        window.Grid.render();
        window.Selection.selectCell(0, 0, false);
        window.Modal.hide();
    }

    // ---------- Eliminar hoja ----------
    function deleteById(sheetId) {
        if (S.sheets.length <= 1) {
            window.showModal('Aviso', 'No puedes eliminar la única hoja existente.');
            return;
        }
        var ok = window.State.deleteSheet(sheetId);
        if (!ok) return;

        window.Grid.render();
        window.Selection.selectCell(0, 0, false);
        renderList();
        // Mantener el modal de gestión abierto
    }

    // ---------- Delegación de eventos del modal de gestión ----------
    function bindDelegatedEvents() {
        var btnSheetsManager = document.getElementById('btn-sheets-manager');
        if (btnSheetsManager) {
            btnSheetsManager.addEventListener('click', openManager);
        }

        var sheetsContainer = document.getElementById('modal-sheets-container');
        if (sheetsContainer) {
            sheetsContainer.addEventListener('click', function (e) {
                var el = e.target.closest('[data-action]');
                if (!el) return;
                var action = el.dataset.action;

                if (action === 'new-sheet') {
                    createNew();
                } else if (action === 'switch-sheet') {
                    switchTo(el.dataset.sheetId);
                } else if (action === 'delete-sheet') {
                    e.stopPropagation();
                    deleteById(el.dataset.sheetId);
                }
            });
        }
    }

    // API pública
    window.Sheets = {
        openManager: openManager,
        createNew: createNew,
        switchTo: switchTo,
        deleteById: deleteById,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
