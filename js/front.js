// main.js

// ===============================================
// ===== 1. REFERÊNCIAS DO DOM ===================
// ===============================================
const form = document.getElementById('form-prontuario');
const dumInput = document.getElementById('dum');
const dumIncerta = document.getElementById('dum_incerta');
const igDum = document.getElementById('ig-dum');
const dpp = document.getElementById('dpp');
const dataUsg = document.getElementById('data-usg');
const igUsg = document.getElementById('ig-usg');
const igUsgAtual = document.getElementById('ig-usg-atual');
const igConsiderada = document.getElementById('ig-considerada');
const nuligestaToggle = document.getElementById('nuligesta');
const gestacaoInicalToggle = document.getElementById('gestacao_inicial');
const output = document.getElementById('output');
const outputAih = document.getElementById('output-aih');
const searchInput = document.getElementById('search-input');
const savedTableBody = document.getElementById('saved-atendimentos-table').querySelector('tbody');
const pendenciasTableBody = document.querySelector('#pendencias-table tbody');
const btnGerarProntuario = document.getElementById('btn-gerar-prontuario');
const btnPrintPdf = document.getElementById('btn-print-pdf');
const btnGerarAih = document.getElementById('btn-gerar-aih');
const btnCopy = document.getElementById('btn-copy');
const btnCopyAih = document.getElementById('btn-copy-aih');
const btnDownload = document.getElementById('btn-download');
const btnClear = document.getElementById('btn-clear');
const btnSave = document.getElementById('btn-save');

// ===============================================
// ===== 2. IMPORTAÇÕES DOS MÓDULOS ==============
// ===============================================
import {
    startClock,
    showNotification
} from './modules/utils.js';
import {
    setupTagInput,
    addSignatureField,
    addMedicationField,
    createUsgBlock,
    updateToggleLabel,
    setObstetricFieldsDisabled,
    initUIListeners
} from './modules/ui.js';
import {
    refreshPregCalc
} from './modules/pregnancy.js';
import {
    getFormData
} from './modules/data.js';
import {
    buildOutput
} from './modules/text.js';
import {
    saveLocal,
    loadLocal,
    clearAll,
    renderSavedAtendimentos,
    apagarAtendimento,
    carregarAtendimento
} from './modules/storage.js';
import {
    renderPendenciasTable,
    updatePendenciaTimers,
    savePendencia
} from './modules/pending.js';
import {
    generateAndDisplayPDF
} from './modules/pdf.js';

// ===============================================
// ===== 3. CONSTANTES E VARIÁVEIS GLOBAIS =======
// ===============================================
const AUTO_SAVE_DELAY = 2000;
let autoSaveTimer;

// ===============================================
// ===== 4. LÓGICA DE NEGÓCIO (Ajustada) =========
// ===============================================

/**
 * Atualiza os campos de cálculo de gravidez (IG e DPP) com base na DUM ou USG.
 * Esta função é um wrapper para a função do módulo pregnancy.js
 */
function handleRefreshPregCalc() {
    refreshPregCalc(dumInput, dumIncerta, igDum, dpp, dataUsg, igUsg, igUsgAtual, igConsiderada);
}

// ===============================================
// ===== 5. LÓGICA DE EVENTOS (Refatorada) =======
// ===============================================
/**
 * Inicia todos os event listeners do formulário, separados por categoria.
 */
function initListeners() {
    initFormListeners();
    initButtonListeners();
    initTableListeners();
    initUIListeners(form, showNotification, savePendencia);
}

/**
 * Inicia os listeners dos campos do formulário para cálculos e toggles.
 */
function initFormListeners() {
    dumInput.addEventListener('change', handleRefreshPregCalc);
    dumIncerta.addEventListener('change', handleRefreshPregCalc);
    dataUsg.addEventListener('change', handleRefreshPregCalc);
    igUsg.addEventListener('input', handleRefreshPregCalc);
    
    // Auto-save listener
    form.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveLocal(getFormData(form));
            console.log('Salvamento automático realizado.');
        }, AUTO_SAVE_DELAY);
    });

    nuligestaToggle.addEventListener('change', (e) => setObstetricFieldsDisabled(e.target.checked));
    gestacaoInicalToggle.addEventListener('change', () => {
        for (const field of document.getElementsByClassName('gestacao-inicial-fields')) field.style.display = gestacaoInicalToggle.checked ? 'none' : '';
    });
}

/**
 * Inicia os listeners dos botões de ação (Gerar, Copiar, Salvar, etc.).
 */
function initButtonListeners() {
    btnClear.addEventListener('click', (e) => {
        e.preventDefault();
        clearAll(form);
        handleRefreshPregCalc();
    });

    btnGerarProntuario.addEventListener('click', (e) => {
        e.preventDefault();
        if (!form.elements['nome'].value.trim()) {
            showNotification('Preencha o nome da paciente.');
            return;
        }
        output.value = buildOutput(form, getFormData(form));
        output.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        output.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        showNotification('Prontuário gerado e copiado para a área de transferência.');
    });

    btnGerarAih.addEventListener('click', (e) => {
        e.preventDefault();
        if (!form.elements['nome'].value.trim()) {
            showNotification('Preencha o nome da paciente.');
            return;
        }
        outputAih.value = "buildAIHOutput()"; // Esta função ainda não foi refatorada
        outputAih.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        outputAih.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
        showNotification('Texto para AIH gerado e copiado para a área de transferência.');
    });

    btnCopy.addEventListener('click', () => {
        if (!output.value) {
            showNotification('Nada para copiar.', 'error');
            return;
        }
        output.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
    });

    btnCopyAih.addEventListener('click', () => {
        if (!outputAih.value) {
            showNotification('Nada para copiar.', 'error');
            return;
        }
        outputAih.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
    });

    btnDownload.addEventListener('click', () => {
        if (!output.value) {
            showNotification('Nada para baixar.', 'error');
            return;
        }
        const blob = new Blob([output.value], {
            type: 'text/plain;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prontuario_obstetricia.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    btnPrintPdf.addEventListener('click', (e) => {
        e.preventDefault();
        generateAndDisplayPDF(form, showNotification);
    });
    
}

/**
 * Inicia os listeners de cliques nas tabelas.
 */
function initTableListeners() {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        renderSavedAtendimentos(searchTerm);
    });
    savedTableBody.addEventListener('click', (e) => {
        if (e.target.closest('.load-btn')) {
            const key = e.target.closest('tr').dataset.key;
            carregarAtendimento(key, form, showNotification, getFormData, setObstetricFieldsDisabled, updateToggleLabel);
        } else if (e.target.closest('.delete-btn')) {
            const key = e.target.closest('tr').dataset.key;
            const savedData = JSON.parse(localStorage.getItem('prontuarios_salvos')) || {};
            apagarAtendimento(savedData, key, showNotification, renderSavedAtendimentos);
        }
    });
}

// ===============================================
// ===== 6. INICIALIZAÇÃO ========================
// ===============================================
function initPage() {
    startClock();
    initListeners();
    setupTagInput('alergias-tags', 'alergias-input');
    setupTagInput('comorbidades-tags', 'comorbidades-input');
    setupTagInput('condutas-tags', 'condutas-input');
    setupTagInput('hipotese-tags', 'hipotese-input');
    setupTagInput('drogas-tags', 'drogas-input-field');
    renderSavedAtendimentos();
    renderPendenciasTable();
    updatePendenciaTimers();
    setInterval(updatePendenciaTimers, 1000);
    setObstetricFieldsDisabled(nuligestaToggle.checked);
    handleRefreshPregCalc();
    
    // Configura o estado inicial dos campos de toggle e dinâmicos.
    document.querySelectorAll('.toggle-group input[type="checkbox"]').forEach((input) => updateToggleLabel(input));
    if (!document.getElementById('signatures-container').children.length) {
        addSignatureField();
    }
}

initPage();