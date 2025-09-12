/**
 * =============================================================
 * === PRONTUÁRIO ELETRÔNICO OBSTETRÍCIA - SCRIPT PRINCIPAL ===
 * =============================================================
 *
 * Este script gerencia a interface e a lógica de um formulário de prontuário obstétrico.
 * Ele é dividido em seções lógicas para facilitar a manutenção e a legibilidade.
 *
 * Seções:
 * 1. Referências do DOM: Todas as referências a elementos HTML.
 * 2. Constantes e Variáveis Globais: Chaves de localStorage, timers, etc.
 * 3. Utilidades: Funções genéricas para data, formatação, etc.
 * 4. Lógica de UI: Funções para manipular o DOM (toggles, tags, campos dinâmicos).
 * 5. Lógica de Negócio: Funções de cálculo, salvamento e geração de conteúdo.
 * 6. Lógica de Paginação: Funções para gerenciar a tabela de atendimentos salvos.
 * 7. Lógica de Pendências: Funções para gerenciar a tabela de pendências.
 * 8. Lógica de PDF e Assinatura (Recursos Externos): Funções para PDFLib e IndexedDB.
 * 9. Inicialização: Funções que configuram o aplicativo ao carregar a página.
 */
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
const bolsaToggle = document.getElementById('bolsa');
const bolsaRotaFields = document.getElementById('bolsa_rota_fields');
const toqueEvitado = document.getElementById('toque_evitado');
const toqueFields = document.getElementById('toque_fields');
const especularEvitado = document.getElementById('especular_evitado');
const especularFields = document.getElementById('especular_fields');
const output = document.getElementById('output');
const outputAih = document.getElementById('output-aih');
const medicationList = document.getElementById('medication-list');
const addMedicationBtn = document.getElementById('add-medication-btn');
const signaturesContainer = document.getElementById('signatures-container');
const addSignatureBtn = document.getElementById('add-signature-btn');
const usgContainer = document.getElementById('usg-container');
const addUsgBtn = document.getElementById('add-usg-btn');
const nuligestaToggle = document.getElementById('nuligesta');
const gestacaoInicalToggle = document.getElementById('gestacao_inicial');
const obstetricoFields = document.getElementById('obstetrico-fields');
const gestacaoAtualFields = document.getElementById('gestacao-atual-fields');
const gestacaoInicialFields = document.getElementsByClassName('gestacao-inicial-fields');
const dinamicaAusenteToggle = document.getElementById('dinamica_ausente');
const dinamicaInput = document.getElementById('dinamica_uterina');
const etilismoCheckbox = document.getElementById('etilismo');
const tabagismoCheckbox = document.getElementById('tabagismo');
const drogasCheckbox = document.getElementById('drogas');
const tabagismoInputDiv = document.getElementById('tabagismo-input');
const drogasInputDiv = document.getElementById('drogas-input');
const btnAddPendenciaForm = document.getElementById('btn-add-pendencia-form');
const searchInput = document.getElementById('search-input');
const savedTableBody = document.getElementById('saved-atendimentos-table').querySelector('tbody');
const pendenciasTableBody = document.querySelector('#pendencias-table tbody');
const pendenciaModal = document.getElementById('pendencia-modal');
const btnSalvarPendencia = document.getElementById('btn-salvar-pendencia');
const pendenciaDescricaoInput = document.getElementById('pendencia-descricao');
const pendenciaTempoInput = document.getElementById('pendencia-tempo');
const modalNome = document.getElementById('modal-paciente-nome');
const modalProntuario = document.getElementById('modal-prontuario');
const trLabels = document.querySelectorAll('.testes-rapidos .state-toggle-label');
const btnGerarProntuario = document.getElementById('btn-gerar-prontuario');
const btnPrintPdf = document.getElementById('btn-print-pdf');
const btnGerarAih = document.getElementById('btn-gerar-aih');
const btnCopy = document.getElementById('btn-copy');
const btnCopyAih = document.getElementById('btn-copy-aih');
const btnDownload = document.getElementById('btn-download');
const btnClear = document.getElementById('btn-clear');
const btnSave = document.getElementById('btn-save');
// ===============================================
// ===== 2. CONSTANTES E VARIÁVEIS GLOBAIS =======
// ===============================================
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const LS_KEY = 'prontuarios_salvos';
const PENDENCIA_LS_KEY = 'pendencias_salvas';
const ITEMS_PER_PAGE = 10;
let currentPage = 1;
let autoSaveTimer;
const AUTO_SAVE_DELAY = 2000; // Salva após 2 segundos de inatividade
const trStates = ['nao_realizado', 'nao_reagente', 'reagente'];
const trLabelsMap = {
    tr_sifilis: {
        nao_realizado: 'Sífilis Não Realizado',
        nao_reagente: 'Sífilis Não Reagente',
        reagente: 'Sífilis Reagente',
    },
    tr_hiv: {
        nao_realizado: 'Anti-HIV Não Realizado',
        nao_reagente: 'Anti-HIV Não Reagente',
        reagente: 'Anti-HIV Reagente',
    },
    tr_hepb: {
        nao_realizado: 'HBsAg Não Realizado',
        nao_reagente: 'HBsAg Não Reagente',
        reagente: 'HBsAg Reagente',
    },
    tr_hepc: {
        nao_realizado: 'Anti-HCV Não Realizado',
        nao_reagente: 'Anti-HCV Não Reagente',
        reagente: 'Anti-HCV Reagente',
    },
};
const COR_MONTREAL = {
    'Vermelho': '#E74C3C', // Um vermelho tijolo que tem presença, mas não é gritante
    'MUITO URGENTE': '#E67E22', // Um laranja intenso, mais vivo que o pêssego
    'URGENTE': '#F1C40F', // Um amarelo ouro, com bastante brilho
    'POUCO URGENTE': '#27AE60', // Um verde esmeralda, que se destaca sem ser muito claro
    'NÃO URGENTE': '#3498DB', // Um azul céu mais forte
    'SEM CLASSIFICAÇÃO': '#BDC3C7' // Um cinza médio, que se distingue sem ser preto
};
// ===============================================
// ===== 3. UTILIDADES ===========================
// ===============================================
/**
 * Inicia um relógio na interface para exibir a hora atual.
 */
function startClock() {
    const el = document.getElementById('clock');
    const fmt = (n) => String(n).padStart(2, '0');
    const tick = () => {
        const now = new Date();
        el.textContent = `Agora: ${fmt(now.getHours())}:${fmt(now.getMinutes())}`;
    };
    tick();
    setInterval(tick, 30_000);
}
/**
 * Cria um novo objeto Date com apenas a data (sem a parte de tempo),
 * usando o fuso horário UTC para garantir consistência.
 * @param {Date} d O objeto Date original.
 * @returns {Date} Um novo objeto Date com a hora zerada em UTC.
 */
function toDateOnly(d) {
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    return dt;
}
/**
 * Calcula a diferença em dias entre duas datas.
 * @param {Date} dateA A data final.
 * @param {Date} dateB A data inicial.
 * @returns {number} A diferença em dias.
 */
function diffDays(dateA, dateB) {
    const a = toDateOnly(dateA);
    const b = toDateOnly(dateB);
    return (Math.floor((a - b) / MS_PER_DAY) - 1);
}
/**
 * Adiciona um número de dias a uma data.
 * @param {Date} date A data inicial.
 * @param {number} days O número de dias a adicionar.
 * @returns {Date} Uma nova data.
 */
function addDays(date, days) {
    const d = toDateOnly(date);
    const r = new Date(d);
    r.setDate(r.getDate() + days);
    return r;
}
/**
 * Formata um objeto Date para o formato de data brasileiro (DD/MM/YYYY).
 * @param {Date} date O objeto Date a ser formatado.
 * @returns {string} A data formatada.
 */
function formatDateBR(date) {
    const d = toDateOnly(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}
/**
 * Formata um total de dias em semanas e dias (ex: 280 -> 40s0d).
 * @param {number} totalDays O total de dias.
 * @returns {string} A string formatada.
 */
function formatWeeksDays(totalDays) {
    if (!Number.isFinite(totalDays)) return '';
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    return `${weeks}s${days}d`;
}
/**
 * Formata um objeto Date para o formato de hora e data brasileiro (HH:mm de DD/MM).
 * @param {Date} date O objeto Date a ser formatado.
 * @returns {string} A string formatada.
 */
function formateDateHoraBR(date) {
    const d = new Date(date);
    const hour = String(d.getHours()).padStart(2, '0');
    const minute = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${hour}:${minute} de ${day}/${month}`;
}
/**
 * Analisa uma string de idade gestacional e a converte para o total de dias.
 * Suporta formatos como "40+2", "40s2d", "40 2".
 * @param {string} str A string de IG a ser analisada.
 * @returns {number|null} O total de dias ou null se a string for inválida.
 */
function parseIgString(str) {
    if (!str) return null;
    const s = String(str).trim().toLowerCase();
    let w = 0,
        d = 0;
    const plusMatch = s.match(/^(\d+)\s*[+ ]\s*(\d+)$/);
    if (plusMatch) {
        w = parseInt(plusMatch[1]);
        d = parseInt(plusMatch[2]);
        return w * 7 + d;
    }
    const fullMatch = s.match(/^(\d+)\s*s(?:emanas?)?\s*(\d+)?\s*d?/);
    if (fullMatch) {
        w = parseInt(fullMatch[1]);
        d = fullMatch[2] ? parseInt(fullMatch[2]) : 0;
        return w * 7 + d;
    }
    const simple = s.match(/^(\d+)\s*(\d+)?$/);
    if (simple) {
        w = parseInt(simple[1]);
        d = simple[2] ? parseInt(simple[2]) : 0;
        return w * 7 + d;
    }
    return null;
}
/**
 * Exibe uma notificação moderna no canto superior direito.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} [type='info'] O tipo da notificação ('success', 'error', 'info').
 * @param {number} [duration=3000] Duração em milissegundos antes de desaparecer.
 */
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    // Exibe a notificação com um pequeno atraso para a animação
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    // Remove a notificação após a duração
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        // Remove o elemento do DOM após a animação de saída
        notification.addEventListener('transitionend', () => {
            notification.remove();
        });
    }, duration);
    console.log(type);
}
// ===============================================
// ===== 4. LÓGICA DE UI =========================
// ===============================================
/**
 * Configura um campo de entrada para funcionar como um sistema de tags.
 */
function setupTagInput(containerId, inputId) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    function addTag(text) {
        if (!text.trim()) return;
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.innerHTML = `${text.trim()} <span class="remove-tag">&times;</span>`;
        container.insertBefore(tag, input);
        tag.querySelector('.remove-tag').addEventListener('click', () => {
            container.removeChild(tag);
        });
    }
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const tags = input.value.split(',').map((s) => s.trim()).filter((s) => s);
            tags.forEach(addTag);
            input.value = '';
        }
    });
    input.addEventListener('paste', (e) => {
        e.preventDefault();
        const paste = (e.clipboardData || window.clipboardData).getData('text');
        const tags = paste.split(',').map((s) => s.trim()).filter((s) => s);
        tags.forEach(addTag);
        input.value = '';
    });
    container.getTags = () => {
        return Array.from(container.querySelectorAll('.tag')).map((el) => el.textContent.replace(/\s*×$/, ''));
    };
    container.setTags = (tags) => {
        Array.from(container.querySelectorAll('.tag')).forEach((tag) => container.removeChild(tag));
        tags.forEach(addTag);
    };
}
/**
 * Adiciona um campo de medicação dinâmico ao formulário.
 */
function addMedicationField() {
    const newItem = document.createElement('div');
    newItem.className = 'medication-item';
    newItem.innerHTML = `
        <label class="toggle">
            <input type="checkbox" name="med_outra" checked />
            <span class="toggle-slider"></span>
            <span class="toggle-label">Outra</span>
        </label>
        <input class="dose-input" type="text" name="dose_outra" placeholder="Nome da medicação e dose" />
        <button type="button" class="btn remove-btn">X</button>
    `;
    newItem.querySelector('.remove-btn').addEventListener('click', () => {
        medicationList.removeChild(newItem);
    });
    medicationList.appendChild(newItem);
}

/**
 * Adiciona um campo de assinatura dinâmico ao formulário.
 */
function addSignatureField(title = 'Ddo.', name = '') {
    const newItem = document.createElement('div');
    newItem.className = 'signature-item';
    newItem.innerHTML = `
        <div class="form-group" style="flex-grow: 1;">
            <label>Título</label>
            <select name="signature_title">
                <option value="Ddo." ${title === 'Ddo.' ? 'selected' : ''}>Ddo.</option>
                <option value="Dda." ${title === 'Dda.' ? 'selected' : ''}>Dda.</option>
                <option value="Acd." ${title === 'Acd.' ? 'selected' : ''}>Acd.</option>
                <option value="MR." ${title === 'MR.' ? 'selected' : ''}>MR.</option>
                <option value="Dr." ${title === 'Dr.' ? 'selected' : ''}>Dr.</option>
                <option value="Dra." ${title === 'Dra.' ? 'selected' : ''}>Dra.</option>
            </select>
        </div>
        <div class="form-group" style="flex-grow: 2;">
            <label>Nome Completo</label>
            <input type="text" name="signature_name" placeholder="Nome Completo" value="${name}" />
        </div>
        <button type="button" class="btn remove-signature-btn" style="align-self: flex-end; margin-bottom: 6px;">X</button>
    `;
    signaturesContainer.appendChild(newItem);
    newItem.querySelector('.remove-signature-btn').addEventListener('click', () => {
        signaturesContainer.removeChild(newItem);
    });
}
/**
 * Cria um novo bloco de USG.
 */
function createUsgBlock(data = {}, index = 0) {
    const usgItem = document.createElement('div');
    usgItem.className = 'usg-item';
    usgItem.dataset.usgIndex = index;
    usgItem.innerHTML = `
    <div class="form-grid">
      <button type="button" class="remove-usg-btn">X</button>
      <div class="form-group">
        <label for="usg_data_${index}">Data da USG</label>
        <input type="date" id="usg_data_${index}" name="usg_data_${index}" value="${data.date || ''}" />
      </div>
      <div class="form-group">
        <label for="usg_tipo_${index}">Tipo de USG</label>
        <select id="usg_tipo_${index}" name="usg_tipo_${index}">
          <option value="">Selecione...</option>
          <option value="Transvaginal" ${data.type === 'Transvaginal' ? 'selected' : ''}>Transvaginal</option>
          <option value="Obstétrica" ${data.type === 'Obstétrica' ? 'selected' : ''}>Obstétrica</option>
          <option value="Morfológica" ${data.type === 'Morfológica' ? 'selected' : ''}>Morfológica</option>
        </select>
      </div>
    </div>
    <div id="concepto-container-${index}"></div>
    <div style="text-align: right; margin-top: 10px;">
      <button type="button" class="btn add-concepto-btn" data-usg-index="${index}">Adicionar Concepto</button>
    </div>
  `;
    const conceptoContainer = usgItem.querySelector(`#concepto-container-${index}`);
    const conceptosData = data.conceptos && data.conceptos.length > 0 ? data.conceptos : [{}];
    conceptosData.forEach((conceptoData, cIndex) => {
        createConceptoBlock(conceptoContainer, conceptoData, cIndex);
    });
    usgItem.querySelector('.remove-usg-btn').addEventListener('click', () => {
        usgItem.remove();
    });
    usgItem.querySelector('.add-concepto-btn').addEventListener('click', (e) => {
        const parentUsgIndex = e.target.dataset.usgIndex;
        const newConceptoIndex = conceptoContainer.children.length;
        createConceptoBlock(conceptoContainer, {}, newConceptoIndex);
    });
    usgContainer.appendChild(usgItem);
}
/**
 * Cria um novo bloco de concepto (feto e placenta).
 */
function createConceptoBlock(container, data = {}, index = 0) {
    const parentUsgIndex = container.closest('.usg-item').dataset.usgIndex;
    const conceptoItem = document.createElement('div');
    conceptoItem.className = 'concepto-item';
    conceptoItem.dataset.conceptoIndex = index;
    conceptoItem.innerHTML = `
    <div class="concepto-header">
      <h4>Placenta #${index + 1}</h4>
      <button type="button" class="btn remove-concepto-btn" ${index === 0 ? 'style="display:none;"' : ''}>X</button>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label for="placenta_localizacao_${parentUsgIndex}_${index}">Localização da Placenta</label>
        <select id="placenta_localizacao_${parentUsgIndex}_${index}" name="placenta_localizacao_${parentUsgIndex}_${index}">
          <option value="">Selecione...</option>
          <option value="Posterior" ${data.placenta_localizacao === 'Posterior' ? 'selected' : ''}>Posterior</option>
          <option value="Anterior" ${data.placenta_localizacao === 'Anterior' ? 'selected' : ''}>Anterior</option>
        </select>
      </div>
      <div class="form-group">
        <label for="placenta_grau_${parentUsgIndex}_${index}">Grau da Placenta</label>
        <select id="placenta_grau_${parentUsgIndex}_${index}" name="placenta_grau_${parentUsgIndex}_${index}">
          <option value="">Selecione...</option>
          <option value="0" ${data.placenta_grau === '0' ? 'selected' : ''}>0</option>
          <option value="I" ${data.placenta_grau === 'I' ? 'selected' : ''}>I</option>
          <option value="II" ${data.placenta_grau === 'II' ? 'selected' : ''}>II</option>
          <option value="III" ${data.placenta_grau === 'III' ? 'selected' : ''}>III</option>
        </select>
      </div>
    </div>
    <div class="section-subheader">
      <h4>Feto #${index + 1}</h4>
    </div>
    <div class="form-grid">
      <div class="form-group">
        <label for="feto_situacao_${parentUsgIndex}_${index}">Situação</label>
        <select id="feto_situacao_${parentUsgIndex}_${index}" name="feto_situacao_${parentUsgIndex}_${index}">
          <option value="">Selecione...</option>
          <option value="Longitudinal" ${data.feto_situacao === 'Longitudinal' ? 'selected' : ''}>Longitudinal</option>
          <option value="Transverso" ${data.feto_situacao === 'Transverso' ? 'selected' : ''}>Transverso</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feto_apresentacao_${parentUsgIndex}_${index}">Apresentação</label>
        <select id="feto_apresentacao_${parentUsgIndex}_${index}" name="feto_apresentacao_${parentUsgIndex}_${index}">
          <option value="">Selecione...</option>
          <option value="Cefálica" ${data.feto_apresentacao === 'Cefálica' ? 'selected' : ''}>Cefálica</option>
          <option value="Pélvica" ${data.feto_apresentacao === 'Pélvica' ? 'selected' : ''}>Pélvica</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feto_dorso_${parentUsgIndex}_${index}">Dorso</label>
        <select id="feto_dorso_${parentUsgIndex}_${index}" name="feto_dorso_${parentUsgIndex}_${index}">
          <option value="">Selecione...</option>
          <option value="Esquerda" ${data.feto_dorso === 'Esquerda' ? 'selected' : ''}>Esquerda</option>
          <option value="Direita" ${data.feto_dorso === 'Direita' ? 'selected' : ''}>Direita</option>
          <option value="Anterior" ${data.feto_dorso === 'Anterior' ? 'selected' : ''}>Anterior</option>
        </select>
      </div>
      <div class="form-group">
        <label for="feto_peso_${parentUsgIndex}_${index}">Peso Fetal Estimado (g)</label>
        <input type="number" id="feto_peso_${parentUsgIndex}_${index}" name="feto_peso_${parentUsgIndex}_${index}" value="${data.feto_peso || ''}" />
      </div>
      <div class="form-group">
        <label for="feto_percentil_${parentUsgIndex}_${index}">Percentil</label>
        <input type="number" id="feto_percentil_${parentUsgIndex}_${index}" name="feto_percentil_${parentUsgIndex}_${index}" placeholder="Ex: P10, P50" value="${data.feto_percentil || ''}" />
      </div>
      <div class="form-group">
        <label for="feto_bcf_${parentUsgIndex}_${index}">BCF (bpm)</label>
        <input type="number" id="feto_bcf_${parentUsgIndex}_${index}" name="feto_bcf_${parentUsgIndex}_${index}" value="${data.feto_bcf || ''}" />
      </div>
      <div class="form-group">
        <label for="feto_ila_${parentUsgIndex}_${index}">ILA (cm)</label>
        <input type="number" id="feto_ila_${parentUsgIndex}_${index} step='0.1'" name="feto_ila_${parentUsgIndex}_${index}" value="${data.feto_ila || ''}" />
      </div>
      <div class="form-group">
        <label for="feto_mbv_${parentUsgIndex}_${index}">MBV (cm)</label>
        <input type="number" id="feto_mbv_${parentUsgIndex}_${index}" step='0.1' name="feto_mbv_${parentUsgIndex}_${index}" value="${data.feto_mbv || ''}" />
      </div>
    </div>
    <div class="form-group grid-col-span-full">
      <label for="feto_observacoes_${parentUsgIndex}_${index}">Observações Adicionais</label>
      <textarea id="feto_observacoes_${parentUsgIndex}_${index}" name="feto_observacoes_${parentUsgIndex}_${index}">${data.feto_observacoes || ''}</textarea>
    </div>
  `;
    conceptoItem.querySelector('.remove-concepto-btn').addEventListener('click', () => {
        conceptoItem.remove();
    });
    container.appendChild(conceptoItem);
}
/**
 * Atualiza o texto do label de um botão de alternância com base no estado do checkbox.
 */
function updateToggleLabel(input) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label && label.dataset.default) {
        label.textContent = input.checked ? label.dataset.checked : label.dataset.default;
    }
}
/**
 * Habilita ou desabilita os campos relacionados à obstetrícia.
 */
function setObstetricFieldsDisabled(disabled) {
    Array.from(obstetricoFields.querySelectorAll('input, select')).forEach((el) => el.disabled = disabled);
    Array.from(gestacaoAtualFields.querySelectorAll('input, select')).forEach((el) => el.disabled = disabled);
    if (disabled) {
        for (const field of gestacaoInicialFields) {
            field.style.display = 'none';
        }
        gestacaoAtualFields.classList.add('hidden-field');
        obstetricoFields.style.opacity = '0.5';
        gestacaoAtualFields.style.opacity = '0.5';
    } else {
        for (const field of gestacaoInicialFields) {
            field.style.display = '';
        }
        gestacaoAtualFields.classList.remove('hidden-field');
        obstetricoFields.style.opacity = '1';
        gestacaoAtualFields.style.opacity = '1';
    }
}
// ===============================================
// ===== 5. LÓGICA DE NEGÓCIO ====================
// ===============================================
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
function refreshPregCalc() {
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
/**
 * Coleta todos os dados do formulário em um único objeto.
 */

/**
 * Coleta os dados de todas as medicações dinâmicas.
 * @returns {string[]} Um array com os nomes e doses das medicações.
 */
function getMedications() {
    const meds = [];
    document.querySelectorAll('#medication-list .medication-item').forEach((item) => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox?.checked) {
            const labelEl = item.querySelector('.toggle-label');
            const doseInput = item.querySelector('.dose-input');
            const dose = doseInput?.value?.trim();
            if (doseInput.name === 'dose_outra') {
                meds.push(dose);
            } else {
                meds.push(dose ? `${labelEl.textContent} ${dose}` : labelEl.textContent);
            }
        }
    });
    return meds;
}

/**
 * Coleta os dados de todas as ultrassonografias.
 * @returns {object[]} Um array de objetos com os dados de cada USG e seus conceptos.
 */
function getUsgData() {
    const usgData = [];
    document.querySelectorAll('.usg-item').forEach((usgItem) => {
        const usgBlock = {
            usg_data: usgItem.querySelector('input[name^="usg_data_"]').value,
            usg_tipo: usgItem.querySelector('select[name^="usg_tipo_"]').value,
            conceptos: []
        };
        usgItem.querySelectorAll('.concepto-item').forEach((conceptoItem) => {
            usgBlock.conceptos.push({
                placenta_localizacao: conceptoItem.querySelector('select[name^="placenta_localizacao_"]').value,
                placenta_grau: conceptoItem.querySelector('select[name^="placenta_grau_"]').value,
                feto_situacao: conceptoItem.querySelector('select[name^="feto_situacao_"]').value,
                feto_apresentacao: conceptoItem.querySelector('select[name^="feto_apresentacao_"]').value,
                feto_dorso: conceptoItem.querySelector('select[name^="feto_dorso_"]').value,
                feto_peso: conceptoItem.querySelector('input[name^="feto_peso_"]').value,
                feto_percentil: conceptoItem.querySelector('input[name^="feto_percentil_"]').value,
                feto_bcf: conceptoItem.querySelector('input[name^="feto_bcf_"]').value,
                feto_ila: conceptoItem.querySelector('input[name^="feto_ila_"]').value,
                feto_mbv: conceptoItem.querySelector('input[name^="feto_mbv_"]').value,
                feto_observacoes: conceptoItem.querySelector('textarea[name^="feto_observacoes_"]').value
            });
        });
        usgData.push(usgBlock);
    });
    return usgData;
}

/**
 * Coleta os dados de todas as assinaturas.
 * @returns {object[]} Um array de objetos com o título e nome de cada assinatura.
 */
function getSignaturesData() {
    const signatures = [];
    document.querySelectorAll('.signature-item').forEach((item) => {
        const title = item.querySelector('[name="signature_title"]').value;
        const name = item.querySelector('[name="signature_name"]').value;
        if (title && name) {
            signatures.push({
                title,
                name
            });
        }
    });
    return signatures;
}

/**
 * Coleta todos os dados do formulário em um único objeto.
 * Essa função é a fonte única de dados para salvar, gerar texto e PDF.
 * @returns {object} Um objeto com todos os dados do formulário.
 */
function getFormData() {
    const data = {};
    const formElements = form.elements;

    for (let i = 0; i < formElements.length; i++) {
        const el = formElements[i];
        if (el.type === 'radio' && !el.checked) continue;
        if (el.type === 'checkbox' && !el.checked) {
            data[el.name] = false;
        } else if (!el.name) {
            continue;
        } else {
            if (!data[el.name]) {
                data[el.name] = el.value;
            } else {
                if (Array.isArray(data[el.name])) {
                    data[el.name].push(el.value);
                } else {
                    data[el.name] = [data[el.name], el.value];
                }
            }
        }
    }

    // Coleta dados dos campos dinâmicos e de tags usando as novas funções
    data.alergias_tags = document.getElementById('alergias-tags').getTags();
    data.comorbidades_tags = document.getElementById('comorbidades-tags').getTags();
    data.custom_meds = getMedications();
    data.ultrassonografias = getUsgData();
    data.hipotese_tags = document.getElementById('hipotese-tags').getTags();
    data.condutas_tags = document.getElementById('condutas-tags').getTags();
    data.drogas_tags = document.getElementById('drogas-tags').getTags();
    data.signatures = getSignaturesData();
    data.tabagismo_detalhe = tabagismoCheckbox.checked ? form.elements['tabagismo_detalhe'].value : '';
    data._timestamp = new Date().toISOString();

    return data;
}
/**
 * Salva o prontuário atual em uma lista no localStorage.
 */
function saveLocal() {
    const data = getFormData();
    const prontuario = data.prontuario?.trim();
    const nome = data.nome?.trim();
    if (!prontuario && !nome) {
        showNotification('Por favor, preencha o número do prontuário ou o nome da paciente para salvar.', 'error');
        return;
    }
    let savedData = JSON.parse(localStorage.getItem(LS_KEY)) || {};
    let identifier = prontuario || nome;
    let oldIdentifier = nome;
    if (prontuario && savedData[oldIdentifier] && oldIdentifier !== prontuario) {
        delete savedData[oldIdentifier];
    }
    savedData[identifier] = data;
    localStorage.setItem(LS_KEY, JSON.stringify(savedData));
    renderSavedAtendimentos();
    showNotification('Atendimento salvo com sucesso!', 'success');
}
/**
 * Carrega um prontuário específico a partir do localStorage.
 */
function loadLocal(identifier) {
    const savedData = JSON.parse(localStorage.getItem(LS_KEY));
    if (!savedData || !savedData[identifier]) {
        showNotification('Dados não encontrados.', 'error');
        return;
    }
    const data = savedData[identifier];
    form.reset();
    document.querySelectorAll('.signature-item').forEach((el) => el.remove());
    document.querySelectorAll('#medication-list .medication-item input[name="dose_outra"]').forEach((el) => el.closest('.medication-item').remove());
    document.querySelectorAll('.usg-item').forEach(el => el.remove());
    data.signatures?.forEach((sig) => addSignatureField(sig.title, sig.name));
    if (!signaturesContainer.children.length) {
        addSignatureField();
    }
    data.custom_meds?.forEach((med) => {
        addMedicationField();
        const lastMedication = medicationList.lastElementChild;
        lastMedication.querySelector('[name="dose_outra"]').value = med;
    });
    if (data.ultrassonografias && data.ultrassonografias.length > 0) {
        data.ultrassonografias.forEach((usg, usgIndex) => {
            createUsgBlock({
                date: usg.usg_data,
                type: usg.usg_tipo,
                conceptos: usg.conceptos
            }, usgIndex);
        });
        const usgCardHeader = document.getElementById('headerUSG');
        const usgCardContent = document.getElementById('contentUSG');
    }
    Object.keys(data).forEach((k) => {
        if (k.startsWith('_') || k.includes('_tags') || k === 'custom_meds' || k === 'signatures' || k === 'ultrassonografias') return;
        const el = form.elements[k];
        if (!el) return;
        if (el.type === 'checkbox') {
            el.checked = data[k];
        } else if (el.type === 'radio') {
            if (el.length) {
                Array.from(el).forEach((e) => {
                    e.checked = e.value === data[k];
                });
            }
        } else if (el.type === 'hidden') {
            el.value = data[k];
            const label = document.querySelector(`label[for="${el.name}"]`);
            if (label) {
                label.classList.remove(...trStates);
                label.classList.add(data[k]);
                label.textContent = trLabelsMap[label.htmlFor][data[k]];
            }
        } else {
            el.value = data[k];
        }
    });
    document.getElementById('alergias-tags').setTags(data.alergias_tags || []);
    document.getElementById('comorbidades-tags').setTags(data.comorbidades_tags || []);
    document.getElementById('condutas-tags').setTags(data.condutas_tags || []);
    document.getElementById('hipotese-tags').setTags(data.hipotese_tags || []);
    document.getElementById('drogas-tags').setTags(data.drogas_tags || []);
    tabagismoCheckbox.checked = !!data.tabagismo_detalhe;
    if (tabagismoCheckbox.checked) form.elements['tabagismo_detalhe'].value = data.tabagismo_detalhe;
    drogasCheckbox.checked = (data.drogas_tags || []).length > 0;
    tabagismoCheckbox.dispatchEvent(new Event('change'));
    drogasCheckbox.dispatchEvent(new Event('change'));
    document.querySelectorAll('.btn-toggle, .toggle-group input[type="checkbox"]').forEach((el) => {
        const input = el.tagName === 'INPUT' ? el : document.getElementById(el.getAttribute('for'));
        if (input) updateToggleLabel(input);
    });
    setObstetricFieldsDisabled(document.getElementById('nuligesta').checked);
    refreshPregCalc();
    showNotification(`Atendimento de ${data.nome} (${identifier}) carregado.`);
}
/**
 * Limpa todos os campos do formulário e retorna ao estado inicial.
 */
function clearAll() {
    form.reset();
    document.querySelectorAll('.signature-item').forEach((el, i) => {
        if (i > 0) el.remove();
    });
    document.querySelectorAll('#medication-list .medication-item').forEach((el, i) => {
        if (el.querySelector('[name="med_outra"]')) el.remove();
    });
    document.getElementById('alergias-tags').setTags([]);
    document.getElementById('comorbidades-tags').setTags([]);
    document.getElementById('condutas-tags').setTags([]);
    document.getElementById('hipotese-tags').setTags([]);
    document.getElementById('drogas-tags').setTags([]);
    document.querySelectorAll('.testes-rapidos .state-toggle-input').forEach((input) => {
        input.value = 'nao_realizado';
    });
    document.querySelectorAll('.testes-rapidos .state-toggle-label').forEach((label) => {
        label.textContent = trLabelsMap[label.htmlFor]['nao_realizado'];
        label.classList.remove(...trStates);
        label.classList.add('nao_realizado');
    });
    dumIncerta.checked = false;
    document.getElementById('nuligesta').checked = false;
    document.getElementById('dinamica_ausente').checked = true;
    document.getElementById('toque_evitado').checked = false;
    document.getElementById('especular_evitado').checked = true;
    document.getElementById('tabagismo').checked = false;
    document.getElementById('drogas').checked = false;
    nuligestaToggle.dispatchEvent(new Event('change'));
    dinamicaAusenteToggle.dispatchEvent(new Event('change'));
    toqueEvitado.dispatchEvent(new Event('change'));
    especularEvitado.dispatchEvent(new Event('change'));
    tabagismoCheckbox.dispatchEvent(new Event('change'));
    drogasCheckbox.dispatchEvent(new Event('change'));
    refreshPregCalc();
    output.value = '';
}

/**
 * Constrói uma seção de texto com um título e uma lista de itens.
 * Retorna uma string vazia se a lista de itens estiver vazia.
 * @param {string} title O título da seção (ex: "Comorbidades").
 * @param {string[]} items O array de itens.
 * @returns {string} O texto formatado da seção ou uma string vazia.
 */
function buildSection(title, items) {
    if (!items || items.length === 0) {
        return '';
    }
    const formattedItems = items.map(item => `- ${item}`).join('\n');
    return `# ${title}\n${formattedItems}`;
}

function buildHeader() {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        return `# SR às ${hh}:${mm} #`;
    }
    function formatarIdentificacao(nome, idade, procedencia) {
        console.log(nome);
        const nomeCompleto = nome.trim();
        const idadeCompleta = idade.trim() ? `${idade} anos` : '';
        const partes = [];
        if (nomeCompleto) {
            partes.push(nomeCompleto)
        }
        if (idadeCompleta) {
            partes.push(idadeCompleta);
        }
        if (procedencia.trim()) {
            partes.push(`procedente de ${procedencia.trim()}.`);
        }
        return partes.join(', ');
    }
    function formatarParidade(g, pn, pc, ab) {
        g = Number(g || '0');
        pn = Number(pn || '0');
        pc = Number(pc || '0');
        ab = Number(ab || '0');
        if (g === 0) {
            return `G0`;
        }
        let partos = '';
        const totalPartos = pn + pc;
        if (totalPartos === 0) {
            partos = 'P0';
        } else if (pn === 0) {
            partos = `P${pc}c`;
        } else if (pc === 0) {
            partos = `P${pn}v`;
        } else {
            partos = `P${pn}v${pc}c`;
        }
        return `G${g}${partos}A${ab}`;
    };
    function getCheckedValues(name) {
        return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((i) => i.value);
    }
    function getTagValues(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return '';
        const tags = [];
        container.querySelectorAll('.tag').forEach((tagElement) => {
            const text = tagElement.textContent.trim();
            if (text && text !== '×') {
                tags.push(text.replace('×', '').trim());
            }
        });
        return tags.join(', ');
    }
    function getCondutaValues() {
        const conds = getCheckedValues('conduta');
        const outrasConds = document.getElementById('condutas-tags').getTags();
        const allCondutas = [...conds, ...outrasConds];
        return allCondutas.join(', ');
    }
    function getBinaryToggleValue(id) {
        const input = document.getElementById(id);
        if (!input) return '';
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label) return '';
        return input.checked ? label.dataset.checked : label.dataset.default;
    }
    function getSelectValue(name) {
        const select = form.elements[name];
        return select ? select.value : '';
    }
    function buildHistoricoObstetrico(data) {
        const nuligesta = document.getElementById('nuligesta').checked;
        if (nuligesta) {
            return 'Nuligesta.';
        }
        const paridade = formatarParidade(data.gestacoes, data['partos-normais'], data['partos-cesarea'], data.abortos);
        const dumInc = data.dum_incerta === 'on';
        const dumText = dumInc ? 'DUM incerta' : `DUM ${formatDateBR(new Date(data.dum))} | IG DUM ${data['ig-dum']}`;
        const usgIgStr = data['ig-usg'];
        const dataUsgStr = data['data-usg'];
        const igUsgCorr = data['ig-usg-atual'];
        const dppStr = data.dpp;
        const gestacaoParts = [
            igUsgCorr ? `IG USG ${igUsgCorr}` : null, (usgIgStr && dataUsgStr) ? ` (${usgIgStr.replace('s', 's').replace('d', 'd')} em ${formatDateBR(new Date(dataUsgStr))})` : null,
            dppStr ? ` | DPP ${dppStr}` : null,
        ].filter(Boolean).join('');
        const obstetrico = `${paridade} | ${dumText}\n${gestacaoParts}`;
        return obstetrico.trim();
    }
    function buildComplementares(data) {
        const tipoSanguineo = data.tipo_sanguineo;
        const trMap = {
            tr_sifilis: 'Sífilis',
            tr_hiv: 'Anti-HIV',
            tr_hepb: 'HepB',
            tr_hepc: 'HepC'
        };
        const trResults = {
            tr_sifilis: data.tr_sifilis,
            tr_hiv: data.tr_hiv,
            tr_hepb: data.tr_hepb,
            tr_hepc: data.tr_hepc
        };
        const reagentes = Object.keys(trResults).filter(k => trResults[k] === 'reagente').map(k => trMap[k]);
        const naoReagentes = Object.keys(trResults).filter(k => trResults[k] === 'nao_reagente').map(k => trMap[k]);
        const partesTexto = [];
        if (tipoSanguineo && tipoSanguineo !== '?' && tipoSanguineo !== 'N.R') {
            partesTexto.push(`TS: ${tipoSanguineo}`);
        }
        if (reagentes.length > 0) {
            const reagentesTxt = reagentes.join(', ');
            partesTexto.push(`TR ${reagentesTxt} Reagente${reagentes.length > 1 ? 's' : ''}`);
        }
        if (naoReagentes.length > 0) {
            const naoReagentesTxt = naoReagentes.join(', ');
            partesTexto.push(`TR ${naoReagentesTxt} Não Reagente${naoReagentes.length > 1 ? 's' : ''}`);
        }
        if (partesTexto.length === 0) {
            return '';
        }
        return partesTexto.join(' | ');
    }
/**
 * Constrói a seção de comorbidades usando a função utilitária.
 */
function buildComorbidades(data) {
    const comorbToggles = [];
    if (data.comorbidade_dmg_dieta) comorbToggles.push('DMG (Dieta)');
    if (data.comorbidade_dmg_insulina) comorbToggles.push('DMG (Insulina)');
    if (data.comorbidade_hag) comorbToggles.push('HAG');
    if (data.comorbidade_has) comorbToggles.push('HAS');
    const allComorbidades = [...comorbToggles, ...(data.comorbidades_tags || [])];
    return buildSection('Comorbidades', allComorbidades);
}


 /**
 * Constrói a seção de alergias usando a função utilitária.
 */
function buildAlergias(data) {
    return buildSection('Alergias', data.alergias_tags);
}

    function buildVicios(data) {
        const viciosAfirmados = [];
        const viciosNegados = [];
        if (data.etilismo === 'on') {
            viciosAfirmados.push('Etilista');
        } else {
            viciosNegados.push('Etilismo');
        }
        if (data.tabagismo === 'on') {
            viciosAfirmados.push(data.tabagismo_detalhe ? `Tabagista (${data.tabagismo_detalhe})` : `Tabagista`);
        } else {
            viciosNegados.push('Tabagismo');
        }
        if (data.drogas === 'on') {
            viciosAfirmados.push(`Usuária de drogas (${getTagValues('drogas-tags') || 'não especificado'})`);
        } else {
            viciosNegados.push('Drogadição');
        }
        if (viciosAfirmados.length === 0 && viciosNegados.length === 0) {
            return '';
        }
        let negacoesTxt = '';
        if (viciosNegados.length > 0) {
            const negadosFormatado = viciosNegados.join(', ').replace(/,([^,]*)$/, ' e$1');
            negacoesTxt = `Nega ${negadosFormatado}.`;
        }
        let afirmacoesTxt = '';
        if (viciosAfirmados.length > 0) {
            afirmacoesTxt = viciosAfirmados.join(', ');
        }
        let viciosTxt = '';
        if (negacoesTxt && afirmacoesTxt) {
            viciosTxt = `${negacoesTxt} ${afirmacoesTxt}`;
        } else if (negacoesTxt) {
            viciosTxt = negacoesTxt;
        } else if (afirmacoesTxt) {
            viciosTxt = afirmacoesTxt;
        }
        return `# Vícios\n- ${viciosTxt}`;
    }
/**
 * Constrói a seção de medicações em uso usando a função utilitária.
 */
function buildMedicacoes(data) {
    return buildSection('Em uso de', data.custom_meds);
}
    function buildExameFisico(data) {
        const vitais = [
            data.pa ? `PA ${data.pa} mmHg` : null,
            data.pa_dle ? `PA pós DLE ${data.pa_dle} mmHg` : null,
            data.fc ? `FC ${data.fc} bpm` : null,
            data.spo2 ? `SpO2 ${data.spo2}%` : null,
            data.tax ? `TAx ${data.tax}°C` : null,
            getSelectValue('proteinuria') !== 'N.R' ? `Proteinúria: ${getSelectValue('proteinuria')}` : null,
        ].filter(Boolean);
        const efParts = [
            data.altura_uterina ? `AU ${data.altura_uterina} cm` : null,
            data.bcf ? `BCF ${data.bcf} bpm` : null,
            getBinaryToggleValue('mov_fetal') ? `MF ${getBinaryToggleValue('mov_fetal')}` : null,
            getBinaryToggleValue('tonus_uterino') ? `TU ${getBinaryToggleValue('tonus_uterino')}` : null,
            data.dinamica_ausente === 'on' ? `DU Ausente` : (data.dinamica_uterina ? `DU ${data.dinamica_uterina}` : null),
        ].filter(Boolean).join(' | ');
        let toqueTxt = '';
        const toqueAvoid = data.toque_evitado === 'on';
        if (toqueAvoid) {
            toqueTxt = 'TV: evitado.';
        } else {
            const toqueDetails = [];
            if (getSelectValue('espessura')) toqueDetails.push(`espessura ${getSelectValue('espessura').toLowerCase()}`);
            if (getSelectValue('posicao')) toqueDetails.push(`posição ${getSelectValue('posicao').toLowerCase()}`);
            if (data.dilatacao) toqueDetails.push(`pérvio para ${data.dilatacao} cm`);
            if (getBinaryToggleValue('bolsa') === 'Rota') {
                const dataRomp = data.hora_rompimento ? `às ${formateDateHoraBR(new Date(data.hora_rompimento))}` : '';
                toqueDetails.push(`bolsa rota ${dataRomp}`);
                if (getSelectValue('cor_liquido')) toqueDetails.push(`líquido ${getSelectValue('cor_liquido').toLowerCase()}`);
            } else if (getBinaryToggleValue('bolsa')) {
                toqueDetails.push(`bolsa ${getBinaryToggleValue('bolsa').toLowerCase()}`);
            }
            if (getBinaryToggleValue('sangramento')) {
                const sangramentoText = getBinaryToggleValue('sangramento') === 'Presente' ? 'com sangramento em dedo de luva' : 'sem sangramento em dedo de luva';
                toqueDetails.push(sangramentoText);
            }
            toqueTxt = `TV: ${toqueDetails.length > 0 ? toqueDetails.join(', ') : 'não realizado'}.`;
        }
        const especAvoid = data.especular_evitado === 'on';
        const especularTxt = especAvoid ? 'EE: evitado.' : `EE: ${data.desc_especular?.trim() || 'não descrito'}.`;
        return `# Exame Físico\n- ${vitais.join(' | ')}\n- ${efParts}\n- ${toqueTxt}\n- ${especularTxt}`;
    }
    function buildExamesLaboratoriais(data) {
        const labsTxt = data.exames_laboratoriais?.trim();
        if (labsTxt) {
            return `# Exames Laboratoriais\n${labsTxt}`;
        }
        return '';
    }
    function buildExamesImagem(data) {
        const usgData = data.ultrassonografias;
        const imagemTxt = data.exames_imagem?.trim();
        let usgTxt = '';
        if (usgData && usgData.length > 0) {
            const formattedUsgs = usgData.map(usg => {
                if (!usg.usg_data) return null;
                const usgHeader = `- (${formatDateBR(new Date(usg.usg_data))}) USG ${usg.usg_tipo || ''}:`;
                const conceptosList = usg.conceptos.map(concepto => {
                    const details = [];
                    if (concepto.feto_situacao) details.push(`situação ${concepto.feto_situacao.toLowerCase()}`);
                    if (concepto.feto_apresentacao) details.push(`apresentação ${concepto.feto_apresentacao.toLowerCase()}`);
                    if (concepto.feto_dorso) details.push(`dorso à ${concepto.feto_dorso.toLowerCase()}`);
                    if (concepto.feto_bcf) details.push(`BCF ${concepto.feto_bcf}bpm`);
                    let pfeTxt = '';
                    if (concepto.feto_peso) {
                        pfeTxt = `PFE ${concepto.feto_peso}g`;
                        if (concepto.feto_percentil) pfeTxt += ` (p${concepto.feto_percentil})`;
                        details.push(pfeTxt);
                    }
                    let placentaTxt = '';
                    if (concepto.placenta_localizacao) {
                        placentaTxt = `Placenta ${concepto.placenta_localizacao.toLowerCase()}`;
                        if (concepto.placenta_grau) placentaTxt += `, grau ${concepto.placenta_grau}`;
                        details.push(placentaTxt);
                    }
                    if (concepto.feto_ila) details.push(`ILA ${concepto.feto_ila}cm`);
                    if (concepto.feto_mbv) details.push(`MBV ${concepto.feto_mbv}cm`);
                    const obs = concepto.feto_observacoes?.trim();
                    const obsTxt = obs ? `(${obs})` : '';
                    return `${details.join(', ')} ${obsTxt}`.trim();
                }).filter(Boolean);
                return `${usgHeader} ${conceptosList.join('\n')}`;
            }).filter(Boolean);
            usgTxt = formattedUsgs.length > 0 ? formattedUsgs.join('\n') : '';
        }
        if (usgTxt || imagemTxt) {
            let content = '';
            if (usgTxt) {
                content += usgTxt;
            }
            if (imagemTxt) {
                if (content) content += '\n';
                content += imagemTxt;
            }
            return `# Exames de Imagem\n${content}`;
        }
        return '';
    }
/**
 * Constrói a seção de hipótese diagnóstica usando a função utilitária.
 */
function buildHipoteseDiagnostica(data) {
    return buildSection('Hipótese Diagnóstica', data.hipotese_tags);
}
    function buildCondutas(data) {
        const conds = getCheckedValues('conduta');
        const outrasConds = document.getElementById('condutas-tags').getTags();
        const allCondutas = [...conds, ...outrasConds];
        return `# Conduta\n${(allCondutas.length ? allCondutas : ['—']).map(c => `- ${c}`).join('\n')}`;
    }
    function buildAssinaturas(data) {
        const signatures = data.signatures?.map(s => `${s.title} ${s.name}`).filter(Boolean) || [];
        return signatures.length ? signatures.join(' + ') : '';
    }

/**
 * Constrói o texto final do prontuário com base nos dados do formulário.
 * @returns {string} O texto formatado do prontuário.
 */
function buildOutput() {
    const data = getFormData();

    // Seções principais
    const header = buildHeader();
    const identificacao = formatarIdentificacao(data.nome, data.idade, data.procedencia);
    const historicoObstetrico = buildHistoricoObstetrico(data);
    const complementares = buildComplementares(data);
    const hda = `# HDA\n${data.hda?.trim() || '—'}`;
    const exameFisico = buildExameFisico(data);
    const conduta = buildCondutas(data);
    const assinaturas = buildAssinaturas(data);

    // Seções que utilizam a nova função utilitária
    const alergias = buildAlergias(data);
    const vicios = buildVicios(data);
    const comorbidades = buildComorbidades(data);
    const medicacoes = buildMedicacoes(data);
    const hipotese = buildHipoteseDiagnostica(data);
    const examesLaboratoriais = buildExamesLaboratoriais(data);
    const examesImagem = buildExamesImagem(data);
    
    const sections = [
        header, identificacao, historicoObstetrico, complementares, alergias,
        vicios, comorbidades, medicacoes, hda, exameFisico,
        examesLaboratoriais, examesImagem, hipotese, conduta, assinaturas
    ];

    return sections.filter(Boolean).join('\n\n');
}
function buildAIHOutput() {}
// ===============================================
// ===== 6. LÓGICA DE PAGINAÇÃO ==================
// ===============================================
function renderPaginationControls(totalPages, totalItems) {
    let paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer) {
        const tableContainer = document.querySelector('#saved-atendimentos-table').closest('.table-container');
        paginationContainer = document.createElement('div');
        paginationContainer.id = 'pagination-container';
        paginationContainer.className = 'd-flex justify-content-center mt-3'; // Use classes Bootstrap para alinhamento
        tableContainer.after(paginationContainer);
    }
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }
    let paginationHtml = `<ul class="pagination">`;
    paginationHtml += `<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage - 1}">Anterior</a></li>`;
    for (let i = 1; i <= totalPages; i++) {
        paginationHtml += `<li class="page-item ${currentPage === i ? 'active' : ''}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
    }
    paginationHtml += `<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#" data-page="${currentPage + 1}">Próximo</a></li>`;
    paginationHtml += `</ul>`;
    paginationContainer.innerHTML = paginationHtml;
    paginationContainer.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page >= 1 && page <= totalPages) {
                currentPage = page;
                renderSavedAtendimentos();
            }
        });
    });
}
function renderSavedAtendimentos(searchTerm = '') {
    savedTableBody.innerHTML = '';
    const savedData = JSON.parse(localStorage.getItem(LS_KEY));
    let keys = Object.keys(savedData || {});
    if (searchTerm.trim() !== '') {
        const lowerCaseTerm = searchTerm.toLowerCase().trim();
        keys = keys.filter(key => {
            const data = savedData[key];
            const nome = data.nome?.toLowerCase() || '';
            const prontuario = data.prontuario?.toLowerCase() || '';
            return nome.includes(lowerCaseTerm) || prontuario.includes(lowerCaseTerm);
        });
        currentPage = 1;
    }
    const totalPages = Math.ceil(keys.length / ITEMS_PER_PAGE);
    if (keys.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="6" style="text-align: center;">Nenhum atendimento encontrado.</td>`;
        savedTableBody.appendChild(emptyRow);
        renderPaginationControls(0, 0);
        return;
    }
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentItems = keys.slice(startIndex, endIndex);
    currentItems.forEach(key => {
        const data = savedData[key];
        const newRow = document.createElement('tr');
        newRow.dataset.key = key;
        const date = data._timestamp ? new Date(data._timestamp).toLocaleDateString('pt-BR') : 'N/A';
        const time = data._timestamp ? new Date(data._timestamp).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit'
        }) : 'N/A';
        const name = data.nome?.trim() || 'Sem nome';
        const igUsg = data['ig-usg-atual'] || 'N/A';
        const comorbToggles = [];
        if (data.comorbidade_dmg_dieta) comorbToggles.push('DMG (Dieta)');
        if (data.comorbidade_dmg_insulina) comorbToggles.push('DMG (Insulina)');
        if (data.comorbidade_hag) comorbToggles.push('HAG');
        if (data.comorbidade_has) comorbToggles.push('HAS');
        const allComorbidades = [...comorbToggles, ...(data.comorbidades_tags || [])];
        const comorbidades = allComorbidades.length > 0 ? allComorbidades.join(', ') : 'Nenhum';
        const prontuario = data.prontuario?.trim() || 'N/A';
        newRow.innerHTML = `
            <td>${date} às ${time}</td>
            <td>${name}</td>
            <td>${igUsg}</td>
            <td>${prontuario}</td>
            <td>${comorbidades}</td>
            <td style="line-height: 2">
                <button class="btn btn-sm load-btn"><i class="fa fa-folder-open" aria-hidden="true"></i></button>
                <button class="btn btn-sm delete-btn"><i class="fa fa-trash-o" aria-hidden="true"></i></button>
                <button class="btn warning btn-sm add-pendencia-btn"><i class="fa fa-plus-circle" aria-hidden="true"></i> Pendência</button>
            </td>
        `;
        newRow.querySelector('.load-btn').addEventListener('click', (e) => {
            const data = {
                "target": {
                    "dataset": {
                        "prontuario": key
                    }
                }
            };
            carregarAtendimento(data);
        });
        newRow.querySelector('.delete-btn').addEventListener('click', () => {
            apagarAtendimento(savedData, key);
        });
        newRow.querySelector('.add-pendencia-btn').addEventListener('click', () => {
            const rowData = savedData[key];
            showPendenciaModal(rowData.nome, rowData.prontuario);
        });
        savedTableBody.appendChild(newRow);
    });
    renderPaginationControls(totalPages, keys.length);
}
// ===============================================
// ===== 7. LÓGICA DE PENDÊNCIAS =================
// ===============================================
function savePendencia(pendencia) {
    let pendencias = JSON.parse(localStorage.getItem(PENDENCIA_LS_KEY)) || [];
    pendencias.push(pendencia);
    localStorage.setItem(PENDENCIA_LS_KEY, JSON.stringify(pendencias));
    renderPendenciasTable();
}
function renderPendenciasTable() {
    pendenciasTableBody.innerHTML = '';
    const pendencias = JSON.parse(localStorage.getItem(PENDENCIA_LS_KEY)) || [];
    if (pendencias.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `<td colspan="5" style="text-align: center;">Nenhuma pendência.</td>`;
        pendenciasTableBody.appendChild(emptyRow);
        return;
    }
    pendencias.forEach((p, index) => {
        const row = document.createElement('tr');
        row.dataset.pendenciaIndex = index;
        row.innerHTML = `
            <td class="tempo-restante-cell" data-timestamp="${p.timestamp}" data-tempo-alarme-ms="${p.tempoAlarmeMs}"></td>
            <td>${p.nome}</td>
            <td>${p.prontuario}</td>
            <td>${p.descricao}</td>
            <td>
                <button class="btn success btn-sm resolver-btn" data-index="${index}">Resolver</button>
                <button class="btn primary btn-sm load-from-pendencia-btn" data-prontuario="${p.prontuario}">Carregar Atendimento</button>
            </td>
        `;
        pendenciasTableBody.appendChild(row);
    });
    document.querySelectorAll('.resolver-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            swal({
                title: "Você tem certeza?",
                text: "Depois de resolvida, você não poderá recuperar essa pendência",
                icon: "info",
                buttons: {
                    cancel: {
                        text: "Cancelar",
                        value: null,
                        visible: true,
                        className: "btn",
                        closeModal: true,
                    },
                    confirm: {
                        text: "Resolver",
                        value: true,
                        visible: true,
                        className: "btn warning",
                        closeModal: true
                    }
                },
                dangerMode: false
            }).then(function(vaiResolver) {
                if (vaiResolver) {
                    const index = e.target.dataset.index;
                    let pendencias = JSON.parse(localStorage.getItem(PENDENCIA_LS_KEY));
                    pendencias.splice(index, 1);
                    localStorage.setItem(PENDENCIA_LS_KEY, JSON.stringify(pendencias));
                    renderPendenciasTable();
                    showNotification('Pendência resolvida.', 'success');
                }
            })
        });
    });
    document.querySelectorAll('.load-from-pendencia-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            carregarAtendimento(e)
        })
    });
}
function updatePendenciaTimers() {
    const pendencias = JSON.parse(localStorage.getItem(PENDENCIA_LS_KEY)) || [];
    let pendenciasAtualizadas = false;
    pendencias.forEach((p, index) => {
        const agora = new Date().getTime();
        const tempoRestanteMs = p.timestamp + p.tempoAlarmeMs - agora;
        if (tempoRestanteMs <= 0 && !p.notified) {
            alertarPendenciaExpirada(p.nome, p.descricao);
            p.notified = true;
            pendenciasAtualizadas = true;
        }
        const row = document.querySelector(`[data-pendencia-index="${index}"]`);
        if (row) {
            const cell = row.querySelector('.tempo-restante-cell');
            let tempoTexto;
            if (tempoRestanteMs <= 0) {
                tempoTexto = 'EXPIRADO!';
                row.style.backgroundColor = '#FFCCCC';
            } else {
                const segundos = Math.floor(tempoRestanteMs / 1000) % 60;
                const minutos = Math.floor(tempoRestanteMs / (60 * 1000));
                tempoTexto = `${minutos} min ${segundos} seg`;
                row.style.backgroundColor = '';
            }
            cell.textContent = tempoTexto;
        }
    });
    if (pendenciasAtualizadas) {
        localStorage.setItem(PENDENCIA_LS_KEY, JSON.stringify(pendencias));
    }
}
function carregarAtendimento(e) {
    swal({
        title: "Você tem certeza?",
        text: "Isso irá substituir todos os dados do atendimento atual.",
        icon: "info",
        buttons: {
            cancel: {
                text: "Cancelar",
                value: null,
                visible: true,
                className: "btn",
                closeModal: true,
            },
            confirm: {
                text: "Carregar",
                value: true,
                visible: true,
                className: "btn primary",
                closeModal: true
            }
        },
        dangerMode: false
    }).then(function(vaiResolver) {
        if (vaiResolver) {
            const prontuario = e.target.dataset.prontuario;
            loadLocal(prontuario);
        }
    });
}
function apagarAtendimento(savedData, key) {
    swal({
        title: "Você tem certeza que deseja apagar este atendimento?",
        text: "Essa ação não poderá ser revertida.",
        icon: "warning",
        buttons: {
            cancel: {
                text: "Cancelar",
                value: null,
                visible: true,
                className: "btn",
                closeModal: true,
            },
            confirm: {
                text: "Apagar",
                value: true,
                visible: true,
                className: "btn error",
                closeModal: true
            }
        },
        dangerMode: true
    }).then(function(vaiResolver) {
        if (vaiResolver) {
            delete savedData[key];
            localStorage.setItem(LS_KEY, JSON.stringify(savedData));
            renderSavedAtendimentos(); // Atualiza a tabela
        }
    });
}
function alertarPendenciaExpirada(nome, descricao) {
    swal({
        title: "Opa! Pendência expirada",
        text: `A pendência de ${nome} (${descricao}) expirou`,
        icon: "info",
        button: "Dispensar",
    });
}
// ===============================================
// ===== 8. RECURSOS EXTERNOS ====================
// ===============================================
// Variáveis e funções para PDF e Assinatura (mantidas do seu código original)
let db;
const DB_NAME = 'prontuarioDB';
const STORE_NAME = 'prontuarios';
const triagemUrl = './triagem-proxy';
/**
 * Funções de utilidade para o PKCE
 */
function setCookie(cname, cvalue, exminutes = 5) {
    const d = new Date();
    d.setTime(d.getTime() + (exminutes * 60 * 1000)); // Calcula o tempo em milissegundos
    let expires = "expires=" + d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    let name = cname + "=";
    let decodedCookie = decodeURIComponent(document.cookie);
    let ca = decodedCookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}
function dec2hex(dec) {
    return ('0' + dec.toString(16)).substr(-2)
}
function generateCodeVerifier() {
    const array = new Uint32Array(56 / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, dec2hex).join('');
}
function generateCodeChallenge(codeVerifier) {
    const digest = CryptoJS.SHA256(codeVerifier).toString(CryptoJS.enc.Base64);
    return digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
/**
 * Abre a conexão com o banco de dados IndexedDB.
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            db.createObjectStore(STORE_NAME, {
                keyPath: 'id'
            });
        };
        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
        request.onerror = (event) => {
            reject('Erro ao abrir o IndexedDB: ' + event.target.errorCode);
        };
    });
}
/**
 * Salva um arquivo no IndexedDB.
 */
function saveFileInDB(key, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
            id: key,
            file: data
        });
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject('Erro ao salvar no IndexedDB: ' + event.target.errorCode);
    });
}
/**
 * Recupera um arquivo do IndexedDB.
 */
function getFileFromDB(key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.file);
        request.onerror = (event) => reject('Erro ao buscar no IndexedDB: ' + event.target.errorCode);
    });
}
/**
 * Gera o PDF, exibe para o usuário e armazena no IndexedDB.
 */
async function generateAndDisplayPDF() {
    if (!form.elements['nome'].value.trim()) {
        showNotification('Por favor, preencha o nome da paciente antes de gerar o PDF.', 'error');
        return;
    }
    const caraterInternacao = form.elements['carater_internacao']?.value;
    let formUrl = '';
    if (caraterInternacao === 'Cesárea') {
        formUrl = './ficha_cesarea.pdf';
    } else if (caraterInternacao === 'Indução ou Normal') {
        formUrl = './ficha_normal.pdf';
    } else {
        formUrl = './ficha_clinico.pdf';
    }
    try {
        console.log("preenchendo...");
        const formPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());
        const pdfDoc = await PDFLib.PDFDocument.load(formPdfBytes);
        const formFields = pdfDoc.getForm();
        const {
            fieldMapping,
            toqueAvoid
        } = collectFormDataAndMapping();
        console.log(fieldMapping);
        fillPDFFields(formFields, fieldMapping);
        if (!toqueAvoid) {
            try {
                formFields.getRadioGroup('Angulo_0WXA').select('>90');
                formFields.getRadioGroup('Promontorio_LQMK').select('inatingivel');
                formFields.getRadioGroup('Espinhas_1G3U').select('planas');
            } catch (e) {
                console.error(`Erro ao preencher campos de rádio de toque.`, e);
            }
        }
        const pdfBytes = await pdfDoc.save();
        const pdfBlob = new Blob([pdfBytes], {
            type: 'application/pdf'
        });
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        await saveFileInDB('prontuarioPdf', pdfBlob);
        btnSignPdf.disabled = false;
        showNotification('PDF gerado com sucesso! Você pode visualizá-lo e, se estiver correto, prosseguir com a assinatura.', 'success');
    } catch (error) {
        console.error('Erro ao gerar o PDF:');
        showNotification('Erro ao gerar o PDF.', error);
    }
}
/**
 * Inicia o fluxo de autorização com o SerproID em um pop-up.
 */
async function initSerproAuth() {
    try {
        const codeVerifier = generateCodeVerifier();
        const codeChallenge = generateCodeChallenge(codeVerifier);
        setCookie("codeVerifier", codeVerifier);
        const url = new URL('http://localhost:3000/auth');
        url.searchParams.append('code_challenge', codeChallenge);
        url.searchParams.append('code_challenge_method', 'S256');
        url.searchParams.append('code_verifier', codeVerifier);
        url.searchParams.append('state', 'aut');
        const authWindow = window.open(url.toString(), 'SerproID Auth', 'popup=true');
        const checkWindow = setInterval(() => {
            if (!authWindow || authWindow.closed) {
                clearInterval(checkWindow);
                console.log('Janela de autenticação fechada.');
                showNotification('O processo de autenticação foi cancelado.');
            }
        }, 1000);
    } catch (error) {
        console.error('Erro ao iniciar a autenticação:', error);
        showNotification('Erro ao iniciar a autenticação. Verifique o console.', 'error');
    }
}
/**
 * Envia o PDF para ser assinado pelo backend e exibe o resultado.
 */
async function signPDF(pdfBlob, accessToken) {
    try {
        const pdfBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(pdfBlob);
        });
        const response = await fetch('http://localhost:3000/assinar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pdf: pdfBase64,
                accessToken: accessToken
            }),
        });
        const result = await response.json();
        if (response.ok) {
            console.log('PDF assinado com sucesso!');
            const signedPdfBytes = Uint8Array.from(atob(result.pdfAssinado), c => c.charCodeAt(0));
            const signedPdfBlob = new Blob([signedPdfBytes], {
                type: 'application/pdf'
            });
            const signedPdfUrl = URL.createObjectURL(signedPdfBlob);
            window.open(signedPdfUrl, '_blank');
        } else {
            console.error('Erro na assinatura:', result.error);
            showNotification('Erro na assinatura: ' + result.error, 'error');
        }
    } catch (error) {
        console.error('Erro na comunicação com o backend:', error);
        showNotification('Erro na comunicação com o backend.', error);
    }
}
/**
 * Coleta os dados do formulário e cria um objeto de mapeamento para os campos do PDF.
 */
function collectFormDataAndMapping() {
    const data = getFormData();
    const today = new Date();
    const dumStr = form.elements['dum'].value;
    const igdum = document.getElementById('ig-dum').value;
    const dppStr = document.getElementById('dpp').value;
    const dataUsgStr = form.elements['data-usg'].value;
    const igUsgStr = document.getElementById('ig-usg').value;
    const igUsgCorr = document.getElementById('ig-usg-atual').value;
    const dataBolsaStr = document.getElementById('hora_rompimento').value;
    const dinamAusente = form.elements['dinamica_ausente'].checked;
    const dinam = form.elements['dinamica_uterina'].value;
    const caraterInternacao = form.elements['carater_internacao']?.value;
    const fieldMapping = {
        Data: today.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        }),
        Prontuario: data.prontuario || '',
        Consultas: data.consultas || '',
        Nome: data.nome || '',
        Motivo: getTagValues('hipotese-tags'),
        Medicacoes: getMedications() || '',
        G: data.gestacoes || '0',
        A: data.abortos || '0',
        P: parseInt(data['partos-normais'] || 0) + parseInt(data['partos-cesarea'] || 0),
        V: data['partos-normais'] || '0',
        C: data['partos-cesarea'] || '0',
        Idade: data.idade || '',
        DUP: data.dup ? formatDateBR(new Date(data.dup)) : '',
        DUM: dumStr ? formatDateBR(new Date(dumStr)) : 'Incerta',
        DPP: dppStr || '',
        IGDUM: igdum || '',
        DataUSG: dataUsgStr ? formatDateBR(new Date(dataUsgStr)) : '',
        IGUSG: igUsgCorr || '',
        DPPUSG: calcDPPFromUsg(dataUsgStr, igUsgStr),
        PA: data.pa || '',
        DLE: data.pa_dle || '',
        Prot: getSelectValue('proteinuria'),
        Temp: data.tax || '',
        FC: data.fc || '',
        Abd: getBinaryToggleValue('abd'),
        Dorso: getBinaryToggleValue('dorso'),
        BCF: data.bcf || '',
        AU: data.altura_uterina ? `${data.altura_uterina}cm` : '',
        DU: dinamAusente ? `Ausente` : (dinam ? `DU ${dinam}` : null),
        Tonus: getBinaryToggleValue('tonus_uterino'),
        Dilatacao: data.dilatacao || '',
        Posicao: getSelectValue('posicao'),
        Espessura: getSelectValue('espessura'),
        DataBolsa: getBinaryToggleValue('bolsa') == "Rota" && dataBolsaStr ? formateDateHoraBR(dataBolsaStr) : '',
        Liquido: getBinaryToggleValue('bolsa') == "Rota" && dataBolsaStr ? getSelectValue('cor_liquido') : '',
        Especular: data['especular_evitado'] ? 'Evitado' : (data['desc_especular'] || ''),
        Ddx: getTagValues('hipotese-tags') || '',
        CD: getCondutaValues() || '',
        Docente: '',
        Ddo: '',
        Acd: '',
        MR: '',
        Bolsa_MJR5: getBinaryToggleValue('bolsa'),
        trSifilis: trLabelsMap.tr_sifilis[data.tr_sifilis],
        trHIV: trLabelsMap.tr_hiv[data.tr_hiv],
        trHepB: trLabelsMap.tr_hepb[data.tr_hepb],
        trHepC: trLabelsMap.tr_hepc[data.tr_hepc],
        Robson: String(classifyRobson(data))
    };
    const signatureItems = document.querySelectorAll('.signature-item');
    signatureItems.forEach((item) => {
        const titleElement = item.querySelector('[name="signature_title"]');
        const nameElement = item.querySelector('[name="signature_name"]');
        if (titleElement && nameElement) {
            const title = titleElement.value;
            const name = nameElement.value.trim();
            if (name) {
                if (title.startsWith('Dr')) {
                    fieldMapping.Docente += (fieldMapping.Docente ? ', ' : '') + name;
                } else if (title.startsWith('Ddo')) {
                    fieldMapping.Ddo += (fieldMapping.Ddo ? ', ' : '') + name;
                } else if (title.startsWith('Acd')) {
                    fieldMapping.Acd += (fieldMapping.Acd ? ', ' : '') + name;
                } else if (title.startsWith('MR')) {
                    fieldMapping.MR += (fieldMapping.MR ? ', ' : '') + name;
                }
            }
        }
    });
    return {
        fieldMapping,
        toqueAvoid: form.elements['toque_evitado'].checked
    };
}
/**
 * Preenche os campos do PDF com base no mapeamento fornecido e lista todos os campos encontrados.
 */
function fillPDFFields(formFields, fieldMapping) {
    console.log('--- CAMPOS ENCONTRADOS NO PDF ---');
    const pdfFieldsList = formFields.getFields().map(field => field.getName());
    console.log(pdfFieldsList);
    console.log('---------------------------------');
    for (const fieldName in fieldMapping) {
        try {
            const field = formFields.getField(fieldName);
            if (field) {
                if (typeof field.setText === 'function') {
                    field.setText(String(fieldMapping[fieldName]));
                    console.log(`Campo de texto "${fieldName}" preenchido com o valor: ${fieldMapping[fieldName]}`);
                } else if (typeof field.select === 'function') {
                    field.select(String(fieldMapping[fieldName]));
                    console.log(`Campo de rádio "${fieldName}" preenchido com o valor: ${fieldMapping[fieldName]}`);
                } else if (typeof field.check === 'function') {
                    if (fieldMapping[fieldName] === true || fieldMapping[fieldName] === 'true' || fieldMapping[fieldName] === 'on') {
                        field.check();
                        console.log(`Checkbox "${fieldName}" marcado.`);
                    } else {
                        field.uncheck();
                        console.log(`Checkbox "${fieldName}" desmarcado.`);
                    }
                } else {
                    console.warn(`Tipo de campo "${fieldName}" não reconhecido.`);
                }
            } else {
                console.warn(`Campo "${fieldName}" não encontrado.`);
            }
        } catch (e) {
            console.error(`Erro ao preencher o campo "${fieldName}":`, e);
        }
    }
}
/**
 * Classifica a paciente em um dos 10 grupos de Robson com base nos dados do formulário.
 */
function classifyRobson(data) {
    const gestacoes = parseInt(data.gestacoes || 0);
    const partosNormais = parseInt(data['partos-normais'] || 0);
    const partosCesarea = parseInt(data['partos-cesarea'] || 0);
    const abortos = parseInt(data.abortos || 0);
    const isNuligesta = gestacoes === 0 || (gestacoes === 1 && partosNormais === 0 && partosCesarea === 0 && abortos === 0);
    const isMultipara = !isNuligesta;
    const temCesareaAnterior = (partosCesarea > 0);
    const igTotalDias = parseIgString(data['ig-usg-atual']) || parseIgString(data['ig-dum']);
    const isIgTermo = igTotalDias !== null && igTotalDias >= (37 * 7);
    const isIgPreTermo = igTotalDias !== null && igTotalDias < (37 * 7);
    const isSpontaneous = data.carater_internacao === 'Indução ou Normal';
    const isInduced = data.carater_internacao === 'Indução ou Normal';
    const isCesareaPreLabor = data.carater_internacao === 'Cesárea';
    const apresentacaoFetal = data.apresentacao;
    const isUnica = data.gemelaridade !== 'on'; // Assumindo que você terá um campo de gemelaridade
    if (!isUnica) {
        return 8;
    }
    if (isIgPreTermo) {
        return 10;
    }
    if (apresentacaoFetal === 'Outra') {
        return 9;
    }
    if (apresentacaoFetal === 'Pélvica') {
        if (isMultipara) {
            return 7;
        } else {
            return 6;
        }
    }
    if (apresentacaoFetal === 'Cefálica' && isIgTermo) {
        if (isNuligesta && isSpontaneous) {
            return 1;
        }
        if (isNuligesta && (isInduced || isCesareaPreLabor)) {
            return 2;
        }
        if (isMultipara && !temCesareaAnterior && isSpontaneous) {
            return 3;
        }
        if (isMultipara && !temCesareaAnterior && (isInduced || isCesareaPreLabor)) {
            return 4;
        }
        if (isMultipara && temCesareaAnterior) {
            return 5;
        }
    }
    return null;
}
// ===============================================
// ===== 9. INICIALIZAÇÃO ========================
// ===============================================
/**
 * Inicia todos os event listeners do formulário, separados por categoria.
 */
function initListeners() {
    initFormListeners();
    initDynamicFieldListeners();
    initButtonListeners();
    initTableListeners();
}
/**
 * Inicia os listeners dos campos do formulário para cálculos e toggles.
 */
function initFormListeners() {
    dumInput.addEventListener('change', refreshPregCalc);
    dumIncerta.addEventListener('change', refreshPregCalc);
    dataUsg.addEventListener('change', refreshPregCalc);
    igUsg.addEventListener('input', refreshPregCalc);

    nuligestaToggle.addEventListener('change', (e) => setObstetricFieldsDisabled(e.target.checked));
    gestacaoInicalToggle.addEventListener('change', () => {
        for (const field of gestacaoInicialFields) field.style.display = gestacaoInicalToggle.checked ? 'none' : '';
    });

    bolsaToggle.addEventListener('change', () => bolsaRotaFields.style.display = bolsaToggle.checked ? 'grid' : 'none');
    toqueEvitado.addEventListener('change', () => toqueFields.style.display = toqueEvitado.checked ? 'none' : 'grid');
    especularEvitado.addEventListener('change', () => especularFields.style.display = especularEvitado.checked ? 'none' : 'block');
    dinamicaAusenteToggle.addEventListener('change', (e) => {
        dinamicaInput.disabled = e.target.checked;
        dinamicaInput.value = '';
    });
    
    // Auto-save listener
    form.addEventListener('input', () => {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => {
            saveLocal();
            console.log('Salvamento automático realizado.');
        }, AUTO_SAVE_DELAY);
    });

    // Toggle Labels
    document.querySelectorAll('.toggle-group input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', () => updateToggleLabel(input));
    });

    // Testes Rápidos
    trLabels.forEach((label) => {
        const input = document.querySelector(`input[name="${label.htmlFor}"]`);
        label.addEventListener('click', () => {
            let currentIndex = trStates.indexOf(input.value);
            let nextIndex = (currentIndex + 1) % trStates.length;
            let nextState = trStates[nextIndex];
            input.value = nextState;
            label.textContent = trLabelsMap[label.htmlFor][nextState];
            label.classList.remove(...trStates);
            label.classList.add(nextState);
        });
    });

    // Vícios
    tabagismoCheckbox.addEventListener('change', () => {
        tabagismoInputDiv.style.display = tabagismoCheckbox.checked ? 'flex' : 'none';
        if (!tabagismoCheckbox.checked) tabagismoInputDiv.querySelector('input').value = '';
    });
    drogasCheckbox.addEventListener('change', () => {
        drogasInputDiv.style.display = drogasCheckbox.checked ? 'flex' : 'none';
        if (!drogasCheckbox.checked) document.getElementById('drogas-tags').setTags([]);
    });
}

/**
 * Inicia os listeners dos botões de adicionar/remover campos dinâmicos.
 */
function initDynamicFieldListeners() {
    addMedicationBtn.addEventListener('click', addMedicationField);
    addSignatureBtn.addEventListener('click', () => addSignatureField());
    addUsgBtn.addEventListener('click', () => {
        createUsgBlock({}, usgContainer.children.length);
    });
}

/**
 * Inicia os listeners dos botões de ação (Gerar, Copiar, Salvar, etc.).
 */
function initButtonListeners() {
    btnClear.addEventListener('click', (e) => {
        e.preventDefault();
        clearAll();
    });
    btnGerarProntuario.addEventListener('click', (e) => {
        e.preventDefault();
        if (!form.elements['nome'].value.trim()) {
            showNotification('Preencha o nome da paciente.');
            return;
        }
        output.value = buildOutput();
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
        outputAih.value = buildAIHOutput();
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
        generateAndDisplayPDF();
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
    listenerPendencias();
}
function listenerPendencias() {
    savedTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-pendencia-btn')) {
            const row = e.target.closest('tr');
            const nome = row.querySelector('td:nth-child(2)').textContent;
            const prontuario = row.querySelector('td:nth-child(4)').textContent;
            modalNome.textContent = nome;
            modalProntuario.textContent = prontuario;
            pendenciaModal.classList.remove('hidden-field');
        }
    });
    btnAddPendenciaForm.addEventListener('click', (e) => {
        e.preventDefault();
        const nome = document.getElementById('nome').value.trim();
        const prontuario = document.getElementById('prontuario').value.trim();
        if (!nome && !prontuario) {
            showNotification('Preencha o nome da paciente ou o prontuário para adicionar uma pendência.', 'error');
            return;
        }
        modalNome.textContent = nome;
        modalProntuario.textContent = prontuario;
        pendenciaModal.classList.remove('hidden-field');
    });
    document.querySelector('#pendencia-modal .close-btn').addEventListener('click', () => {
        pendenciaModal.classList.add('hidden-field');
    });
    btnSalvarPendencia.addEventListener('click', () => {
        const nome = modalNome.textContent;
        const prontuario = modalProntuario.textContent;
        const descricao = pendenciaDescricaoInput.value.trim();
        const tempoMinutos = parseInt(pendenciaTempoInput.value);
        if (!descricao) {
            showNotification('Por favor, adicione uma descrição para a pendência.', 'error');
            return;
        }
        const novaPendencia = {
            nome: nome,
            prontuario: prontuario,
            descricao: descricao,
            timestamp: new Date().getTime(),
            tempoAlarmeMs: tempoMinutos * 60 * 1000,
            notified: false
        };
        savePendencia(novaPendencia);
        showNotification('Pendência adicionada com sucesso!', 'success');
        pendenciaModal.classList.add('hidden-field');
        pendenciaDescricaoInput.value = '';
    });
}
async function initPage() {
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
    refreshPregCalc();
    especularEvitado.dispatchEvent(new Event('change'));
    bolsaToggle.dispatchEvent(new Event('change'));
    toqueEvitado.dispatchEvent(new Event('change'));
    tabagismoCheckbox.dispatchEvent(new Event('change'));
    drogasCheckbox.dispatchEvent(new Event('change'));
    if (!signaturesContainer.children.length) {
        addSignatureField();
    }
}
initPage();