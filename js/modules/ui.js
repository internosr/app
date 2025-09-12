// ui.js

// ===============================================
// ===== REFERÊNCIAS DO DOM (Para este módulo) ===
// ===============================================
const medicationList = document.getElementById('medication-list');
const addMedicationBtn = document.getElementById('add-medication-btn');
const signaturesContainer = document.getElementById('signatures-container');
const addSignatureBtn = document.getElementById('add-signature-btn');
const usgContainer = document.getElementById('usg-container');
const addUsgBtn = document.getElementById('add-usg-btn');
const obstetricoFields = document.getElementById('obstetrico-fields');
const gestacaoAtualFields = document.getElementById('gestacao-atual-fields');
const gestacaoInicialFields = document.getElementsByClassName('gestacao-inicial-fields');
const trLabels = document.querySelectorAll('.testes-rapidos .state-toggle-label');
const bolsaToggle = document.getElementById('bolsa');
const bolsaRotaFields = document.getElementById('bolsa_rota_fields');
const toqueEvitado = document.getElementById('toque_evitado');
const toqueFields = document.getElementById('toque_fields');
const especularEvitado = document.getElementById('especular_evitado');
const especularFields = document.getElementById('especular_fields');
const dinamicaAusenteToggle = document.getElementById('dinamica_ausente');
const dinamicaInput = document.getElementById('dinamica_uterina');
const tabagismoCheckbox = document.getElementById('tabagismo');
const tabagismoInputDiv = document.getElementById('tabagismo-input');
const drogasCheckbox = document.getElementById('drogas');
const drogasInputDiv = document.getElementById('drogas-input');
const pendenciaModal = document.getElementById('pendencia-modal');
const modalNome = document.getElementById('modal-paciente-nome');
const modalProntuario = document.getElementById('modal-prontuario');
const pendenciaDescricaoInput = document.getElementById('pendencia-descricao');
const pendenciaTempoInput = document.getElementById('pendencia-tempo');

// ===============================================
// ===== CONSTANTES E VARIÁVEIS GLOBAIS ==========
// ===============================================
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

// ===============================================
// ===== LÓGICA DE UI ============================
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
// ===== LÓGICA DE EVENTOS (deste módulo) ========
// ===============================================
function initUIListeners(form, showNotification, savePendencia) {
    // Adicionar campos dinâmicos
    addMedicationBtn.addEventListener('click', addMedicationField);
    addSignatureBtn.addEventListener('click', () => addSignatureField());
    addUsgBtn.addEventListener('click', () => {
        createUsgBlock({}, usgContainer.children.length);
    });

    // Lógica de Toggles
    bolsaToggle.addEventListener('change', () => bolsaRotaFields.style.display = bolsaToggle.checked ? 'grid' : 'none');
    toqueEvitado.addEventListener('change', () => toqueFields.style.display = toqueEvitado.checked ? 'none' : 'grid');
    especularEvitado.addEventListener('change', () => especularFields.style.display = especularEvitado.checked ? 'none' : 'block');
    dinamicaAusenteToggle.addEventListener('change', (e) => {
        dinamicaInput.disabled = e.target.checked;
        dinamicaInput.value = '';
    });
    tabagismoCheckbox.addEventListener('change', () => {
        tabagismoInputDiv.style.display = tabagismoCheckbox.checked ? 'flex' : 'none';
        if (!tabagismoCheckbox.checked) tabagismoInputDiv.querySelector('input').value = '';
    });
    drogasCheckbox.addEventListener('change', () => {
        drogasInputDiv.style.display = drogasCheckbox.checked ? 'flex' : 'none';
        if (!drogasCheckbox.checked) document.getElementById('drogas-tags').setTags([]);
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

    // Toggle Labels
    document.querySelectorAll('.toggle-group input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', () => updateToggleLabel(input));
    });

    // Modal de Pendências
    const btnAddPendenciaForm = document.getElementById('btn-add-pendencia-form');
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

    const btnSalvarPendencia = document.getElementById('btn-salvar-pendencia');
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

// ===============================================
// ===== EXPORTAÇÕES =============================
// ===============================================
export {
    setupTagInput,
    addMedicationField,
    addSignatureField,
    createUsgBlock,
    updateToggleLabel,
    setObstetricFieldsDisabled,
    initUIListeners,
    medicationList,
    signaturesContainer,
    usgContainer
};