const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ============================================================
// SERVEUR HTTP
// ============================================================
const server = http.createServer((req, res) => {
    // Servir index.html
    if (req.url === '/' || req.url === '/index.html') {
        const filePath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Erreur serveur');
                return;
            }
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
        });
        return;
    }

    // API stats
    if (req.url === '/stats') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            clients: wss.clients.size,
            uptime: process.uptime(),
            timestamp: new Date().toISOString()
        }));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// ============================================================
// SERVEUR WEBSOCKET
// ============================================================
const wss = new WebSocket.Server({ server });

// Stockage des clients
const clients = new Map();

wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    const clientId = `User${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
    
    console.log(`[+] ${clientId} (${clientIP}) connecté`);
    clients.set(ws, { id: clientId, ip: clientIP });

    // ============================================================
    // MESSAGE DE BIENVENUE
    // ============================================================
    const welcomeMsg = JSON.stringify({
        type: 'system',
        message: `👋 Bienvenue ${clientId} ! Tape /help pour la liste des commandes.`,
        users: Array.from(clients.values()).map(c => c.id)
    });
    ws.send(welcomeMsg);

    // Notifier les autres
    broadcast({
        type: 'system',
        message: `🌟 ${clientId} a rejoint le chat !`,
        users: Array.from(clients.values()).map(c => c.id)
    }, ws);

    // ============================================================
    // RÉCEPTION DES MESSAGES
    // ============================================================
    ws.on('message', (data) => {
        const raw = data.toString().trim();
        if (!raw) return;

        const user = clients.get(ws);
        if (!user) return;

        console.log(`[${user.id}] ${raw}`);

        // --- DÉTECTION DU TYPE DE MESSAGE ---
        let isJson = false;
        let parsed = null;

        try {
            parsed = JSON.parse(raw);
            isJson = true;
        } catch (e) {
            isJson = false;
        }

        // --- COMMANDES (pour les clients texte brut) ---
        if (!isJson && raw.startsWith('/')) {
            const parts = raw.split(' ');
            const cmd = parts[0].toLowerCase();

            switch (cmd) {
                case '/help':
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: `📋 Commandes : /help /nick <nom> /users /whoami /ping /exit`
                    }));
                    return;

                case '/nick':
                    if (parts.length < 2) {
                        ws.send(JSON.stringify({
                            type: 'system',
                            message: '❌ Utilisation : /nick <nouveau_pseudo>'
                        }));
                        return;
                    }
                    const newName = parts.slice(1).join(' ');
                    const oldName = user.id;
                    user.id = newName;
                    broadcast({
                        type: 'system',
                        message: `✏️ ${oldName} s'appelle maintenant ${newName}`,
                        users: Array.from(clients.values()).map(c => c.id)
                    }, ws);
                    return;

                case '/users':
                    const userList = Array.from(clients.values()).map(c => `  - ${c.id}`).join('\n');
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: `👥 Connectés (${clients.size}) :\n${userList}`
                    }));
                    return;

                case '/whoami':
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: `👤 Tu es : ${user.id}`
                    }));
                    return;

                case '/ping':
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: '🏓 Pong !'
                    }));
                    return;

                case '/exit':
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: '👋 Déconnexion...'
                    }));
                    ws.close();
                    return;

                default:
                    ws.send(JSON.stringify({
                        type: 'system',
                        message: `❌ Commande inconnue : ${cmd}. Tape /help.`
                    }));
                    return;
            }
        }

        // --- TRAITEMENT DES MESSAGES JSON (client web / Python) ---
        if (isJson && parsed) {
            // Message standard (client web)
            if (parsed.type === 'message') {
                broadcast({
                    type: 'message',
                    from: user.id,
                    content: parsed.content || parsed.message || raw,
                    timestamp: new Date().toLocaleTimeString()
                }, ws);
                return;
            }
            // Changement de pseudo (client web)
            if (parsed.type === 'setname' && parsed.name) {
                const oldName = user.id;
                user.id = parsed.name;
                broadcast({
                    type: 'system',
                    message: `✏️ ${oldName} s'appelle maintenant ${parsed.name}`,
                    users: Array.from(clients.values()).map(c => c.id)
                }, ws);
                return;
            }
        }

        // --- MESSAGE TEXTE BRUT (client Python / netcat) ---
        // On broadcast le message tel quel
        broadcast({
            type: 'message',
            from: user.id,
            content: raw,
            timestamp: new Date().toLocaleTimeString()
        }, ws);
    });

    // ============================================================
    // DÉCONNEXION
    // ============================================================
    ws.on('close', () => {
        const user = clients.get(ws);
        if (user) {
            console.log(`[-] ${user.id} déconnecté`);
            clients.delete(ws);
            broadcast({
                type: 'system',
                message: `👋 ${user.id} a quitté le chat`,
                users: Array.from(clients.values()).map(c => c.id)
            });
        }
    });

    ws.on('error', (err) => {
        console.error(`[!] Erreur: ${err.message}`);
    });
});

// ============================================================
// FONCTION BROADCAST
// ============================================================
function broadcast(data, exclude) {
    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client !== exclude && client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

// ============================================================
// PING/PONG (pour Render)
// ============================================================
setInterval(() => {
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.ping();
        }
    });
}, 25000);

wss.on('pong', () => {});

// ============================================================
// DÉMARRAGE
// ============================================================
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  ✅ Serveur CHAT démarré                       ║
╠══════════════════════════════════════════════════╣
║  Port     : ${PORT}                               ║
║  Web      : https://server-1-cnxd.onrender.com  ║
║  WebSocket: wss://server-1-cnxd.onrender.com    ║
╚══════════════════════════════════════════════════╝
    `);
});
