/* sharing.js — Compartir por URL (#hash + LZ-string) y exportar CSV
   Responsabilidad:
     - Codificar la hoja activa en el hash de la URL
     - Decodificar hash al cargar y crear hoja nueva con los datos
     - Exportar CSV
     - Modal de compartir (delegado)
   Expone: window.Sharing
*/
(function () {
    'use strict';

    var S = window.state;

    // ---------- Codificar hoja actual a payload comprimido ----------
    function encodeCurrentSheet(customName) {
        var sheet = window.State.getCurrentSheet();
        var payload = {
            n: customName || sheet.name,
            d: sheet.data || {},
            o: sheet.operations || {},
            k: sheet.keyboardMode || 'text'
        };
        return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
    }

    // ---------- Procesar hash entrante al cargar la app ----------
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
            var baseName = incoming.n || 'Hoja compartida';

            var newSheet = window.State.addSheet(
                baseName + ' (recibida ' + hh + ':' + mm + ')',
                incoming.d || {},
                incoming.o || {},
                incoming.k || 'text'
            );

            // Limpiar hash para que un refresh no cree otra hoja nueva
            history.replaceState(null, '', location.pathname + location.search);

            // Avisar al usuario tras un pequeño delay (cuando la UI esté lista)
            setTimeout(function () {
                window.showModal('Hoja recibida', 'Se creó "' + newSheet.name + '" con los datos del enlace.');
            }, 250);

            return true;
        } catch (e) {
            console.error('Hash inválido', e);
            return false;
        }
    }

    // ---------- "Enviar por mensaje" ----------
    function shareByMessage() {
        window.Modal.hide();
        var sheet = window.State.getCurrentSheet();

        setTimeout(function () {
            window.showModal('Enviar por mensaje', 'Nombre que verá el receptor:', {
                showInput: true,
                defaultValue: sheet.name,
                callback: function (nombre) {
                    if (!nombre || !nombre.trim()) return;
                    var payload = encodeCurrentSheet(nombre.trim());
                    var base = location.origin + location.pathname;
                    var url = base + '#h=' + payload;
                    var chars = url.length;

                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url).then(function () {
                            window.showModal('Enlace copiado',
                                'Longitud: ' + chars + ' caracteres.\n\nPégalo en tu app de mensajería.');
                        }).catch(function () {
                            window.showModal('Enlace generado',
                                'Copia manualmente:\n\n' + url);
                        });
                    } else {
                        fallbackCopy(url);
                        window.showModal('Enlace copiado',
                            'Longitud: ' + chars + ' caracteres.');
                    }
                }
            });
        }, 100);
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

    // ---------- Delegación de eventos ----------
    function bindDelegatedEvents() {
        var btnOpenShare = document.getElementById('btn-open-share');
        if (btnOpenShare) {
            btnOpenShare.addEventListener('click', function () {
                window.showModal('Compartir', 'Elige el formato con el que deseas compartir o descargar:', {
                    showShareOptions: true
                });
            });
        }

        var btnCsv = document.getElementById('btn-download-csv');
        if (btnCsv) btnCsv.addEventListener('click', downloadCSV);

        var btnShare = document.getElementById('btn-share-message');
        if (btnShare) btnShare.addEventListener('click', shareByMessage);
    }

    // API pública
    window.Sharing = {
        encodeCurrentSheet: encodeCurrentSheet,
        processIncomingHash: processIncomingHash,
        shareByMessage: shareByMessage,
        downloadCSV: downloadCSV,
        bindDelegatedEvents: bindDelegatedEvents
    };
})();
