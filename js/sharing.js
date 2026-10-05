/* sharing.js — Compartir por WhatsApp + CSV
   Expone: window.Sharing */
(function () {
    'use strict';

    var S = window.state;

    // ---------- Codificar hoja ----------
    function encodeCurrentSheet() {
        var sheet = window.State.getCurrentSheet();
        var payload = {
            d: sheet.data || {},
            o: sheet.operations || {},
            k: sheet.keyboardMode || 'text'
        };
        return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    }

    // ---------- Procesar hash entrante ----------
    function processIncomingHash() {
        var hash = location.hash || '';
        if (hash.indexOf('#h=') !== 0) return false;

        try {
            var payload = hash.slice(3);
            var json = LZString.decompressFromEncodedURIComponent(payload);
            if (!json) return false;

            var incoming = JSON.parse(json);
            var now = new Date();
            var hh = String(now.getHours()).padStart(2, '0');
            var mm = String(now.getMinutes()).padStart(2, '0');

            var newSheet = window.State.addSheet(
                'Compartido ' + hh + ':' + mm,
                incoming.d || {},
                incoming.o || {},
                incoming.k || 'text'
            );

            history.replaceState(null, '', location.pathname + location.search);

            setTimeout(function () {
                window.showModal('Hoja recibida', 'Se creó "' + newSheet.name + '".');
            }, 250);

            return true;
        } catch (e) {
            console.error('Hash inválido', e);
            return false;
        }
    }

    // ---------- Enviar por WhatsApp ----------
    function shareByMessage() {
        window.Modal.hide();
        var payload = encodeCurrentSheet();
        var base = location.origin + location.pathname;
        var url = base + '#h=' + payload;
        var text = encodeURIComponent('Hoja MiniXL: ' + url);

        // Detectar móvil
        var isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        if (isMobile) {
            // Abrir WhatsApp nativo con el enlace
            var waUrl = 'whatsapp://send?text=' + text;
            window.location.href = waUrl;

            // Fallback: si en 1.5s no cambió de app, ofrecer copiar
            setTimeout(function () {
                // Nada — si WhatsApp se abrió, el navegador queda en background.
                // Si no, el usuario sigue aquí y puede copiar manualmente.
            }, 1500);
        } else {
            // Desktop: abrir WhatsApp Web
            var waWeb = 'https://wa.me/?text=' + text;
            window.open(waWeb, '_blank');
        }
    }

    // ---------- Exportar CSV ----------
    function downloadCSV() {
        window.Modal.hide();
        var sheet = window.State.getCurrentSheet();
        var csvContent = '';

        for (var r = 0; r < S.rows; r++) {
            var rowArr = [];
            for (var c = 0; c < S.cols; c++) {
                var key = window.State.getCellKey(r, c);
                var val = sheet.data[key] === undefined ? '' : String(sheet.data[key]);
                if (val.indexOf(',') !== -1 || val.indexOf('"') !== -1) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                }
                rowArr.push(val);
            }
            csvContent += rowArr.join(',') + '\n';
        }

        var filename = sheet.name.toLowerCase().replace(/\s+/g, '_') + '.csv';
        saveFile(filename, csvContent, 'text/csv;charset=utf-8;');
    }

    async function saveFile(filename, data, mime) {
        try {
            if (window.claude && window.claude.use) {
                var dl = await window.claude.use('downloads');
                if (dl) {
                    await dl.save({ filename: filename, data: new Blob([data], { type: mime }) });
                    return true;
                }
            }
        } catch (e) {
            if (e && e.code === 'declined') return true;
        }
        var url = URL.createObjectURL(new Blob([data], { type: mime }));
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        return true;
    }

    // ---------- Delegación ----------
    function bindDelegatedEvents() {
        var btnOpenShare = document.getElementById('btn-open-share');
        if (btnOpenShare) {
            btnOpenShare.addEventListener('click', function () {
                window.showModal('Compartir', 'Elige el formato:', {
                    showShareOptions: true
                });
            });
        }

        var btnCsv = document.getElementById('btn-download-csv');
        if (btnCsv) btnCsv.addEventListener('click', downloadCSV);

        var btnShare = document.getElementById('btn-share-message');
        if (btnShare) btnShare.addEventListener('click', shareByMessage);
    }

    window.Sharing = {
        encodeCurrentSheet: encodeCurrentSheet,
        processIncomingHash: processIncomingHash,
        shareByMessage: shareByMessage,
        downloadCSV: downloadCSV,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
