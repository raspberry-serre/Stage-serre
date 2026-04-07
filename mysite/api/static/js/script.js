const TOIT_CLOSED_ANGLE = 110; // Angle lorsque le toit est complètement fermé
const TOIT_OPEN_ANGLE = 180;   // Angle lorsque le toit est complètement ouvert

let autoRefreshEnabled = true;  // Indique si le rafraîchissement automatique est actif
let refreshInterval = 1000;     // Intervalle de rafraîchissement en millisecondes
let refreshTimer = null;        // Référence au setInterval en cours
var modeCheckbox = null;        // Référence à la case à cocher mode manuel/auto


function updateLastUpdate() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent = now.toLocaleTimeString('fr-FR'); // Affiche l'heure actuelle en format français
}

async function refreshData() {
    try {
        const lastResponse = await fetch('/api/last/'); // Récupère les dernières données capteurs depuis le serveur
        if (lastResponse.status === 401 || (lastResponse.redirected && lastResponse.url.includes('/login'))) {
            window.location.href = '/'; // Redirige vers la page de connexion si la session a expiré
            return;
        }
        if (!lastResponse.ok) throw new Error('Erreur API');
        const lastData = await lastResponse.json();

        updateCard('tempCard', lastData.temp.toFixed(1), '°C');        // Met à jour la carte température
        if (window.setTemp) window.setTemp(lastData.temp);              // Envoie les données au webGl
        updateCard('humCard', lastData.hum.toFixed(1), '%');            // Met à jour la carte humidité de l'air
        if (window.setHumAir) window.setHumAir(lastData.hum);
        updateCard('solCard', lastData.sol);                            // Met à jour la carte humidité du sol
        if (window.setHumSol) window.setHumSol(lastData.sol);
        updateCard('lumiereCard', lastData.lumière, 'Lux');             // Met à jour la carte luminosité
        if (window.setLumiere) window.setLumiere(lastData.lumière);
        updateCard('servoCard', lastData.servo, '°');                   // Met à jour la carte angle du servo/toit
        if (window.setToitAngle) window.setToitAngle(lastData.servo);
        updateCard('periodeCard', lastData.periode, '');                // Met à jour la carte période d'arrosage
        updateCard('pompeCard', lastData.pompe, '');                    // Met à jour la carte état de la pompe
        if (window.setPompeState) window.setPompeState(lastData.pompe);
        updateCard('ledCard', lastData.led, '');                        // Met à jour la carte état de la LED
        if (window.setLedIntensity) window.setLedIntensity(lastData.led);
        if (lastData.pompe_lock == 0 || lastData.pompe_lock == 600) {
            updateCard('lockCard', 'Not Locked');                       // La pompe est libre de fonctionner
        } else {
            updateCard('lockCard', 'Locked : ' + lastData.pompe_lock + 's'); // La pompe est temporairement verrouillée
        }
        if (window.setPompeLock) window.setPompeLock(lastData.pompe_lock);
        updateCard('eauCard', lastData.eau, 'ml');                      // Met à jour la carte stock d'eau
        if (window.setEauStock) window.setEauStock(lastData.eau);

        // Met à jour le libellé et l'action du bouton toit selon l'angle actuel du servo
        const toitBtn = document.getElementById('toitBtn');
        if (toitBtn) {
            const isOpen = lastData.servo >= TOIT_OPEN_ANGLE;
            toitBtn.textContent = isOpen ? 'Fermer' : 'Ouvrir';  // Affiche l'action opposée
            toitBtn.value = isOpen ? 'toit_0' : 'toit_1';
        }

        // Met à jour le libellé du bouton LED selon l'état actuel
        const ledBtn = document.getElementById('ledBtn');
        if (ledBtn) {
            const isOn = lastData.led === 'ON';
            ledBtn.textContent = isOn ? 'Éteindre' : 'Allumer';
            ledBtn.dataset.action = isOn ? 'off' : 'on';
        }

        // En mode manuel, masque le bouton pompe si le stock d'eau est insuffisant
        const pompeBtn = document.getElementById('pompeBtn');
        if (pompeBtn && modeCheckbox && modeCheckbox.checked) { 
            if (lastData.debit * lastData.pump_on_time > lastData.eau) {
                pompeBtn.style.display = 'none';    // Pas assez d'eau, on cache le bouton
                sendEauCommande('lowEau');           // Notifie le serveur du niveau d'eau bas
            } else {
                pompeBtn.style.display = 'block';
            }
        }

        var errorMsg = document.getElementById('errorMessage');
        if (errorMsg) errorMsg.style.display = 'none'; // Cache toute erreur précédente en cas de succès
        updateLastUpdate();

    } catch (error) {
        console.error('Erreur lors du rafraîchissement:', error);
        var errorMsg = document.getElementById('errorMessage');
        if (errorMsg) {
            errorMsg.textContent = "Erreur de connexion à l'API: " + error.message; // Affiche l'erreur à l'utilisateur
            errorMsg.style.display = 'block';
        }
    }
}

function updateCard(cardId, value, unit) {
    const card = document.getElementById(cardId);
    if (!card) return;
    const valueElement = card.querySelector('.card-value');
    valueElement.textContent = value + (unit ? ' ' + unit : ''); // Ajoute l'unité si fournie

    // Applique les classes CSS d'avertissement/danger selon les seuils
    card.classList.remove('warning', 'danger');
    if (cardId === 'tempCard' && parseFloat(value) > 35) {
        card.classList.add('danger');  // Température au-dessus de 35°C : danger
    } else if (cardId === 'humCard' && parseFloat(value) > 80) {
        card.classList.add('warning'); // Humidité au-dessus de 80% : avertissement
    }
}

function startAutoRefresh() {
    clearInterval(refreshTimer);                     // Efface tout timer existant avant d'en démarrer un nouveau
    refreshTimer = setInterval(function() {
        if (autoRefreshEnabled) refreshData();       // Ne rafraîchit que si le mode auto est actif
    }, refreshInterval);
}

// Lit la valeur d'un cookie par son nom
function getCookie(name) {
    var nameEQ = name + '=';
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// Envoie une commande d'ouverture/fermeture du toit au serveur
async function sendToitCommand(action) {
    try {
        var csrftoken = getCookie('csrftoken'); // Obligatoire pour la protection CSRF de Django
        var resp = await fetch('/api/toit/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken || '' },
            body: JSON.stringify({ action: action })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return { error: resp.statusText }; });
            throw new Error(err.error || resp.statusText);
        }
    } catch (e) {
        var em = document.getElementById('errorMessage');
        if (em) { em.textContent = 'Erreur commande toit: ' + e.message; em.style.display = 'block'; }
    }
}

// Envoie une commande d'allumage/extinction de la LED au serveur
async function sendLedCommand(action) {
    try {
        var csrftoken = getCookie('csrftoken');
        var resp = await fetch('/api/led/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken || '' },
            body: JSON.stringify({ action: action })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return { error: resp.statusText }; });
            throw new Error(err.error || resp.statusText);
        }
    } catch (e) {
        var em = document.getElementById('errorMessage');
        if (em) { em.textContent = 'Erreur commande LED: ' + e.message; em.style.display = 'block'; }
    }
}

// Envoie une commande de démarrage/arrêt de la pompe au serveur
async function sendPompeCommand(action) {
    try {
        var csrftoken = getCookie('csrftoken');
        var resp = await fetch('/api/pompe/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken || '' },
            body: JSON.stringify({ action: action })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return { error: resp.statusText }; });
            throw new Error(err.error || resp.statusText);
        }
    } catch (e) {
        var em = document.getElementById('errorMessage');
        if (em) { em.textContent = 'Erreur commande pompe: ' + e.message; em.style.display = 'block'; }
    }
}

// Notifie le serveur que le réservoir d'eau a été rempli
async function sendRefillCommand() {
    try {
        var csrftoken = getCookie('csrftoken');
        var resp = await fetch('/api/refill/',  // ← new endpoint
            {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken || '' },
            body: JSON.stringify({})
        });
        if (!resp.ok) throw new Error(resp.statusText);
    } catch (e) {
        var em = document.getElementById('errorMessage');
        if (em) { em.textContent = 'Erreur refill: ' + e.message; em.style.display = 'block'; }
    }
}

// Bascule entre le mode de contrôle automatique et manuel
async function sendModeCommand(mode) {
    try {
        var csrftoken = getCookie('csrftoken');
        var resp = await fetch('/api/mode/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken || '' },
            body: JSON.stringify({ mode: mode })
        });
        if (!resp.ok) {
            var err = await resp.json().catch(function() { return { error: resp.statusText }; });
            throw new Error(err.error || resp.statusText);
        }
        console.log('[Mode] command queued:', mode);
    } catch (e) {
        var em = document.getElementById('errorMessage');
        if (em) { em.textContent = 'Erreur commande mode: ' + e.message; em.style.display = 'block'; }
    }
}

// Envoie un événement de niveau d'eau au serveur 
async function sendEauCommande(eau) {
    try {
        var csrftoken = getCookie('csrftoken');
        var resp = await fetch('/api/eau/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrftoken || '' },
            body: JSON.stringify({ eau: eau })
        });
        if (!resp.ok) throw new Error(resp.statusText);
    } catch (e) {
        var em = document.getElementById('errorMessage');
        if (em) { em.textContent = 'Erreur eau: ' + e.message; em.style.display = 'block'; }
    }
}

// Récupère et affiche le journal d'activité, filtré par utilisateur si besoin
function refreshLogs() {
    var filter = document.getElementById('userFilter');
    var user = filter ? filter.value : '';
    fetch('/api/logs/?user_filter=' + encodeURIComponent(user))
        .then(function(r) { return r.json(); })
        .then(function(data) {
            var logsContent = document.getElementById('logsContent');
            if (!logsContent) return;
            if (data.logs && data.logs.length) {
                logsContent.innerHTML = '<ul>' +
                    data.logs.map(function(l) { return '<li>' + l + '</li>'; }).join('') +
                    '</ul>';
            } else {
                logsContent.innerHTML = '<em>Aucune donnée</em>'; // Aucune entrée de journal disponible
            }
        })
        .catch(function() {});
}

// Initialise le bouton bascule mode manuel/auto
function initToggle() {
    var switchEl = document.getElementById('modeSwitch');
    var checkbox = document.getElementById('modeCheckbox');
    if (!switchEl || !checkbox) return;

    function applyState() {
        var label = document.getElementById('modeLabel');
        var toitBtn = document.getElementById('toitBtn');
        var ledBtn = document.getElementById('ledBtn');
        var pompeBtn = document.getElementById('pompeBtn');
        if (checkbox.checked) {
            switchEl.classList.add('is-checked');
            if (label) label.textContent = '1';              // Mode manuel actif
            if (toitBtn) toitBtn.style.display = 'block';    // Affiche les contrôles manuels
            if (ledBtn) ledBtn.style.display = 'block';
            if (pompeBtn) pompeBtn.style.display = 'block';
        } else {
            switchEl.classList.remove('is-checked');
            if (label) label.textContent = '0';              // Mode automatique actif
            if (toitBtn) toitBtn.style.display = 'none';     // Cache les contrôles manuels
            if (ledBtn) ledBtn.style.display = 'none';
            if (pompeBtn) pompeBtn.style.display = 'none';
        }
    }

    switchEl.addEventListener('click', function(e) {
        checkbox.checked = !checkbox.checked;                // Inverse l'état de la case à cocher
        applyState();
        sendModeCommand(checkbox.checked ? 'manuel' : 'auto'); // Notifie le serveur du changement de mode
        e.preventDefault();
    });

    applyState(); // Applique l'état initial au chargement de la page
}

document.addEventListener('DOMContentLoaded', function() {
    modeCheckbox = document.getElementById('modeCheckbox');
    
    if (window.location.pathname === '/logs/') {
        refreshLogs();                          // Chargement initial des logs sur la page dédiée
        setInterval(refreshLogs, 2000);         // Rafraîchissement automatique des logs toutes les 2 secondes
    } else {
        refreshData();                          // Chargement initial des données sur le tableau de bord
        startAutoRefresh();                     // Démarre le rafraîchissement périodique du tableau de bord
        initToggle();                           // Initialise le bouton bascule de mode
    }

    // Bouton toit : ouvre ou ferme selon la valeur actuelle du bouton
    var toitBtn = document.getElementById('toitBtn');
    if (toitBtn) {
        toitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var val = toitBtn.value || '';
            if (val === 'toit_1') sendToitCommand('open');
            else if (val === 'toit_0') sendToitCommand('close');
            else {
                // Repli : déduit l'action depuis le texte du bouton
                var text = (toitBtn.textContent || '').trim().toLowerCase();
                sendToitCommand(text.indexOf('ouvrir') >= 0 ? 'open' : 'close');
            }
        });
    }

    // Bouton LED : bascule on/off selon l'action stockée ou le texte du bouton
    var ledBtn = document.getElementById('ledBtn');
    if (ledBtn) {
        ledBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var action = ledBtn.dataset.action || '';
            if (action === 'on' || action === 'off') sendLedCommand(action);
            else {
                // Repli : déduit l'action depuis le texte du bouton
                var text = (ledBtn.textContent || '').trim().toLowerCase();
                sendLedCommand(text.indexOf('allumer') >= 0 ? 'on' : 'off');
            }
        });
    }

    // Bouton pompe : déclenche l'arrosage selon l'action stockée ou le texte du bouton
    var pompeBtn = document.getElementById('pompeBtn');
    if (pompeBtn) {
        pompeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            var action = pompeBtn.dataset.action || '';
            if (action === 'on' || action === 'off') sendPompeCommand(action);
            else {
                // Repli : déduit l'action depuis le texte du bouton
                var text = (pompeBtn.textContent || '').trim().toLowerCase();
                sendPompeCommand(text.indexOf('allumer') >= 0 ? 'on' : 'off');
            }
        });
    }

    // Bouton remplissage : signale que le réservoir a été rempli
    var refillBtn = document.getElementById('refillBtn');
        if (refillBtn) {
            refillBtn.addEventListener('click', function(e) {
                e.preventDefault();
                sendRefillCommand();
            });
        }       

    // Bouton déconnexion : redirige vers l'endpoint de déconnexion
    var deconnexionBtn = document.getElementById('deconnexionBtn');
    if (deconnexionBtn) {
        deconnexionBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/logout/';
        });
    }

    // Bouton logs : navigue vers la page des journaux
    var logsBtn = document.getElementById('logsBtn');
    if (logsBtn) {
        logsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/logs/';
        });
    }

    // Bouton accueil : retourne au tableau de bord principal
    var HomeBtn = document.getElementById('HomeBtn');
    if (HomeBtn) {
        HomeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/index/';
        });
    }

    // Déconnexion automatique : planifie une redirection à l'expiration de la session
    if (typeof LOGIN_TIME !== 'undefined') {
        const elapsed = (Date.now() / 1000) - LOGIN_TIME;       // Secondes écoulées depuis la connexion
        const remaining = (SESSION_TIMEOUT - elapsed) * 1000;   // Millisecondes restantes avant expiration
        if (remaining > 0) {
            setTimeout(function() {
                window.location.href = '/';  // Redirige à l'expiration de la session
            }, remaining);
        } else {
            window.location.href = '/';      // Session déjà expirée, redirige immédiatement
        }
    }
});

// Reprend le rafraîchissement des données quand l'utilisateur revient sur l'onglet
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && autoRefreshEnabled && window.location.pathname !== '/logs/') refreshData();
});