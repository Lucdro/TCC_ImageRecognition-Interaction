const express = require('express');
const { join } = require('path');
const { readFileSync } = require('fs');
const { createServer } = require('https');
const { networkInterfaces} = require('os');
const { Server } = require("socket.io");

const port = process.env.PORT || 8443;

const _networkInterfaces = networkInterfaces();
const ip = _networkInterfaces['Wi-Fi'].find(ip => ip.family == 'IPv4')?.address || '0.0.0.0';

const cert = readFileSync(join(__dirname, 'certificate/selfsigned.crt'), 'utf8');
const key = readFileSync(join(__dirname, 'certificate/selfsigned.key'), 'utf8');

const credentials = {
  key: key,
  cert: cert
};

const app = express();  
app.use(express.static(__dirname + '/public'));

app.all('/', function (req, res) {
  res.redirect('interactionScreen');
});

const httpsServer = createServer(credentials, app);
const io = new Server(httpsServer);

httpsServer.listen(port,ip, () => {
    console.log('\nServidor HTTPS pronto para uso\n');
    console.log(`\naddress: https://${ip}:${port}\n`);
});

io.on('connection', (socket) => {
  socket.on('click', (position) => {
    console.log(`\n Socket:${socket.id}  Clicou em X:${position.x} Y:${position.y}`);
    socket.broadcast.emit('click',position);
  });
  socket.on('changeColor', (color) =>{
    console.log(`\n Trocar cor para: ${color.color}\n`);
    socket.broadcast.emit('changeColor', color);
  });
  console.log('\nUm novo site foi conectado!\n');
});


