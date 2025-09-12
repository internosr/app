// ===============================================
// ===== UTILITIES ===============================
// ===============================================
const MS_PER_DAY = 24 * 60 * 60 * 1000;

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
}

export {
    startClock,
    toDateOnly,
    diffDays,
    addDays,
    formatDateBR,
    formatWeeksDays,
    formateDateHoraBR,
    parseIgString,
    showNotification,
    MS_PER_DAY
};