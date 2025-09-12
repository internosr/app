// pending.js

// ===============================================
// ===== CONSTANTES E VARIÁVEIS ==================
// ===============================================
const PENDENCIA_LS_KEY = 'pendencias_salvas';

// ===============================================
// ===== REFERÊNCIAS DO DOM ======================
// ===============================================
const pendenciasTableBody = document.querySelector('#pendencias-table tbody');

// ===============================================
// ===== LÓGICA DE PENDÊNCIAS ====================
// ===============================================

/**
 * Salva uma nova pendência no localStorage.
 */
function savePendencia(pendencia) {
    let pendencias = JSON.parse(localStorage.getItem(PENDENCIA_LS_KEY)) || [];
    pendencias.push(pendencia);
    localStorage.setItem(PENDENCIA_LS_KEY, JSON.stringify(pendencias));
    renderPendenciasTable();
}

/**
 * Renderiza a tabela de pendências com base nos dados do localStorage.
 */
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

/**
 * Atualiza o temporizador de todas as pendências e emite alertas para as expiradas.
 */
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

function alertarPendenciaExpirada(nome, descricao) {
    swal({
        title: "Opa! Pendência expirada",
        text: `A pendência de ${nome} (${descricao}) expirou`,
        icon: "info",
        button: "Dispensar",
    });
}

export {
    savePendencia,
    renderPendenciasTable,
    updatePendenciaTimers
};