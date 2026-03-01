import { io } from 'socket.io-client';
import * as readline from 'readline';

const socket = io('http://localhost:3000');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

socket.on('connect', () => {
  console.log('connected to server');

  const sendMessage = () => {
    rl.question('Enter a message: ', (message) => {
      socket.emit('message', message);
      sendMessage();  
    });
  };

  sendMessage();

  socket.on('message', (data) => {
    console.log('message from server:', data);
  });
});

socket.on('disconnect', () => {
  console.log('disconnected from server');
  rl.close();
});