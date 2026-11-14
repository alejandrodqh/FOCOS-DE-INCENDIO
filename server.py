#!/usr/bin/env python3
"""
IGNIS-Harmonize: Servidor Local de Desarrollo
NASA Space Apps Challenge - Regímenes de Fuego & Gemini AI

Uso:
    py -3.9 server.py
    o simplemente:
    python server.py
"""

import os
import sys
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

def run():
    os.chdir(DIRECTORY)
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    url = f"http://localhost:{PORT}"
    
    print("=" * 65)
    print("🚀 IGNIS-Harmonize: Servidor Local Iniciado")
    print("   NASA Space Apps Challenge - Calendario de Fuego & Gemini AI")
    print("=" * 65)
    print(f"📡 Accede a la aplicación en: {url}")
    print("   Presiona Ctrl + C en cualquier momento para detener el servidor.\n")
    
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Servidor detenido.")
        sys.exit(0)

if __name__ == "__main__":
    run()
