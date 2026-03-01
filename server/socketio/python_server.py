"""
This module sets up a Python server using Socket.IO to communicate with a Node.js server.
It includes event handlers for connecting, receiving messages,
and disconnecting from the Node.js server.
It also sets up a WSGI application to handle incoming connections and messages from clients.
Classes:
    None
Functions:
    connect(): Handles the event when the Python client connects to the Node.js server.
    message(data): Handles incoming messages from the Node.js server.
    disconnect(): Handles the event when the Python client disconnects from the Node.js server.
    connect(sid, environ): Handles the event when a client connects to the Python server.
    message(sid, data): Handles incoming messages from clients connected to the Python server.
    send_message(): Continuously prompts the user to enter a message
    and sends it to the Node.js server.
Usage:
    Run this module to start the Python server and connect to the Node.js server.
"""

import threading
import socketio
import eventlet

SIO = socketio.Client()
SERVER_SIO = socketio.Server()
APP = socketio.WSGIApp(SERVER_SIO)

CONNECTED = threading.Event()

@SIO.event
def connect():
  """Handles the event when the Python client connects to the Node.js server."""
  print('Connection established with Node.js server')
  CONNECTED.set()

@SIO.event
def message(data):
  """Handles incoming messages from the Node.js server."""
  print('\nMessage from Node.js server:', data)
  print('Enter a message: ', end='', flush=True)

@SIO.event
def disconnect():
  """Handles the event when the Python client disconnects from the Node.js server."""
  print('Disconnected from Node.js server')
  CONNECTED.clear()

def sendMessage():
  """Continuously prompts the user to enter a message and sends it to the Node.js server."""
  while True:
    msg = input('Enter a message: ')
    CONNECTED.wait()
    SIO.emit('message', msg)

if __name__ == '__main__':
  threading.Thread(target=sendMessage, daemon=True).start()

  SIO.connect('http://localhost:3000')

  eventlet.wsgi.server(eventlet.listen(('', 5000)), APP)
