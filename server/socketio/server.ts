import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

// Connect Node.js client to Python server
const pythonSocket = Client('http://localhost:5000');

pythonSocket.on('connect', () => {
  console.log('Connected to Python server');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('message', (data) => {
    console.log('Message from client:', data);

    // Only forward message if it's not a loopback
    if (data !== "forwarded") {
      pythonSocket.emit('message', data);
    }
  });

  pythonSocket.on('message', (data) => {
    console.log('Message from Python:', data);

    // Prevent infinite loop
    if (data !== "forwarded") {
      socket.emit('message', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

httpServer.listen(3000, () => {
  console.log('Node.js server listening on port 3000');
});
