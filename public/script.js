// ============================================================
// CONFIGURATION
// ============================================================
// En local : ws://localhost:8080
// En production : wss://server-1-cnxd.onrender.com
const WS_URL = 'wss://server-1-cnxd.onrender.com';

// ============================================================
// ÉLÉMENTS DOM
// ============================================================
const messagesDiv = document.getElementById('messages');
const input = document.getElementById('input');
const sendBtn = document.getElementById('send-btn');
const statusDiv = document.getElementById('status');

let ws = null;
let connected = false;

// ============================================================
// FONCTIONS
// ============================================================
function addMessage(text, type = 'other') {
    const div = document.createElement('div');
    div.className = `msg ${type}`;
    div.textContent = text;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateStatus(state, text) {
    statusDiv.textContent = text;
    statusDiv.className = state;
}

function setConnected(state) {
    connected = state;
    input.disabled = !state;
    sendBtn.disabled = !state;
    
    if (state) {
        updateStatus('connected', '✅ Connecté');
        input.focus();
    } else {
        updateStatus('disconnected', '⛔ Déconnecté');
    }
}

function connect() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
        return;
    }

    updateStatus('connecting', '⏳ Connexion...');
    addMessage('🔗 Connexion en cours...', 'system');

    try {
        ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            addMessage('✅ Connecté au serveur !', 'system');
            setConnected(true);
        };

        ws.onmessage = (event) => {
            addMessage(event.data, 'other');
        };

        ws.onerror = () => {
            addMessage('❌ Erreur de connexion', 'system');
            updateStatus('disconnected', '❌ Erreur');
        };

        ws.onclose = () => {
            addMessage('⛔ Déconnecté du serveur', 'system');
            setConnected(false);
            ws = null;
        };

    } catch (e) {
        addMessage(`❌ Erreur : ${e.message}`, 'system');
        setConnected(false);
    }
}

function sendMessage() {
    if (!connected || !ws || ws.readyState !== WebSocket.OPEN) {
        addMessage('❌ Pas connecté', 'system');
        return;
    }

    const text = input.value.trim();
    if (!text) return;

    addMessage(`Moi : ${text}`, 'self');
    ws.send(text);
    input.value = '';
    input.focus();
}

// ============================================================
// ÉVÉNEMENTS
// ============================================================
sendBtn.addEventListener('click', sendMessage);

input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
});

// Cliquer sur le statut pour reconnecter
statusDiv.addEventListener('click', () => {
    if (!connected) connect();
});

// ============================================================
// DÉMARRAGE
// ============================================================
addMessage('💬 Chat simple', 'system');
addMessage(`🔗 Serveur : ${WS_URL}`, 'system');
addMessage('📋 Tape un message et envoie-le !', 'system');

// Connexion automatique
setTimeout(connect, 500);
