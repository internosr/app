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
 * @returns {object} Um objeto com todos os dados do formulário.
 */
function getFormData(form) {
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
    data.custom_meds = getMedications();
    data.ultrassonografias = getUsgData();
    data.hipotese_tags = document.getElementById('hipotese-tags').getTags();
    data.condutas_tags = document.getElementById('condutas-tags').getTags();
    data.drogas_tags = document.getElementById('drogas-tags').getTags();
    data.signatures = getSignaturesData();
    data.tabagismo_detalhe = data.tabagismo === 'on' ? form.elements['tabagismo_detalhe'].value : '';
    data._timestamp = new Date().toISOString();

    return data;
}

export {
    getFormData,
    getMedications,
    getUsgData,
    getSignaturesData
};