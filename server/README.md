# CCC Server

Backend server infrastructure for the Clinical Competency Calculator.

## Contents

```
server/
├── socketio/
│   └── python_server.py    # WebSocket server using Python Socket.IO
└── DataFormat.json         # Database schema and data structure specification
```

## Socket.IO Server

`socketio/python_server.py` provides real-time WebSocket communication between the frontend and backend services using the Python [Socket.IO](https://python-socketio.readthedocs.io/) library.

### Setup

```bash
cd server/socketio
python -m venv .venv
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install python-socketio aiohttp
python python_server.py
```

## DataFormat.json

Defines the expected shape of database records including `form_responses`, `form_results`, `student_reports`, and related tables. Use this as the reference when writing database queries or adding new fields.
