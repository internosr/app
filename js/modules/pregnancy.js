import {
    diffDays,
    addDays,
    formatDateBR,
    formatWeeksDays,
    parseIgString
} from './utils.js';

/**
 * Calcula a idade gestacional (IG) atual com base na Data da Última Menstruação (DUM).
 */
function calcIgByDUM(dumStr) {
    if (!dumStr) return '';
    const dum = new Date(dumStr);
    if (isNaN(dum)) return '';
    const today = new Date();
    const days = diffDays(today, dum);
    if (days < 0) return '';
    return formatWeeksDays(days);
}

/**
 * Calcula a Data Provável do Parto (DPP) com base na DUM.
 */
function calcDPP(dumStr) {
    if (!dumStr) return '';
    const dum = new Date(dumStr);
    if (isNaN(dum)) return '';
    const dpp = addDays(dum, 280);
    return formatDateBR(dpp);
}

/**
 * Calcula a DPP com base na data e IG de uma ultrassonografia (USG).
 */
function calcDPPFromUsg(usgDateStr, usgIgStr) {
    if (!usgDateStr || !usgIgStr) return '';
    const usgDate = new Date(usgDateStr);
    const usgIgDays = parseIgString(usgIgStr);
    if (isNaN(usgDate) || usgIgDays == null) return '';
    const dppDays = 280 - usgIgDays;
    const dpp = addDays(usgDate, dppDays);
    return formatDateBR(dpp);
}

/**
 * Calcula a IG corrigida com base na data e IG de uma USG, ajustando para a data atual.
 */
function calcIgUsgCorrigida(dataUsgStr, igUsgStr) {
    if (!dataUsgStr || !igUsgStr) return '';
    const data = new Date(dataUsgStr);
    if (isNaN(data)) return '';
    const baseDays = parseIgString(igUsgStr);
    if (baseDays == null) return '';
    const today = new Date();
    const delta = diffDays(today, data);
    const total = baseDays + Math.max(0, delta);
    return formatWeeksDays(total);
}

/**
 * Calcula a idade gestacional considerada (IG) com base na regra de 7 dias.
 */
function calcIgConsiderada(igDumStr, igUsgStr, dumIncerta) {
    if (dumIncerta) {
        return igUsgStr;
    }
    const igDumDays = parseIgString(igDumStr);
    const igUsgDays = parseIgString(igUsgStr);
    if (igDumDays === null || igUsgDays === null) {
        return '';
    }
    const diffDaysAbs = Math.abs(igDumDays - igUsgDays);
    if (diffDaysAbs <= 7) {
        return igDumStr;
    } else {
        return igUsgStr;
    }
}

/**
 * Atualiza os campos de cálculo de gravidez (IG e DPP) com base na DUM ou USG.
 */
function refreshPregCalc(dumInput, dumIncerta, igDum, dpp, dataUsg, igUsg, igUsgAtual, igConsiderada) {
    if (!dumIncerta.checked) {
        igDum.value = calcIgByDUM(dumInput.value);
        dpp.value = calcDPP(dumInput.value);
        dumInput.disabled = false;
    } else {
        igDum.value = '';
        dumInput.value = '';
        dumInput.disabled = true;
        dpp.value = calcDPPFromUsg(dataUsg.value, igUsg.value);
    }
    igUsgAtual.value = calcIgUsgCorrigida(dataUsg.value, igUsg.value);
    if (igConsiderada) {
        igConsiderada.value = calcIgConsiderada(igDum.value, igUsgAtual.value, dumIncerta.checked);
    }
}

export {
    refreshPregCalc,
    calcIgByDUM,
    calcDPPFromUsg
};