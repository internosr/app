// pdf.js

// ===============================================
// ===== RECURSOS EXTERNOS =======================
// ===============================================

// Variáveis e funções para PDF e Assinatura
let db;
const DB_NAME = 'prontuarioDB';
const STORE_NAME = 'prontuarios';

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
async function generateAndDisplayPDF(form, showNotification, getFormData, getMedications, getSignaturesData, getCondutaValues, getTagValues, getBinaryToggleValue, getSelectValue) {
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
        const formPdfBytes = await fetch(formUrl).then((res) => res.arrayBuffer());
        const pdfDoc = await PDFLib.PDFDocument.load(formPdfBytes);
        const formFields = pdfDoc.getForm();
        const {
            fieldMapping,
            toqueAvoid
        } = collectFormDataAndMapping(form, getFormData, getMedications, getSignaturesData, getCondutaValues, getTagValues, getBinaryToggleValue, getSelectValue);
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
 * Coleta os dados do formulário e cria um objeto de mapeamento para os campos do PDF.
 */
function collectFormDataAndMapping(form, getFormData, getMedications, getSignaturesData, getCondutaValues, getTagValues, getBinaryToggleValue, getSelectValue) {
    const data = getFormData(form);
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
        Prot: getSelectValue(form, 'proteinuria'),
        Temp: data.tax || '',
        FC: data.fc || '',
        Abd: getBinaryToggleValue('abd'),
        Dorso: getBinaryToggleValue('dorso'),
        BCF: data.bcf || '',
        AU: data.altura_uterina ? `${data.altura_uterina}cm` : '',
        DU: dinamAusente ? `Ausente` : (dinam ? `DU ${dinam}` : null),
        Tonus: getBinaryToggleValue('tonus_uterino'),
        Dilatacao: data.dilatacao || '',
        Posicao: getSelectValue(form, 'posicao'),
        Espessura: getSelectValue(form, 'espessura'),
        DataBolsa: getBinaryToggleValue('bolsa') == "Rota" && dataBolsaStr ? formateDateHoraBR(dataBolsaStr) : '',
        Liquido: getBinaryToggleValue('bolsa') == "Rota" && dataBolsaStr ? getSelectValue(form, 'cor_liquido') : '',
        Especular: data['especular_evitado'] ? 'Evitado' : (data['desc_especular'] || ''),
        Ddx: getTagValues('hipotese-tags') || '',
        CD: getCondutaValues(form) || '',
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

export {
    generateAndDisplayPDF,
    collectFormDataAndMapping,
    
};