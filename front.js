/**
 * Este script JavaScript é responsável por gerenciar a interface e a lógica de um formulário de prontuário obstétrico.
 * Ele inclui funcionalidades para:
 *
 * 1. Cálculos de data e idade gestacional (IG), como IG pela DUM (Data da Última Menstruação) e DPP (Data Provável do Parto).
 * 2. Manipulação de tags para comorbidades, alergias, condutas, etc.
 * 3. Gerenciamento dinâmico de campos do formulário com base em seleções (ex: alternância de campos de toque vaginal).
 * 4. Salvar e carregar dados do formulário localmente usando o `localStorage`.
 * 5. Gerar um resumo do prontuário em texto formatado para fácil cópia.
 * 6. Gerar e preencher um PDF com os dados do prontuário, mapeando os campos do formulário para os campos do PDF.
 *
 * As funções são organizadas por seções lógicas para maior clareza.
 */

// =====================================
// ===== Utilidades de Data e IG =====
// =====================================

const MS_PER_DAY = 24 * 60 * 60 * 1000;
let autoSaveTimer;
const AUTO_SAVE_DELAY = 2000; // Salva após 2 segundos de inatividade

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
 * Calcula a idade gestacional (IG) atual com base na Data da Última Menstruação (DUM).
 * @param {string} dumStr A DUM em formato de string.
 * @returns {string} A IG formatada em semanas e dias, ou uma string vazia se inválida.
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
 * @param {string} dumStr A DUM em formato de string.
 * @returns {string} A DPP formatada, ou uma string vazia se inválida.
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
 * @param {string} usgDateStr A data da USG.
 * @param {string} usgIgStr A IG da USG.
 * @returns {string} A DPP formatada, ou uma string vazia se inválida.
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
 * @param {string} dataUsgStr A data da USG.
 * @param {string} igUsgStr A IG da USG.
 * @returns {string} A IG corrigida formatada, ou uma string vazia se inválida.
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
 * Classifica a paciente em um dos 10 grupos de Robson com base nos dados do formulário.
 * @param {object} data Os dados coletados do formulário.
 * @returns {number|null} O número do grupo (1 a 10) ou null se não houver correspondência.
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

    // A nova lógica de prioridade
    
    // Grupo 8: Gestação Múltipla
    if (!isUnica) {
        return 8;
    }

    // Grupo 10: Feto Pré-termo
    if (isIgPreTermo) {
        return 10;
    }
    
    // Grupo 9: Feto Transverso ou Oblíquo
    if (apresentacaoFetal === 'Outra') {
        return 9;
    }

    // Grupos 6 e 7: Apresentação Pélvica
    if (apresentacaoFetal === 'Pélvica') {
        if (isMultipara) {
            return 7;
        } else {
            return 6;
        }
    }
    
    // Grupos 1 a 5 (apenas para apresentação Cefálica e a termo)
    if (apresentacaoFetal === 'Cefálica' && isIgTermo) {
        
        // Grupo 1: Nulípara, espontâneo
        if (isNuligesta && isSpontaneous) {
            return 1;
        }

        // Grupo 2: Nulípara, indução ou cesárea antes do TP
        if (isNuligesta && (isInduced || isCesareaPreLabor)) {
            return 2;
        }
        
        // Grupo 3: Multípara sem cesárea anterior, espontâneo
        if (isMultipara && !temCesareaAnterior && isSpontaneous) {
            return 3;
        }

        // Grupo 4: Multípara sem cesárea anterior, indução ou cesárea antes do TP
        if (isMultipara && !temCesareaAnterior && (isInduced || isCesareaPreLabor)) {
            return 4;
        }
        
        // Grupo 5: Multípara com cesárea anterior
        if (isMultipara && temCesareaAnterior) {
            return 5;
        }
    }

    return null; // Caso nenhum critério seja atendido
}

// ===========================================
// ===== Lógica de Tags (Comorbidades e Condutas) =====
// ===========================================

/**
 * Configura um campo de entrada para funcionar como um sistema de tags.
 * Permite adicionar tags digitando, usando vírgula ou colando.
 * @param {string} containerId O ID do elemento container das tags.
 * @param {string} inputId O ID do campo de entrada.
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

    /**
     * Obtém todas as tags do container.
     * @returns {string[]} Um array com o texto de cada tag.
     */
    container.getTags = () => {
        return Array.from(container.querySelectorAll('.tag')).map((el) => el.textContent.replace(/\s*×$/, ''));
    };

    /**
     * Define as tags do container, substituindo as existentes.
     * @param {string[]} tags Um array de strings para serem adicionadas como tags.
     */
    container.setTags = (tags) => {
        Array.from(container.querySelectorAll('.tag')).forEach((tag) => container.removeChild(tag));
        tags.forEach(addTag);
    };
}

// ==============================================
// ===== Manipulação de Formulário e UI =====
// ==============================================

// ===================================
// ===== Sistema de Notificação =====
// ===================================

/**
 * Exibe uma notificação moderna no canto superior direito.
 * @param {string} message A mensagem a ser exibida.
 * @param {string} [type='info'] O tipo da notificação ('success', 'error', 'info').
 * @param {number} [duration=3000] Duração em milissegundos antes de desaparecer.
 */
<<<<<<< HEAD
function showNotification(message, type = 'info', duration = 3000) {
=======
function showNotification(message, type = 'info', duration = 5000) {
>>>>>>> d2dd3ce (Commit inicial)
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

// Referências a elementos do DOM
const form = document.getElementById('form-prontuario');
const dumInput = document.getElementById('dum');
const dumIncerta = document.getElementById('dum_incerta');
const igDum = document.getElementById('ig-dum');
const dpp = document.getElementById('dpp');
const dataUsg = document.getElementById('data-usg');
const igUsg = document.getElementById('ig-usg');
const igUsgAtual = document.getElementById('ig-usg-atual');
const bolsaToggle = document.getElementById('bolsa');
const bolsaRotaFields = document.getElementById('bolsa_rota_fields');
const toqueEvitado = document.getElementById('toque_evitado');
const toqueFields = document.getElementById('toque_fields');
const especularEvitado = document.getElementById('especular_evitado');
const especularFields = document.getElementById('especular_fields');
const output = document.getElementById('output');
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

// Lógica de estado para Testes Rápidos
const trLabels = document.querySelectorAll('.testes-rapidos .state-toggle-label');
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
}

/**
 * Habilita ou desabilita os campos relacionados à obstetrícia.
 * @param {boolean} disabled Se os campos devem ser desabilitados.
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

/**
 * Atualiza o texto do label de um botão de alternância com base no estado do checkbox.
 * @param {HTMLInputElement} input O checkbox.
 */
function updateToggleLabel(input) {
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label && label.dataset.default) {
        label.textContent = input.checked ? label.dataset.checked : label.dataset.default;
    }
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
 * @param {string} [title='Ddo.'] O título da assinatura (ex: "Dr.", "Acd.").
 * @param {string} [name=''] O nome da pessoa que irá assinar.
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
 * Cria um novo bloco de USG, incluindo a data, tipo e um concepto inicial.
 * @param {object} [data] Dados para pré-preenchimento.
 * @param {number} index O índice do USG.
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
 * @param {HTMLElement} container O container pai (concepto-container).
 * @param {object} [data] Dados para pré-preenchimento.
 * @param {number} index O índice do concepto.
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
        <label for="feto_ila_${parentUsgIndex}_${index}">ILA (mm)</label>
        <input type="number" id="feto_ila_${parentUsgIndex}_${index}" name="feto_ila_${parentUsgIndex}_${index}" value="${data.feto_ila || ''}" />
      </div>
      <div class="form-group">
        <label for="feto_mbv_${parentUsgIndex}_${index}">MBV (mm)</label>
        <input type="number" id="feto_mbv_${parentUsgIndex}_${index}" name="feto_mbv_${parentUsgIndex}_${index}" value="${data.feto_mbv || ''}" />
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

// ======================================
// ===== Salvar, Carregar e Limpar Localmente =====
// ======================================

const LS_KEY = 'prontuarios_salvos';
const savedList = document.getElementById('saved-atendimentos-list');
const savedTableBody = document.getElementById('saved-atendimentos-table').querySelector('tbody');


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

    data.alergias_tags = document.getElementById('alergias-tags').getTags();
    data.comorbidades_tags = document.getElementById('comorbidades-tags').getTags();
    data.condutas_tags = document.getElementById('condutas-tags').getTags();
    data.hipotese_tags = document.getElementById('hipotese-tags').getTags();
    data.drogas_tags = document.getElementById('drogas-tags').getTags();

    data.tabagismo_detalhe = tabagismoCheckbox.checked ? form.elements['tabagismo_detalhe'].value : '';

    const customMeds = [];
    document.querySelectorAll('#medication-list .medication-item input[name="med_outra"]').forEach((el) => {
        if (el.checked) {
            const doseEl = el.parentElement.parentElement.querySelector('[name="dose_outra"]');
            customMeds.push(doseEl.value);
        }
    });
    data.custom_meds = customMeds;

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
    data.signatures = signatures;
    data._timestamp = new Date().toISOString();

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
        feto_ila: conceptoItem.querySelector('input[name^="feto_ila_"]').value, // Novo campo ILA
        feto_mbv: conceptoItem.querySelector('input[name^="feto_mbv_"]').value, // Novo campo MBV
        feto_observacoes: conceptoItem.querySelector('textarea[name^="feto_observacoes_"]').value
      });
    });
    usgData.push(usgBlock);
  });
  data.ultrassonografias = usgData;

  return data;
}

/**
 * Salva o prontuário atual em uma lista no localStorage.
 * O identificador é o número do prontuário ou o nome da paciente.
 */
function saveLocal() {
    const data = getFormData();

    // Determina o identificador do prontuário
    const identifier = data.prontuario?.trim() || data.nome?.trim();
    if (!identifier) {
        showNotification('Por favor, preencha o número do prontuário ou o nome da paciente para salvar.', 'error');
        return;
    }

    let savedData = JSON.parse(localStorage.getItem(LS_KEY)) || {};
    savedData[identifier] = data;
    localStorage.setItem(LS_KEY, JSON.stringify(savedData));
    renderSavedAtendimentos(); // Atualiza a lista após salvar
}

/**
 * Carrega um prontuário específico a partir do localStorage.
 * @param {string} identifier O identificador (prontuário ou nome) do atendimento a ser carregado.
 */
function loadLocal(identifier) {
    const savedData = JSON.parse(localStorage.getItem(LS_KEY));
    if (!savedData || !savedData[identifier]) {
        showNotification('Dados não encontrados.', 'error');
        return;
    }
    const data = savedData[identifier];
    form.reset();

    // Restaura campos dinâmicos existentes
    document.querySelectorAll('.signature-item').forEach((el) => el.remove());
    document.querySelectorAll('#medication-list .medication-item input[name="dose_outra"]').forEach((el) => el.closest('.medication-item').remove());
    document.querySelectorAll('.usg-item').forEach(el => el.remove());

    // Restaura assinaturas
    data.signatures?.forEach((sig) => addSignatureField(sig.title, sig.name));
    if (!signaturesContainer.children.length) {
        addSignatureField();
    }

    // Restaura medicamentos
    data.custom_meds?.forEach((med) => {
        addMedicationField();
        const lastMedication = medicationList.lastElementChild;
        lastMedication.querySelector('[name="dose_outra"]').value = med;
    });

    // Restaura ultrassonografias
    if (data.ultrassonografias && data.ultrassonografias.length > 0) {
        data.ultrassonografias.forEach((usg, usgIndex) => {
            createUsgBlock({
                date: usg.usg_data,
                type: usg.usg_tipo,
                conceptos: usg.conceptos
            }, usgIndex);
        });
        
        // Adiciona a lógica para expandir o card de USGs
        const usgCardHeader = document.querySelector('.collapsible-card .collapsible-header');
        const usgCardContent = usgCardHeader.nextElementSibling;
        
        usgCardHeader.classList.add('active');
        usgCardContent.style.display = 'block';
        
    } else {
        createUsgBlock({}, 0); // Cria um bloco USG vazio por padrão
        const usgCardHeader = document.querySelector('.collapsible-card .collapsible-header');
        const usgCardContent = usgCardHeader.nextElementSibling;
        
        usgCardHeader.classList.remove('active');
        usgCardContent.style.display = 'none';
    }

    // Restaura campos principais e de toggles
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

    // Restaura as tags
    document.getElementById('alergias-tags').setTags(data.alergias_tags || []);
    document.getElementById('comorbidades-tags').setTags(data.comorbidades_tags || []);
    document.getElementById('condutas-tags').setTags(data.condutas_tags || []);
    document.getElementById('hipotese-tags').setTags(data.hipotese_tags || []);
    document.getElementById('drogas-tags').setTags(data.drogas_tags || []);

    // Restaura a visibilidade de campos condicionais
    tabagismoCheckbox.checked = !!data.tabagismo_detalhe;
    if (tabagismoCheckbox.checked) form.elements['tabagismo_detalhe'].value = data.tabagismo_detalhe;
    drogasCheckbox.checked = (data.drogas_tags || []).length > 0;
    tabagismoCheckbox.dispatchEvent(new Event('change'));
    drogasCheckbox.dispatchEvent(new Event('change'));

    // Atualiza a UI para o estado carregado
    document.querySelectorAll('.btn-toggle, .toggle-group input[type="checkbox"]').forEach((el) => {
        const input = el.tagName === 'INPUT' ? el : document.getElementById(el.getAttribute('for'));
        if (input) updateToggleLabel(input);
    });

    setObstetricFieldsDisabled(document.getElementById('nuligesta').checked);
    refreshPregCalc();
    showNotification(`Atendimento de "${identifier}" carregado.`);
}

/**
 * Renderiza a lista de atendimentos salvos em uma tabela na interface.
 */
function renderSavedAtendimentos() {
  savedTableBody.innerHTML = '';
  const savedData = JSON.parse(localStorage.getItem(LS_KEY));

  if (!savedData || Object.keys(savedData).length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="6" style="text-align: center;">Nenhum atendimento salvo.</td>`;
    savedTableBody.appendChild(emptyRow);
    return;
  }

  Object.keys(savedData).forEach(key => {
    const data = savedData[key];
    const newRow = document.createElement('tr');
    newRow.dataset.key = key;

    const date = data._timestamp ? new Date(data._timestamp).toLocaleDateString('pt-BR') : 'N/A';
    const time = data._timestamp ? new Date(data._timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
    const name = data.nome?.trim() || 'Sem nome';
    const igUsg = data['ig-usg-atual'] || 'N/A';
    
    // Concatena as comorbidades de toggle e de tags
    const comorbToggles = [];
    if (data.comorbidade_dmg_dieta) comorbToggles.push('DMG (Dieta)');
    if (data.comorbidade_dmg_insulina) comorbToggles.push('DMG (Insulina)');
    if (data.comorbidade_hag) comorbToggles.push('HAG');
    if (data.comorbidade_has) comorbToggles.push('HAS');
    const allComorbidades = [...comorbToggles, ...data.comorbidades_tags];
    const comorbidades = allComorbidades.length > 0 ? allComorbidades.join(', ') : 'Nenhum';
    const prontuario = data.prontuario?.trim() || 'N/A';

    newRow.innerHTML = `
      <td>${date} às ${time}</td>
      <td>${name}</td>
      <td>${igUsg}</td>
      <td>${prontuario}</td>
      <td>${comorbidades}</td>
      <td>
        <button class="btn btn-sm load-btn">Carregar</button>
        <button class="btn btn-sm delete-btn">Apagar</button>
      </td>
    `;

    // Adiciona o evento de clique para o botão "Carregar"
    newRow.querySelector('.load-btn').addEventListener('click', () => {
      loadLocal(key);
    });

    // Adiciona o evento de clique para o botão "Apagar"
    newRow.querySelector('.delete-btn').addEventListener('click', () => {
      if (confirm(`Tem certeza que deseja apagar o prontuário de "${key}"?`)) {
        delete savedData[key];
        localStorage.setItem(LS_KEY, JSON.stringify(savedData));
        renderSavedAtendimentos(); // Atualiza a tabela
<<<<<<< HEAD
=======
        showNotification('Registro apagado');
>>>>>>> d2dd3ce (Commit inicial)
      }
    });

    savedTableBody.appendChild(newRow);
  });
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

    // Dispara eventos de mudança para atualizar a UI
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

// ==================================
// ===== Gerador de Conteúdo (Texto e PDF) =====
// ==================================

/**
 * Obtém os valores de checkboxes marcados com um nome específico.
 * @param {string} name O atributo `name` dos checkboxes.
 * @returns {string[]} Um array com os valores marcados.
 */
function getCheckedValues(name) {
    return Array.from(form.querySelectorAll(`input[name="${name}"]:checked`)).map((i) => i.value);
}

/**
 * Obtém os valores dos campos de tags e os formata como uma string separada por vírgulas.
 * @param {string} containerId O ID do elemento container das tags.
 * @returns {string} Uma string formatada com os textos das tags.
 */
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

/**
 * Obtém os valores de condutas e os formata como uma string separada por vírgulas.
 * @returns {string} Uma string formatada com as condutas selecionadas.
 */
function getCondutaValues() {
  const conds = getCheckedValues('conduta');
  const outrasConds = document.getElementById('condutas-tags').getTags();
  const allCondutas = [...conds, ...outrasConds];
  return allCondutas.join(', ');
}

/**
 * Obtém o valor de um campo de alternância (toggle) com base no estado `checked`.
 * @param {string} id O ID do campo de entrada.
 * @returns {string} O valor `data-checked` ou `data-default` do label.
 */
function getBinaryToggleValue(id) {
    const input = document.getElementById(id);
    if (!input) return '';
    const label = document.querySelector(`label[for="${id}"]`);
    if (!label) return '';
    return input.checked ? label.dataset.checked : label.dataset.default;
}

/**
 * Obtém o valor de um campo de seleção (`<select>`).
 * @param {string} name O atributo `name` do select.
 * @returns {string} O valor selecionado.
 */
function getSelectValue(name) {
    const select = form.elements[name];
    return select ? select.value : '';
}

/**
 * Obtém a lista de medicamentos preenchidos.
 * @returns {string[]} Um array com os nomes e doses dos medicamentos.
 */
function getMedList() {
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
 * Constrói o texto final do prontuário com base nos dados do formulário.
 * @returns {string} O texto formatado do prontuário.
 */
function buildOutput() {
    const data = getFormData();
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');

    const nome = data.nome?.trim() || '';
    const idade = data.idade?.trim() || '';
    const procedencia = data.procedencia?.trim() || '';
    const tipoSanguineo = data.tipo_sanguineo || 'Não Informado';

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
    const naoRealizados = Object.keys(trResults).filter(k => trResults[k] === 'nao_realizado').map(k => trMap[k]);

    let trTxt = 'TR ';
    const trParts = [];
    if (reagentes.length > 0) trParts.push(`${reagentes.join(', ')} Reagente`);
    if (naoReagentes.length > 0) trParts.push(`${naoReagentes.join(', ')} Não Reagentes`);
    if (naoRealizados.length > 0) trParts.push(`${naoRealizados.join(', ')} Não Realizados`);
    trTxt += trParts.join(', ') + '.';
    if (trParts.length === 0) trTxt = 'TR não realizados.';

    const nuligesta = data.nuligesta === 'on';
    const g = data.gestacoes || '0';
    const pn = Number(data['partos-normais'] || '0');
    const pc = Number(data['partos-cesarea'] || '0');
    const ab = Number(data.abortos || '0');
    const paridade = ((g, pn, pc, ab) => {
  // Lógica para determinar a parte de Partos (P)
  let partos = '';
  const totalPartos = pn + pc;

  if (totalPartos === 0) {
    // Se não há partos normais ou cesáreas, a paridade é P0
    partos = 'P0';
  } else if (pn === 0) {
    // Se há apenas cesáreas (pn = 0 e pc >= 1), exibe P<pc>c
    partos = `P${pc}c`;
  } else if (pc === 0) {
    // Se há apenas partos normais (pc = 0 e pn >= 1), exibe P<pn>v
    partos = `P${pn}v`;
  } else {
    // Se há ambos, exibe o formato completo
    partos = `P${pn}v${pc}c`;
  }

  // Combina todas as partes da string de paridade
  return `G${g}${partos}A${ab}`;
})(g, pn, pc, ab);


 // --- Lógica para formatar os dados das USGs ---
  let usgTxt = data.ultrassonografias && data.ultrassonografias.length > 0 ? '' : '—';
  if (data.ultrassonografias && data.ultrassonografias.length > 0) {
    const formattedUsgs = data.ultrassonografias.map(usg => {
      if (!usg.usg_data) return null; // Ignora USGs sem data

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
        const obsTxt = obs ? `${obs}` : '';

        return `${details.join(', ')} ${obsTxt}`.trim();

      }).filter(Boolean); // Filtra conceitos vazios

      return `${usgHeader} ${conceptosList.join('\n')}`;
    }).filter(Boolean); // Filtra USGs sem data

    usgTxt = formattedUsgs.length > 0 ? formattedUsgs.join('\n') : '—';
  }
  // --- Fim da lógica para formatar os dados das USGs ---

    const dumInc = data.dum_incerta === 'on';
    const igdum = data['ig-dum'];
    const dppStr = data.dpp;
    const dataUsgStr = data['data-usg'];
    const igUsgStr = data['ig-usg'];
    const igUsgCorr = data['ig-usg-atual'];
    const toqueAvoid = data.toque_evitado === 'on';

    const viciosComAfixo = [];
    const viciosSemAfixo = [];
    if (data.etilismo === 'on') viciosSemAfixo.push('Etilismo');
    else viciosComAfixo.push('Etilismo');
    if (data.tabagismo === 'on') viciosSemAfixo.push('Tabagismo');
    else viciosComAfixo.push('Tabagismo');
    if (data.drogas === 'on') viciosSemAfixo.push('Drogadição');
    else viciosComAfixo.push('Drogadição');

    let viciosTxt = '';
    if (viciosComAfixo.length === 3) {
        viciosTxt += `Nega etilismo, tabagismo e uso de drogas.`;
    } else if (viciosComAfixo.length > 0) {
        const negados = viciosComAfixo.join(', ').replace(/,([^,]*)$/, ' e$1');
        viciosTxt += `Nega ${negados}.`;
    }
    if (viciosSemAfixo.length > 0) {
        const afirmados = [];
        if (data.etilismo === 'on') afirmados.push('Etilista');
        if (data.tabagismo === 'on') afirmados.push(data.tabagismo_detalhe ? `Tabagista (${data.tabagismo_detalhe})` : `Tabagista`);
        if (data.drogas === 'on' && data.drogas_tags.length > 0) afirmados.push(`Usuária de drogas (${data.drogas_tags.join(', ')})`);
        if (viciosTxt.length > 0) viciosTxt += ' '
        viciosTxt += afirmados.join(', ');
    }
    if (viciosTxt.length === 0) viciosTxt = 'Nega etilismo, tabagismo e uso de drogas.';

    const hda = data.hda?.trim() || '';
    const especAvoid = data.especular_evitado === 'on';

    const conds = getCheckedValues('conduta');
    const outrasConds = document.getElementById('condutas-tags').getTags();
    const allCondutas = [...conds, ...outrasConds];

    const signatures = data.signatures?.map(s => `${s.title} ${s.name}`).filter(Boolean) || [];

    const header = `# SR às ${hh}:${mm} #`;
    const ident = `${nome || 'Paciente'}, ${idade || '?'} anos, procedente de ${procedencia || '?'}`;

    let obstetrico;
    if (nuligesta) {
        obstetrico = 'Nuligesta.';
    } else {
        const obsParts = [
            `${paridade} | ${dumInc ? `DUM incerta` : `DUM ${formatDateBR(new Date(data.dum))} | IG DUM ${igdum}`}`
        ].filter(Boolean);
        const gestacaoParts = [
            igUsgCorr ? `IG USG ${igUsgCorr}` : null,
            (igUsgStr && dataUsgStr) ? ` (${igUsgStr.replace('s', 's').replace('d', 'd')} em ${formatDateBR(new Date(dataUsgStr))})` : null,
            dppStr ? ` | DPP ${dppStr}` : null,
        ].filter(Boolean).join('');
        obstetrico = `${obsParts.join('\n')} \n${gestacaoParts}`;
    }

     // Nova lógica para coletar e formatar as comorbidades de toggle
    const comorbToggles = [];
    if (data.comorbidade_dmg_dieta) comorbToggles.push('DMG (Dieta)');
    if (data.comorbidade_dmg_insulina) comorbToggles.push('DMG (Insulina)');
    if (data.comorbidade_hag) comorbToggles.push('HAG');
    if (data.comorbidade_has) comorbToggles.push('HAS');

    const allComorbidades = [...comorbToggles, ...data.comorbidades_tags];
    const comorbTxt = `# Comorbidades\n${(allComorbidades.length ? allComorbidades : ['Nega']).map(c => `- ${c}`).join('\n')}`;

    const complementaresTxt = `TS: ${tipoSanguineo} | ${trTxt}`;
    const alergiasTxt = `# Alergias\n${(data.alergias_tags.length ? data.alergias_tags : ['Nega']).map(a => `- ${a}`).join('\n')}`;
    const viciosSectionTxt = `# Vícios\n- ${viciosTxt}`;
    const medsTxt = `# Em uso de\n${(data.custom_meds.length ? data.custom_meds : ['Nega']).map(m => `- ${m}`).join('\n')}`;
    const hdaTxt = `# HDA\n${hda || '—'}`;

    const vitais = [
        data.pa ? `PA ${data.pa} mmHg` : null,
        data.pa_dle ? `PA pós DLE ${data.pa_dle} mmHg` : null,
        data.fc ? `FC ${data.fc} bpm` : null,
        data.spo2 ? `SpO2 ${data.spo2}%` : null,
        data.tax ? `TAx ${data.tax}°C` : null,
        getSelectValue('proteinuria') !== 'nao_realizado' ? `Proteinúria: ${getSelectValue('proteinuria')}` : null,
    ].filter(Boolean);

    const efParts = [
        data.altura_uterina ? `AU ${data.altura_uterina} cm` : null,
        data.bcf ? `BCF ${data.bcf} bpm` : null,
        getBinaryToggleValue('mov_fetal') ? `MF ${getBinaryToggleValue('mov_fetal')}` : null,
        getBinaryToggleValue('tonus_uterino') ? `TU ${getBinaryToggleValue('tonus_uterino')}` : null,
        data.dinamica_ausente === 'on' ? `DU Ausente` : (data.dinamica_uterina ? `DU ${data.dinamica_uterina}` : null),
    ].filter(Boolean).join(' | ');

    let toqueTxt = '';
    if (toqueAvoid) {
        toqueTxt = 'TV: evitado';
    } else {
        const toqueDetails = [];
        if (getSelectValue('espessura')) toqueDetails.push(getSelectValue('espessura'));
        if (getSelectValue('posicao')) toqueDetails.push(getSelectValue('posicao'));
        if (data.dilatacao) toqueDetails.push(`pérvio para ${data.dilatacao} cm`);
        if (getBinaryToggleValue('bolsa')) {
            if (getBinaryToggleValue('bolsa') === 'Rota') {
                const dataRomp = data.hora_rompimento ? `às ${formateDateHoraBR(new Date(data.hora_rompimento))}` : '';
                toqueDetails.push(`bolsa rota ${dataRomp}`);
                if (getSelectValue('cor_liquido')) toqueDetails.push(`líquido ${getSelectValue('cor_liquido')}`);
            } else {
                toqueDetails.push(`bolsa ${getBinaryToggleValue('bolsa').toLowerCase()}`);
            }
        }
        if (getBinaryToggleValue('sangramento')) {
            const sangramentoText = getBinaryToggleValue('sangramento') === 'Presente' ? 'com sangramento em dedo de luva' : 'sem sangramento em dedo de luva';
            toqueDetails.push(sangramentoText);
        }
        toqueTxt = `TV: ${toqueDetails.length > 0 ? toqueDetails.join(', ') : 'não realizado'}.`;
    }

    const especularTxt = especAvoid ? 'EE: evitado' : `EE: ${data.desc_especular?.trim() || 'não descrito'}`;

    const efTxt = `# Exame Físico\n- ${vitais.join(' | ')}\n- ${efParts}\n- ${toqueTxt}\n- ${especularTxt}`;
    const labsTxt = `# Exames Laboratoriais\n${data.exames_laboratoriais?.trim() || '—'}`;
    const imgTxt = `# Exames de Imagem\n${usgTxt || '—'}\n${data.exames_imagem?.trim() || ''}`.trim();
    const hipTxt = `# Hipótese Diagnóstica\n${(data.hipotese_tags.length ? data.hipotese_tags : ['—']).map(c => `- ${c}`).join('\n')}`;
    const condTxt = `# Conduta\n${(allCondutas.length ? allCondutas : ['—']).map(c => `- ${c}`).join('\n')}`;
    const assTxt = signatures.length ? signatures.join(' + ') : '';

    return [header, '', ident, obstetrico, complementaresTxt, '', alergiasTxt, '', viciosSectionTxt, '', comorbTxt, '', medsTxt, '', hdaTxt, '', efTxt, '', labsTxt, '', imgTxt, '', hipTxt, '', condTxt, '', assTxt].filter(Boolean).join('\n\n');
}

/**
 * Coleta os dados do formulário e cria um objeto de mapeamento para os campos do PDF.
 * @returns {object} Um objeto com os dados formatados e mapeados.
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
        Data: today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
        Prontuario: data.prontuario || '',
        Consultas: data.consultas || '',
        Nome: data.nome || '',
        Motivo: getTagValues('hipotese-tags'),
        Medicacoes: getMedList() || '',
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

    return { fieldMapping, toqueAvoid: form.elements['toque_evitado'].checked };
}

/**
 * Preenche os campos do PDF com base no mapeamento fornecido e lista todos os campos encontrados.
 * @param {PDFLib.PDFForm} formFields O objeto de formulário do PDF.
 * @param {object} fieldMapping O objeto de mapeamento de dados.
 */
function fillPDFFields(formFields, fieldMapping) {
    // --- CÓDIGO DE DEPURAÇÃO (MANTIDO) ---
    console.log('--- CAMPOS ENCONTRADOS NO PDF ---');
    const pdfFieldsList = formFields.getFields().map(field => field.getName());
    console.log(pdfFieldsList);
    console.log('---------------------------------');
    // --- FIM DO CÓDIGO DE DEPURAÇÃO ---

    for (const fieldName in fieldMapping) {
        try {
            // Tenta obter o campo como um tipo genérico primeiro
            const field = formFields.getField(fieldName);
            
            if (field) {
                // Checa se o campo é um campo de texto pelo método `setText`
                if (typeof field.setText === 'function') {
                    field.setText(String(fieldMapping[fieldName]));
                    console.log(`Campo de texto "${fieldName}" preenchido com o valor: ${fieldMapping[fieldName]}`);
                } 
                // Checa se o campo é um grupo de rádio pelo método `select`
                else if (typeof field.select === 'function') {
                    field.select(String(fieldMapping[fieldName]));
                    console.log(`Campo de rádio "${fieldName}" preenchido com o valor: ${fieldMapping[fieldName]}`);
                } 
                // Checa se o campo é um checkbox pelo método `check`
                else if (typeof field.check === 'function') {
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


// ==================================
// ===== Lógica de Assinatura (IndexedDB e PKCE) =====
// ==================================

// Variáveis para IndexedDB
let db;
const DB_NAME = 'prontuarioDB';
const STORE_NAME = 'prontuarios';

/**
 * Funções de utilidade para o PKCE
 */
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
 * @param {string} key A chave para o item.
 * @param {Blob} data Os dados do arquivo (Blob).
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
 * @param {string} key A chave do item.
 * @returns {Promise<Blob>} Os dados do arquivo (Blob).
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
// Coleta o caráter da internação
    const caraterInternacao = form.elements['carater_internacao']?.value;
    
    // Escolhe o nome do arquivo PDF com base no caráter da internação
    let formUrl = '';
    if (caraterInternacao === 'Cesárea') {
        formUrl = './ficha_cesarea.pdf';
    } else {
        formUrl = './ficha_digital.pdf'; // Para "Indução ou Normal" e "Tratamento Clínico"
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

        const url = new URL('http://localhost:3000/auth');
        url.searchParams.append('code_challenge', codeChallenge);
        url.searchParams.append('code_challenge_method', 'S256');
        url.searchParams.append('state', codeVerifier);

        // ABRINDO O POP-UP COM AS DIMENSÕES ESPECIFICADAS
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

// ==================================
// ===== Event Listeners e Inicialização =====
// ==================================

const btnPrintPdf = document.getElementById('btn-print-pdf');
const btnSignPdf = document.getElementById('btn-sign-pdf');

// Configuração dos campos de tags
setupTagInput('alergias-tags', 'alergias-input');
setupTagInput('comorbidades-tags', 'comorbidades-input');
setupTagInput('condutas-tags', 'condutas-input');
setupTagInput('hipotese-tags', 'hipotese-input');
setupTagInput('drogas-tags', 'drogas-input-field');

function initListeners() {
    // Eventos de cálculo de IG
    dumInput.addEventListener('change', refreshPregCalc);
    dumIncerta.addEventListener('change', refreshPregCalc);
    dataUsg.addEventListener('change', refreshPregCalc);
    igUsg.addEventListener('input', refreshPregCalc);

    // Eventos de alternância de campos de vício
    tabagismoCheckbox.addEventListener('change', () => {
        tabagismoInputDiv.style.display = tabagismoCheckbox.checked ? 'flex' : 'none';
        if (!tabagismoCheckbox.checked) tabagismoInputDiv.querySelector('input').value = '';
    });
    drogasCheckbox.addEventListener('change', () => {
        drogasInputDiv.style.display = drogasCheckbox.checked ? 'flex' : 'none';
        if (!drogasCheckbox.checked) document.getElementById('drogas-tags').setTags([]);
    });

    // Eventos de estado para Testes Rápidos
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

    // Outros listeners de alternância de campos e labels
    document.querySelectorAll('.toggle-group input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', () => updateToggleLabel(input));
    });
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

    // Listener para o card colapsável
document.querySelectorAll('.collapsible-card .collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
        const cardContent = header.nextElementSibling;
        header.classList.toggle('active');
        if (header.classList.contains('active')) {
            cardContent.style.display = 'block';
        } else {
            cardContent.style.display = 'none';
        }
    });
});

    // Listeners para botões dinâmicos
    addMedicationBtn.addEventListener('click', addMedicationField);
    addSignatureBtn.addEventListener('click', () => addSignatureField());
    addUsgBtn.addEventListener('click', () => {
  createUsgBlock({}, usgContainer.children.length);
});

    // Listeners para botões de controle local
    document.getElementById('btn-save').addEventListener('click', (e) => {
        e.preventDefault();
        saveLocal();
    });
    document.getElementById('btn-clear').addEventListener('click', (e) => {
        e.preventDefault();
        clearAll();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!form.elements['nome'].value.trim()) {
            showNotification('Preencha o nome da paciente.');
            return;
        }

        // Gera o texto do prontuário
        output.value = buildOutput();
        output.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        // Copia o texto para a área de transferência
        output.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();

        // Notifica o usuário
        showNotification('Prontuário gerado e copiado para a área de transferência.');
    });

    document.getElementById('btn-copy').addEventListener('click', () => {
        if (!output.value) {
            showNotification('Nada para copiar.', 'error');
            return;
        }
        output.select();
        document.execCommand('copy');
        window.getSelection().removeAllRanges();
    });

    document.getElementById('btn-download').addEventListener('click', () => {
        if (!output.value) {
            showNotification('Nada para baixar.',  'error');
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

    btnSignPdf.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const storedPdfBlob = await getFileFromDB('prontuarioPdf');
            if (storedPdfBlob) {
                initSerproAuth();
            } else {
                showNotification('Por favor, gere o PDF primeiro.');
            }
        } catch (error) {
            console.error('Erro ao verificar o PDF no IndexedDB:', error);
            showNotification('Ocorreu um erro ao verificar o PDF. Tente gerar novamente.', 'error');
        }
    });

    // Adiciona o listener para a mensagem do pop-up
    window.addEventListener('message', async (event) => {
        if (event.origin !== window.location.origin) {
            return;
        }
        const data = event.data;
        if (data.type === 'serproid-auth-complete' && data.token) {
            console.log('Token de acesso recebido da janela pop-up. Iniciando assinatura...');
            const accessToken = data.token;
            const storedPdfBlob = await getFileFromDB('prontuarioPdf');

            if (storedPdfBlob) {
                await signPDF(storedPdfBlob, accessToken);
            } else {
                showNotification('Erro: PDF não encontrado para a assinatura. Por favor, gere o PDF novamente.', 'error');
            }
        }
    });
    // Listener para o salvamento automático
    form.addEventListener('input', () => {
        clearTimeout(autoSaveTimer); // Limpa o timer anterior
        autoSaveTimer = setTimeout(() => {
            saveLocal(); // Chama a função de salvar após o atraso
            console.log('Salvamento automático realizado.');
        }, AUTO_SAVE_DELAY);
    });
}


// ==================================
// ===== Lógica de Triagem e Atualização =====
// ==================================

const triagemTableBody = document.querySelector('#triagem-table tbody');
const triagemUrl = './triagem-proxy';

const COR_MONTREAL = {
    'Vermelho': '#E74C3C', // Um vermelho tijolo que tem presença, mas não é gritante
    'MUITO URGENTE': '#E67E22', // Um laranja intenso, mais vivo que o pêssego
    'URGENTE': '#F1C40F', // Um amarelo ouro, com bastante brilho
    'POUCO URGENTE': '#27AE60', // Um verde esmeralda, que se destaca sem ser muito claro
    'NÃO URGENTE': '#3498DB', // Um azul céu mais forte
    'SEM CLASSIFICAÇÃO': '#BDC3C7' // Um cinza médio, que se distingue sem ser preto
};

/**
 * Acessa a URL, extrai os dados da tabela de triagem e os retorna.
 * @returns {Promise<Array>} Uma promessa que resolve para um array de objetos de paciente.
 */
async function fetchTriagemData() {
    try {
        const response = await fetch(triagemUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Acessa a tabela correta. A estrutura HTML fornecida não tem ID, então procuramos por ela.
        const triagemTable = doc.querySelector('#example2');
        const patients = [];

        if (triagemTable) {
            const rows = triagemTable.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 4) { // Certifique-se de que a linha tem dados
                    patients.push({
                        prontuario: cells[0].textContent.trim(),
                        nome: cells[1].textContent.trim(),
                        idade: cells[2].textContent.trim(),
                        classificacao: cells[3].textContent.trim(),
                        chegada: cells[4].textContent.trim()
                    });
                }
            });
        }
        console.log(patients);
        return patients;
    } catch (error) {
        console.error('Erro ao buscar dados da triagem:', error);
        return [];
    }
}

/**
 * Popula a tabela de triagem na interface com os dados dos pacientes.
 * @param {Array} patients O array de objetos de paciente.
 */
function populateTriagemTable(patients) {
    triagemTableBody.innerHTML = ''; // Limpa a tabela existente
    
    if (patients.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="5" style="text-align: center;">Nenhum paciente na triagem.</td>`;
        triagemTableBody.appendChild(row);
        return;
    }

    patients.forEach(patient => {
        const row = document.createElement('tr');
        const classificacao = patient.classificacao;
        const cor = COR_MONTREAL[classificacao] || COR_MONTREAL['Branco'];
        row.style.backgroundColor = cor;
        row.dataset.nome = patient.nome;
        row.dataset.prontuario = patient.prontuario;
        row.dataset.idade = patient.idade;

        row.innerHTML = `
            <td>${patient.chegada}</td>
            <td>${patient.nome}</td>
            <td>${patient.idade}</td>
            <td>${patient.prontuario}</td>
            <td>${classificacao}</td>
            <td><button class="btn btn-sm copy-data-btn">Copiar Dados</button></td>
        `;
        
        triagemTableBody.appendChild(row);
    });

    // Adiciona listener para os botões "Copiar Dados"
    document.querySelectorAll('.copy-data-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const row = e.target.closest('tr');
            const nomeInput = document.getElementById('nome');
            const prontuarioInput = document.getElementById('prontuario');
            const idadeInput = document.getElementById('idade');

            nomeInput.value = row.dataset.nome;
            prontuarioInput.value = row.dataset.prontuario;
            idadeInput.value = row.dataset.idade;

            showNotification(`Dados de ${row.dataset.nome} copiados para o formulário.`, 'success');
        });
    });
}

/**
 * Função principal para buscar e atualizar a tabela de triagem.
 */
async function refreshTriagem() {
    console.log("Atualizando Triagem...");
    const patients = await fetchTriagemData();
    populateTriagemTable(patients);
}

/**
 * Função principal de inicialização da página.
 */
async function initPage() {
    startClock();
    initListeners();
    renderSavedAtendimentos();
    refreshTriagem();
    setInterval(refreshTriagem, 60000);

    try {
        await openDB();
    } catch (e) {
        console.error('Erro na inicialização da página:', e);
    }

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

    btnSignPdf.disabled = true;
}

initPage()
