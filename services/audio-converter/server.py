"""
Audio Converter Microservice
Receives WebM audio, converts to OGG/Opus via ffmpeg, uploads to Meta WhatsApp API.

Usage:
    python3 server.py

Endpoints:
    POST /convert-and-upload
        FormData: file (WebM), phone_number_id, access_token
        Returns: { "id": "<media_id>" }

    GET /health
        Returns: { "status": "ok" }
"""
import os
import sys
import json
import uuid
import subprocess
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import Request, urlopen
from urllib.parse import parse_qs
import cgi

PORT = int(os.environ.get('AUDIO_CONVERTER_PORT', '8787'))
CORS_ORIGIN = '*'


class AudioHandler(BaseHTTPRequestHandler):
    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', CORS_ORIGIN)
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "ffmpeg": True}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path != '/convert-and-upload':
            self.send_response(404)
            self.end_headers()
            return

        try:
            # Parse multipart form data
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self._error(400, 'Content-Type must be multipart/form-data')
                return

            form = cgi.FieldStorage(
                fp=self.rfile,
                headers=self.headers,
                environ={'REQUEST_METHOD': 'POST', 'CONTENT_TYPE': content_type},
            )

            file_item = form['file']
            phone_number_id = form.getvalue('phone_number_id')
            access_token = form.getvalue('access_token')

            if not file_item.file or not phone_number_id or not access_token:
                self._error(400, 'Missing file, phone_number_id, or access_token')
                return

            # Save input file
            input_data = file_item.file.read()
            input_path = os.path.join(tempfile.gettempdir(), f'input_{uuid.uuid4().hex}')
            output_path = os.path.join(tempfile.gettempdir(), f'output_{uuid.uuid4().hex}.ogg')

            with open(input_path, 'wb') as f:
                f.write(input_data)

            print(f'[converter] Input: {len(input_data)} bytes, converting to OGG/Opus...')

            # Convert with ffmpeg
            result = subprocess.run(
                ['ffmpeg', '-y', '-i', input_path, '-c:a', 'libopus', '-b:a', '48k', '-ac', '1', '-f', 'ogg', output_path],
                capture_output=True, timeout=30,
            )

            if result.returncode != 0:
                print(f'[converter] ffmpeg error: {result.stderr.decode()[-200:]}')
                self._error(500, f'ffmpeg conversion failed')
                return

            with open(output_path, 'rb') as f:
                ogg_data = f.read()

            print(f'[converter] Converted: {len(ogg_data)} bytes OGG/Opus')

            # Cleanup
            os.unlink(input_path)
            os.unlink(output_path)

            # Upload to Meta
            import io
            boundary = uuid.uuid4().hex
            body = io.BytesIO()

            def add_field(name, value):
                body.write(f'--{boundary}\r\n'.encode())
                body.write(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
                body.write(f'{value}\r\n'.encode())

            def add_file(name, filename, content, content_type='audio/ogg'):
                body.write(f'--{boundary}\r\n'.encode())
                body.write(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode())
                body.write(f'Content-Type: {content_type}\r\n\r\n'.encode())
                body.write(content)
                body.write(b'\r\n')

            add_field('messaging_product', 'whatsapp')
            add_field('type', 'audio/ogg')
            add_file('file', 'audio.ogg', ogg_data)
            body.write(f'--{boundary}--\r\n'.encode())

            req = Request(
                f'https://graph.facebook.com/v19.0/{phone_number_id}/media',
                data=body.getvalue(),
                headers={
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': f'multipart/form-data; boundary={boundary}',
                },
                method='POST',
            )

            with urlopen(req, timeout=30) as resp:
                meta_result = json.loads(resp.read().decode())

            print(f'[converter] Uploaded to Meta: {meta_result}')

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(meta_result).encode())

        except Exception as e:
            print(f'[converter] Error: {e}')
            self._error(500, str(e))

    def _error(self, code, message):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}).encode())

    def log_message(self, format, *args):
        print(f'[converter] {args[0]}')


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', PORT), AudioHandler)
    print(f'[converter] Audio converter running on port {PORT}')
    server.serve_forever()
