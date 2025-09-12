import {
    formatDateBR,
    formateDateHoraBR,
    parseIgString
} from './utils.js';

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
    const nomeCompleto = nome?.trim();
    const idadeCompleta = idade?.trim() ? `${idade} anos` : '';
    const partes = [];
    if (nomeCompleto) {
        partes.push(nomeCompleto)
    }
    if (idadeCompleta) {
        partes.push(idadeCompleta);
    }
    if (procedencia?.trim()) {
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

function getCheckedValues(form, name) {
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

function getCondutaValues(form) {
    const conds = getCheckedValues(form, 'conduta');
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

function getSelectValue(form, name) {
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

function buildComplementares(data, trLabelsMap) {
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

function buildComorbidades(data) {
    const comorbToggles = [];
    if (data.comorbidade_dmg_dieta) comorbToggles.push('DMG (Dieta)');
    if (data.comorbidade_dmg_insulina) comorbToggles.push('DMG (Insulina)');
    if (data.comorbidade_hag) comorbToggles.push('HAG');
    if (data.comorbidade_has) comorbToggles.push('HAS');
    const allComorbidades = [...comorbToggles, ...(data.comorbidades_tags || [])];
    return buildSection('Comorbidades', allComorbidades);
}

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

function buildMedicacoes(data) {
    return buildSection('Em uso de', data.custom_meds);
}

function buildExameFisico(data, form) {
    const vitais = [
        data.pa ? `PA ${data.pa} mmHg` : null,
        data.pa_dle ? `PA pós DLE ${data.pa_dle} mmHg` : null,
        data.fc ? `FC ${data.fc} bpm` : null,
        data.spo2 ? `SpO2 ${data.spo2}%` : null,
        data.tax ? `TAx ${data.tax}°C` : null,
        getSelectValue(form, 'proteinuria') !== 'N.R' ? `Proteinúria: ${getSelectValue(form, 'proteinuria')}` : null,
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
        if (getSelectValue(form, 'espessura')) toqueDetails.push(`espessura ${getSelectValue(form, 'espessura').toLowerCase()}`);
        if (getSelectValue(form, 'posicao')) toqueDetails.push(`posição ${getSelectValue(form, 'posicao').toLowerCase()}`);
        if (data.dilatacao) toqueDetails.push(`pérvio para ${data.dilatacao} cm`);
        if (getBinaryToggleValue('bolsa') === 'Rota') {
            const dataRomp = data.hora_rompimento ? `às ${formateDateHoraBR(new Date(data.hora_rompimento))}` : '';
            toqueDetails.push(`bolsa rota ${dataRomp}`);
            if (getSelectValue(form, 'cor_liquido')) toqueDetails.push(`líquido ${getSelectValue(form, 'cor_liquido').toLowerCase()}`);
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

function buildHipoteseDiagnostica(data) {
    return buildSection('Hipótese Diagnóstica', data.hipotese_tags);
}

function buildCondutas(data, form) {
    const conds = getCheckedValues(form, 'conduta');
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
function buildOutput(form, data) {
    const sections = [
        buildHeader(),
        formatarIdentificacao(data.nome, data.idade, data.procedencia),
        buildHistoricoObstetrico(data),
        buildComplementares(data),
        buildAlergias(data),
        buildVicios(data),
        buildComorbidades(data),
        buildMedicacoes(data),
        `# HDA\n${data.hda?.trim() || '—'}`,
        buildExameFisico(data, form),
        buildExamesLaboratoriais(data),
        buildExamesImagem(data),
        buildHipoteseDiagnostica(data),
        buildCondutas(data, form),
        buildAssinaturas(data)
    ];

    return sections.filter(Boolean).join('\n\n');
}

export {
    buildOutput
};