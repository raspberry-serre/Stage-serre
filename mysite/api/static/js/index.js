const TOIT_CLOSED_ANGLE = 110;
const TOIT_OPEN_ANGLE = 180;

let autoRefreshEnabled = true;
let refreshInterval = 2000;
let refreshTimer = null;

function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('fr-FR');
}

async function fetchLogs() {
    try {
        const res = await fetch('/api/logs/');
        const data = await res.json();
        const container = document.getElementById('logsContent');
        if (data.logs && data.logs.length > 0) {
            container.innerHTML = '<ul>' +
                data.logs.map(line => `<li>${line}</li>`).join('') +
            '</ul>';
        } else {
            container.innerHTML = '<em>Aucune Données</em>';
        }
    } catch {
        document.getElementById('logsContent').innerHTML = '<em>Erreur de chargement</em>';
    }
}

async function refreshData() {
    try {
        const lastResponse = await fetch('/api/last/');
        if (!lastResponse.ok) throw new Error('Erreur API');
        const lastData = await lastResponse.json();

        updateCard('tempCard', lastData.temp.toFixed(1), '°C');
        updateCard('humCard', lastData.hum.toFixed(1), '%');
        updateCard('solCard', lastData.sol, '%');
        updateCard('lumiereCard', lastData.lumière, 'Lux');
        updateCard('servoCard', lastData.servo, '°');
        updateCard('periodeCard', lastData.periode, '');
        updateCard('pompeCard', lastData.pompe, '');
        updateCard('ledCard', lastData.led, '');
        if (lastData.pompe_lock == 0) {
            updateCard('lockCard', 'Not Locked');
        } else {
            updateCard('lockCard', 'Locked : ', lastData.pompe_lock, 's');
        }

        const toitBtn = document.getElementById('toitBtn');
        if (toitBtn) {
            const isOpen = lastData.servo >= TOIT_OPEN_ANGLE;
            toitBtn.textContent = isOpen ? 'Fermer' : 'Ouvrir';
            toitBtn.value = isOpen ? 'toit_0' : 'toit_1';
        }

        const ledIndicator = document.querySelector('.status-indicator');
        const ledCard = document.getElementById('ledCard');
        if (lastData.led && lastData.led === 'ON') {
            ledIndicator.style.backgroundColor = '#4CAF50';
            ledCard.classList.add('active');
            ledCard.classList.remove('inactive');
        } else {
            ledIndicator.style.backgroundColor = '#999';
            ledCard.classList.remove('active');
            ledCard.classList.add('inactive');
        }

        // FIX: exclude logsCard from animation reset
        document.querySelectorAll('.card:not(#logsCard)').forEach(card => {
            card.style.animation = 'none';
            setTimeout(() => {
                card.style.animation = 'pulse 0.5s ease-in-out';
            }, 10);
        });

        document.getElementById('errorMessage').style.display = 'none';
        updateLastUpdate();

    } catch (error) {
        console.error('Erreur lors du rafraîchissement:', error);
        document.getElementById('errorMessage').textContent = 'Erreur de connexion à l\'API: ' + error.message;
        document.getElementById('errorMessage').style.display = 'block';
    }
}

function updateCard(cardId, value, unit) {
    const card = document.getElementById(cardId);
    const valueElement = card.querySelector('.card-value');
    valueElement.textContent = value + (unit ? ' ' + unit : '');

    card.classList.remove('warning', 'danger');
    if (cardId === 'tempCard' && parseFloat(value) > 30) {
        card.classList.add('danger');
    } else if (cardId === 'humCard' && parseFloat(value) > 80) {
        card.classList.add('warning');
    }
}

function startAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (autoRefreshEnabled) refreshData();
    }, refreshInterval);
}

// Separate slower interval for logs
setInterval(fetchLogs, 5000);

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

async function sendToitCommand(action) {
    try {
        const csrftoken = getCookie('csrftoken');
        const resp = await fetch('/api/toit/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrftoken || ''
            },
            body: JSON.stringify({ action })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({ error: resp.statusText }));
            throw new Error(err.error || resp.statusText);
        }

        console.log('[Toit] command queued:', action);
        const toitBtn = document.getElementById('toitBtn');
        if (toitBtn) {
            if (action === 'open') {
                toitBtn.textContent = 'Fermer';
                toitBtn.value = 'toit_0';
            } else {
                toitBtn.textContent = 'Ouvrir';
                toitBtn.value = 'toit_1';
            }
        }
    } catch (e) {
        console.error('[Toit] failed to send command:', e);
        const em = document.getElementById('errorMessage');
        if (em) {
            em.textContent = 'Erreur en envoyant la commande toit: ' + e.message;
            em.style.display = 'block';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    refreshData();
    fetchLogs();
    startAutoRefresh();
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && autoRefreshEnabled) refreshData();
});