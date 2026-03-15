"""
Example Desktop Tutorial Server
A simple server that demonstrates integration with the Blender add-on
"""

import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from datetime import datetime


class TutorialStep:
    """Represents a single tutorial step"""
    def __init__(self, step_id, title, description, completed=False):
        self.step_id = step_id
        self.title = title
        self.description = description
        self.completed = completed

    def to_dict(self):
        return {
            'step_id': self.step_id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed
        }


class TutorialManager:
    """Manages tutorial steps and progress"""
    def __init__(self):
        self.current_step = 0
        self.steps = [
            TutorialStep(1, "Introduction", "Welcome to the Blender tutorial!"),
            TutorialStep(2, "Basic Navigation", "Learn to navigate the 3D viewport"),
            TutorialStep(3, "Creating Objects", "Add and manipulate basic objects"),
            TutorialStep(4, "Materials", "Apply materials to your objects"),
            TutorialStep(5, "Lighting", "Set up scene lighting"),
            TutorialStep(6, "Rendering", "Render your first image"),
        ]

    def get_current_step(self):
        if 0 <= self.current_step < len(self.steps):
            return self.steps[self.current_step]
        return None

    def next_step(self):
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            return self.get_current_step()
        return None

    def previous_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            return self.get_current_step()
        return None

    def mark_complete(self, step_id):
        for step in self.steps:
            if step.step_id == step_id:
                step.completed = True
                return True
        return False

    def get_progress(self):
        completed = sum(1 for step in self.steps if step.completed)
        total = len(self.steps)
        return {
            'completed': completed,
            'total': total,
            'percentage': (completed / total * 100) if total > 0 else 0
        }


class TutorialRequestHandler(BaseHTTPRequestHandler):
    """Handles HTTP requests from Blender add-on"""
    
    tutorial_manager = TutorialManager()

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/status':
            self.send_status()
        elif self.path == '/current_step':
            self.send_current_step()
        elif self.path == '/next_step':
            self.handle_next_step()
        elif self.path == '/previous_step':
            self.handle_previous_step()
        elif self.path == '/progress':
            self.send_progress()
        else:
            self.send_error(404, "Endpoint not found")

    def do_POST(self):
        """Handle POST requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
            
            if self.path == '/event':
                self.handle_event(data)
            elif self.path == '/mark_complete':
                self.handle_mark_complete(data)
            else:
                self.send_error(404, "Endpoint not found")
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")

    def send_status(self):
        """Send server status"""
        response = {
            'status': 'online',
            'timestamp': datetime.now().isoformat(),
            'version': '1.0.0'
        }
        self.send_json_response(response)

    def send_current_step(self):
        """Send current tutorial step"""
        step = self.tutorial_manager.get_current_step()
        if step:
            self.send_json_response(step.to_dict())
        else:
            self.send_error(404, "No current step")

    def handle_next_step(self):
        """Move to next tutorial step"""
        step = self.tutorial_manager.next_step()
        if step:
            self.send_json_response({
                'success': True,
                'step': step.to_dict()
            })
        else:
            self.send_json_response({
                'success': False,
                'message': 'No more steps'
            })

    def handle_previous_step(self):
        """Move to previous tutorial step"""
        step = self.tutorial_manager.previous_step()
        if step:
            self.send_json_response({
                'success': True,
                'step': step.to_dict()
            })
        else:
            self.send_json_response({
                'success': False,
                'message': 'Already at first step'
            })

    def send_progress(self):
        """Send tutorial progress"""
        progress = self.tutorial_manager.get_progress()
        self.send_json_response(progress)

    def handle_event(self, data):
        """Handle event from Blender"""
        event_type = data.get('type', 'unknown')
        event_data = data.get('data', '')
        timestamp = data.get('timestamp', 0)
        
        print(f"[EVENT] Type: {event_type}, Data: {event_data}, Time: {timestamp}")
        
        self.send_json_response({
            'success': True,
            'message': 'Event received'
        })

    def handle_mark_complete(self, data):
        """Mark a step as complete"""
        step_id = data.get('step_id', 0)
        success = self.tutorial_manager.mark_complete(step_id)
        
        if success:
            print(f"[COMPLETE] Step {step_id} marked as complete")
            self.send_json_response({
                'success': True,
                'message': f'Step {step_id} marked complete'
            })
        else:
            self.send_error(404, f"Step {step_id} not found")

    def send_json_response(self, data, status=200):
        """Send JSON response"""
        self.send_response(status)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {format % args}")


def run_server(host='localhost', port=8080):
    """Run the tutorial server"""
    server_address = (host, port)
    httpd = HTTPServer(server_address, TutorialRequestHandler)
    
    print(f"=" * 60)
    print(f"Desktop Tutorial Server")
    print(f"=" * 60)
    print(f"Server running on http://{host}:{port}")
    print(f"Waiting for connections from Blender add-on...")
    print(f"\nAvailable endpoints:")
    print(f"  GET  /status           - Server status")
    print(f"  GET  /current_step     - Get current tutorial step")
    print(f"  GET  /next_step        - Move to next step")
    print(f"  GET  /previous_step    - Move to previous step")
    print(f"  GET  /progress         - Get tutorial progress")
    print(f"  POST /event            - Receive event from Blender")
    print(f"  POST /mark_complete    - Mark step as complete")
    print(f"\nPress Ctrl+C to stop the server")
    print(f"=" * 60)
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nShutting down server...")
        httpd.shutdown()
        print("Server stopped.")


if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Desktop Tutorial Server')
    parser.add_argument('--host', default='localhost', help='Server host (default: localhost)')
    parser.add_argument('--port', type=int, default=8080, help='Server port (default: 8080)')
    
    args = parser.parse_args()
    run_server(args.host, args.port)
