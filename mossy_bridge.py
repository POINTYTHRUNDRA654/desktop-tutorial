import json
import os
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Optional

# Import from your existing assistant file
# (mossy_assistant.py must be in the same folder)
from mossy_assistant import tools_router

HOST = "127.0.0.1"
PORT = 8765

# Security: require a token for any command execution.
# Put this in your .env as: MOSSY_BRIDGE_TOKEN=some_long_string
BRIDGE_TOKEN_ENV = "MOSSY_BRIDGE_TOKEN"


def get_token() -> Optional[str]:
    return os.getenv(BRIDGE_TOKEN_ENV)


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        # CORS headers so your web app can call the bridge
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Mossy-Token")

    def _send_json(self, code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        # Preflight request for CORS
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != "/run":
            return self._send_json(404, {"ok": False, "error": "Not found"})

        token_required = get_token()
        token_given = self.headers.get("X-Mossy-Token", "")

        if token_required and token_given != token_required:
            return self._send_json(401, {"ok": False, "error": "Unauthorized"})

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            return self._send_json(400, {"ok": False, "error": "Bad JSON"})

        text = (data.get("text") or "").strip()
        if not text:
            return self._send_json(400, {"ok": False, "error": "Missing 'text' field"})

        # Bridge executes ONLY the local tool router
        result = tools_router(text)

        if result:
            return self._send_json(200, {"ok": True, "result": result})

        return self._send_json(
            200,
            {"ok": False, "result": "No local tool matched. (Bridge only runs launch commands.)"},
        )


def main():
    print(f"=== Mossy Bridge running ===")
    print(f"Local endpoint: http://{HOST}:{PORT}/run")
    print("This is LOCAL ONLY (127.0.0.1).")
    print("Requires header X-Mossy-Token if MOSSY_BRIDGE_TOKEN is set.")
    HTTPServer((HOST, PORT), Handler).serve_forever()


if __name__ == "__main__":
    # Load .env if present in this folder
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except Exception:
        pass

    main()
