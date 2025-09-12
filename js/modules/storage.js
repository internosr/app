// storage.js

// ===============================================
// ===== CONSTANTES E VARIÁVEIS ==================
// ===============================================
const LS_KEY = 'prontuarios_salvos';
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// ===============================================
// ===== REFERÊNCIAS DO DOM ======================
// ===============================================
const searchInput = document.getElementById('search-input');
const savedTableBody = document.getElementById('saved-atendimentos-table').querySelector('tbody');

// ===============================================
// ===== LÓGICA DE PERSISTÊNCIA ==================
// ===============================================

/**
 * Salva o prontuário atual em uma lista no localStorage.
 */
function saveLocal(data, showNotification, renderSavedAtendimentos) {
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
function loadLocal(identifier, form, showNotification, getFormData, setObstetricFieldsDisabled, updateToggleLabel) {
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
    if (!document.getElementById('signatures-container').children.length) {
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
    const tabagismoCheckbox = document.getElementById('tabagismo');
    tabagismoCheckbox.checked = !!data.tabagismo_detalhe;
    if (tabagismoCheckbox.checked) form.elements['tabagismo_detalhe'].value = data.tabagismo_detalhe;
    const drogasCheckbox = document.getElementById('drogas');
    drogasCheckbox.checked = (data.drogas_tags || []).length > 0;
    tabagismoCheckbox.dispatchEvent(new Event('change'));
    drogasCheckbox.dispatchEvent(new Event('change'));
    document.querySelectorAll('.btn-toggle, .toggle-group input[type="checkbox"]').forEach((el) => {
        const input = el.tagName === 'INPUT' ? el : document.getElementById(el.getAttribute('for'));
        if (input) updateToggleLabel(input);
    });
    setObstetricFieldsDisabled(document.getElementById('nuligesta').checked);
    refreshPregCalc(getFormData(form));
    showNotification(`Atendimento de ${data.nome} (${identifier}) carregado.`);
}

/**
 * Limpa todos os campos do formulário e retorna ao estado inicial.
 */
function clearAll(form) {
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
    document.querySelectorAll('.testes-rapidos .state-toggle-label').forEach((label) => {
        label.textContent = trLabelsMap[label.htmlFor]['nao_realizado'];
        label.classList.remove(...trStates);
        label.classList.add('nao_realizado');
    });
    document.getElementById('dum_incerta').checked = false;
    document.getElementById('nuligesta').checked = false;
    document.getElementById('dinamica_ausente').checked = true;
    document.getElementById('toque_evitado').checked = false;
    document.getElementById('especular_evitado').checked = true;
    document.getElementById('tabagismo').checked = false;
    document.getElementById('drogas').checked = false;
    document.getElementById('nuligesta').dispatchEvent(new Event('change'));
    document.getElementById('dinamica_ausente').dispatchEvent(new Event('change'));
    document.getElementById('toque_evitado').dispatchEvent(new Event('change'));
    document.getElementById('especular_evitado').dispatchEvent(new Event('change'));
    document.getElementById('tabagismo').dispatchEvent(new Event('change'));
    document.getElementById('drogas').dispatchEvent(new Event('change'));
    output.value = '';
}

/**
 * Funções de Paginação
 */
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
            const key = e.target.closest('tr').dataset.key;
            carregarAtendimento(key);
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

function carregarAtendimento(key, form, showNotification, getFormData, setObstetricFieldsDisabled, updateToggleLabel) {
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
            loadLocal(key, form, showNotification, getFormData, setObstetricFieldsDisabled, updateToggleLabel);
        }
    });
}

function apagarAtendimento(savedData, key, showNotification, renderSavedAtendimentos) {
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
            renderSavedAtendimentos();
        }
    });
}

function showPendenciaModal(nome, prontuario) {
    const pendenciaModal = document.getElementById('pendencia-modal');
    const modalNome = document.getElementById('modal-paciente-nome');
    const modalProntuario = document.getElementById('modal-prontuario');
    modalNome.textContent = nome;
    modalProntuario.textContent = prontuario;
    pendenciaModal.classList.remove('hidden-field');
}

export {
    saveLocal,
    loadLocal,
    clearAll,
    renderSavedAtendimentos,
    apagarAtendimento,
    carregarAtendimento
};