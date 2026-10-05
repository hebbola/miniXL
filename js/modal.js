/* modal.js — Modal genérico global
   Expone: window.showModal(title, message, options) */
(function () {
    'use strict';

    function showModal(title, message, options) {
        options = options || {};
        var showInput = !!options.showInput;
        var showSheetsList = !!options.showSheetsList;
        var showShareOptions = !!options.showShareOptions;
        var showOperationsOptions = !!options.showOperationsOptions;
        var callback = options.callback || null;
        var defaultValue = options.defaultValue || '';

        var modal = document.getElementById('custom-modal');
        var modalTitle = document.getElementById('modal-title');
        var modalMsg = document.getElementById('modal-message');
        var inputContainer = document.getElementById('modal-input-container');
        var inputField = document.getElementById('modal-input');
        var sheetsContainer = document.getElementById('modal-sheets-container');
        var operationsContainer = document.getElementById('modal-operations-container');
        var shareContainer = document.getElementById('modal-share-container');
        var btnOk = document.getElementById('modal-ok');
        var btnCancel = document.getElementById('modal-cancel');

        btnOk.innerText = 'Aceptar';
        modalTitle.innerText = title;
        modalMsg.innerText = message;
        inputField.value = defaultValue;

        if (showInput || showSheetsList || showShareOptions || showOperationsOptions || callback) {
            btnCancel.classList.remove('hidden');
        } else {
            btnCancel.classList.add('hidden');
        }

        if (showInput) inputContainer.classList.remove('hidden');
        else inputContainer.classList.add('hidden');

        if (showSheetsList) sheetsContainer.classList.remove('hidden');
        else sheetsContainer.classList.add('hidden');

        if (showOperationsOptions) {
            operationsContainer.classList.remove('hidden');
            btnOk.classList.add('hidden');
        } else {
            operationsContainer.classList.add('hidden');
            btnOk.classList.remove('hidden');
        }

        if (showShareOptions) {
            shareContainer.classList.remove('hidden');
            btnOk.classList.add('hidden');
        } else {
            shareContainer.classList.add('hidden');
            btnOk.classList.remove('hidden');
        }

        modal.classList.remove('hidden');
        if (showInput) setTimeout(function () { inputField.focus(); inputField.select(); }, 50);

        var newOk = btnOk.cloneNode(true);
        var newCancel = btnCancel.cloneNode(true);
        btnOk.parentNode.replaceChild(newOk, btnOk);
        btnCancel.parentNode.replaceChild(newCancel, btnCancel);

        newOk.addEventListener('click', function () {
            modal.classList.add('hidden');
            if (callback) {
                if (showInput) callback(inputField.value);
                else callback(true);
            }
        });

        newCancel.addEventListener('click', function () {
            modal.classList.add('hidden');
            if (callback && (showInput || showSheetsList || showShareOptions || showOperationsOptions)) {
                callback(null);
            } else if (callback) {
                callback(false);
            }
        });
    }

    // API pública
    window.showModal = showModal;
    window.Modal = {
        hide: function () {
            var modal = document.getElementById('custom-modal');
            if (modal) modal.classList.add('hidden');
        }
    };
})();
