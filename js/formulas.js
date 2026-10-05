/* formulas.js — Evaluación de fórmulas de celda (Fase 2)
   Estado actual: STUB — no evalúa nada, solo expone la API.
   Fase 2 implementará:
     - Parser: "=SUM(A1:A10)", "=A1+B2", "=AVG(B1:B5)*2"
     - Evaluador con manejo de errores (#REF!, #DIV/0!, #NAME?)
     - Grafo de dependencias y recálculo automático
     - Detección de ciclos
   Expone: window.Formulas
*/
(function () {
    'use strict';

    // ¿La cadena parece una fórmula?
    function isFormula(value) {
        return typeof value === 'string' && value.length > 1 && value.charAt(0) === '=';
    }

    // Placeholder: en Fase 2 devolverá el valor calculado o un error tipo #REF!
    function evaluate(/* formulaText, sheet */) {
        return '#N/A';
    }

    // Hook llamado desde cells.js cada vez que se edita una celda.
    // En Fase 2 recalculará dependencias y refrescará el grid.
    function onCellEdited(/* row, col, value */) {
        // no-op por ahora
    }

    // ¿Esta celda tiene una fórmula y por tanto su input debería
    // mostrar el texto de la fórmula pero un span el resultado?
    // Fase 2 también modificará grid.js para soportar esto.
    function isFormulaCell(row, col) {
        var sheet = window.State.getCurrentSheet();
        var key = window.State.getCellKey(row, col);
        return isFormula(sheet.data[key]);
    }

    // API pública (estable desde ya, aunque sea stub)
    window.Formulas = {
        isFormula: isFormula,
        evaluate: evaluate,
        onCellEdited: onCellEdited,
        isFormulaCell: isFormulaCell
    };
})();
