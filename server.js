const WebSocket = require('ws');
const http = require('http');

// ============================================================
// SERVEUR HTTP (pour servir index.html)
// ============================================================
const server = http.createServer((req, res) => {
    // Servir index.html
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
            <!DOCTYPE html>
            <html>
            <head><title>💬 Chat</title></head>
            <body style="font-family:monospace;background:#0a0a0a;color:#00ff00;padding:20px;">
                <h1>💬 Chat WebSocket</h1>
                <p>Connecté au serveur</p>
                <div id="messages"></div>
                <input type="text" id="input" placeholder="Message...">
                <button onclick="send()">Envoyer</button>
                <script>
                    const ws = new WebSocket('wss://' + location.host);
                    ws.onmessage = (e) => {
                        document.getElementById('messages').innerHTML += '<p>' + e.data + '</p>';
                    };
                    function send() {
                        const input = document.getElementById('input');
                        ws.send(input.value);
                        input.value = '';
                    }
                </script>
            </body>
            </html>
        `);
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// ============================================================
// SERVEUR WEBSOCKET
// ============================================================
const wss = new WebSocket.Server({ server });

// Liste des clients connectés
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('[+] Client connecté');
    clients.add(ws);

    // Envoyer un message de bienvenue
    ws.send('👋 Bienvenue sur le chat !');

    // Quand on reçoit un message
    ws.on('message', (data) => {
        const msg = data.toString();
        console.log('[~] Message reçu :', msg);

        // Diffuser à tous les autres clients
        clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    });

    // Quand un client se déconnecte
    ws.on('close', () => {
        console.log('[-] Client déconnecté');
        clients.delete(ws);
    });
});

// ============================================================
// DÉMARRAGE
// ============================================================
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 https://server-1-cnxd.onrender.com`);
});
