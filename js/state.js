/* state.js — Estado global + persistencia + gestión de hojas
   Formato de operaciones (nuevo):
     sheet.operations[col] = { op: 'SUM' | 'AVG' | 'MAX' | 'MIN' | 'COUNT' | 'WAVG', weights?: [cols] }
   Expone: window.state, window.State */
(function () {
    'use strict';

    var STORAGE_KEY = 'miniXL_data_v1';

    var state = {
        cols: 20,
        rows: 40,
        sheets: [],
        activeSheetId: null,
        selection: {
            anchor: { row: 0, col: 0 },
            focus:  { row: 0, col: 0 }
        }
    };

    // ---------- Utilidades ----------
    function getColName(index) {
        var name = '';
        var num = index + 1;
        while (num > 0) {
            var modulo = (num - 1) % 26;
            name = String.fromCharCode(65 + modulo) + name;
            num = Math.floor((num - modulo) / 26);
        }
        return name;
    }

    function getCellKey(row, col) {
        return getColName(col) + (row + 1);
    }

    function makeId(prefix) {
        return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    // Normaliza operación al formato objeto
    function normalizeOp(raw) {
        if (raw == null) return null;
        if (typeof raw === 'string') return { op: raw };
        return raw;
    }

    function getOp(col) {
        var sheet = getCurrentSheet();
        return normalizeOp(sheet.operations[col]);
    }

    // ---------- Persistencia ----------
    function loadState() {
        var saved = null;
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}

        if (!saved || !saved.sheets || !saved.sheets.length) {
            saved = {
                sheets: [{
                    id: 'sheet_1',
                    name: 'Hoja 1',
                    data: {},
                    operations: {},
                    keyboardMode: 'text'
                }],
                activeSheetId: 'sheet_1'
            };
        }

        // Migrar operaciones string → objeto
        saved.sheets.forEach(function (s) {
            var ops = s.operations || {};
            var migrated = {};
            Object.keys(ops).forEach(function (k) {
                migrated[k] = normalizeOp(ops[k]);
            });
            s.operations = migrated;
        });

        state.sheets = saved.sheets;
        state.activeSheetId = saved.activeSheetId;

        if (!state.sheets.some(function (s) { return s.id === state.activeSheetId; })) {
            state.activeSheetId = state.sheets[0].id;
        }
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                sheets: state.sheets,
                activeSheetId: state.activeSheetId
            }));
        } catch (e) {}
    }

    // ---------- Hojas ----------
    function getCurrentSheet() {
        return state.sheets.find(function (s) { return s.id === state.activeSheetId; }) || state.sheets[0];
    }

    function setActiveSheet(sheetId) {
        if (state.sheets.some(function (s) { return s.id === sheetId; })) {
            state.activeSheetId = sheetId;
            saveState();
        }
    }

    function addSheet(name, data, operations, keyboardMode) {
        var sheet = {
            id: makeId('sheet'),
            name: name || 'Hoja sin nombre',
            data: data || {},
            operations: operations || {},
            keyboardMode: keyboardMode || 'text'
        };
        state.sheets.push(sheet);
        state.activeSheetId = sheet.id;
        saveState();
        return sheet;
    }

    function deleteSheet(sheetId) {
        if (state.sheets.length <= 1) return false;
        state.sheets = state.sheets.filter(function (s) { return s.id !== sheetId; });
        if (state.activeSheetId === sheetId) {
            state.activeSheetId = state.sheets[0].id;
        }
        saveState();
        return true;
    }

    // ---------- Celdas ----------
    function setCellValue(row, col, value) {
        var sheet = getCurrentSheet();
        var key = getCellKey(row, col);
        if (value === '' || value == null) {
            delete sheet.data[key];
        } else {
            sheet.data[key] = value;
        }
        saveState();
    }

    function getCellValue(row, col) {
        var sheet = getCurrentSheet();
        return sheet.data[getCellKey(row, col)];
    }

    // ¿La columna tiene operación propia?
    function isCalculatedCol(col) {
        var sheet = getCurrentSheet();
        return !!sheet.operations[col];
    }

    // Elimina la operación de una columna (usado al hardcodear)
    function clearColOperation(col) {
        var sheet = getCurrentSheet();
        delete sheet.operations[col];
        saveState();
    }

    // Escribe valor crudo (usado al hardcodear)
    function setRawCell(row, col, value) {
        var sheet = getCurrentSheet();
        var key = getCellKey(row, col);
        if (value === '' || value == null) delete sheet.data[key];
        else sheet.data[key] = String(value);
    }

    // ---------- Init ----------
    loadState();

    window.state = state;
    window.State = {
        STORAGE_KEY: STORAGE_KEY,
        loadState: loadState,
        saveState: saveState,
        getColName: getColName,
        getCellKey: getCellKey,
        makeId: makeId,
        getCurrentSheet: getCurrentSheet,
        setActiveSheet: setActiveSheet,
        addSheet: addSheet,
        deleteSheet: deleteSheet,
        setCellValue: setCellValue,
        getCellValue: getCellValue,
        normalizeOp: normalizeOp,
        getOp: getOp,
        isCalculatedCol: isCalculatedCol,
        clearColOperation: clearColOperation,
        setRawCell: setRawCell
    };
})();
