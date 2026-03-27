import websocket
import json
import uuid
import time

SERVER_URL = "wss://server-1-cnxd.onrender.com"
AGENT_ID = str(uuid.uuid4())


def on_open(ws):
    print("[+] Connected to server")

    # register agent
    payload = {
        "type": "register",
        "id": AGENT_ID
    }

    ws.send(json.dumps(payload))
    print(f"[+] Agent registered: {AGENT_ID}")


def on_message(ws, message):
    print("[MSG]", message)


def on_error(ws, error):
    print("[ERROR]", error)


def on_close(ws, close_status_code, close_msg):
    print("[-] Disconnected")

    # simple reconnect loop
    time.sleep(3)
    start()


def start():
    ws = websocket.WebSocketApp(
        SERVER_URL,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close
    )

    ws.run_forever()


if __name__ == "__main__":
    start()