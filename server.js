const express = require('express');
const { join } = require('path');
const { readFileSync } = require('fs');
const { createServer } = require('https');
const { networkInterfaces} = require('os');
const { Server } = require("socket.io");

const port = process.env.PORT || 8443;

const _networkInterfaces = networkInterfaces();
const ip = (_networkInterfaces['Wi-Fi'] || _networkInterfaces['wlp3s0'] || _networkInterfaces['Ethernet'] || _networkInterfaces['Ethernet 2']).find(ip => ip.family == 'IPv4')?.address || 'localhost';

const cert = readFileSync(join(__dirname, 'certificate/selfsigned.crt'), 'utf8');
const key = readFileSync(join(__dirname, 'certificate/selfsigned.key'), 'utf8');

const credentials = {
  key: key,
  cert: cert
};

const app = express();  
app.use(express.static(__dirname + '/public'));

app.all('/', function (req, res) {
  res.redirect('screen');
});

const httpsServer = createServer(credentials, app);
const io = new Server(httpsServer);

const drawconsoleline = ()=>{console.log('\n----------------------------------\n')};

httpsServer.listen(port,ip, () => {
    drawconsoleline();
    console.log('\nServidor HTTPS pronto para uso\n');
    console.log(`\naddress: https://${ip}:${port}\n`);
});
var lastcolor = undefined;
io.on('connection', (socket) => {
  socket.on('click', (position) => {
    drawconsoleline();
    console.log(`\nSocket:${socket.id}  Clicou em X:${position.x} Y:${position.y}`);
    socket.broadcast.emit('click',position);
  });
  socket.on('changeColor', (color) =>{
    drawconsoleline();
    console.log(`\nTrocar cor para: ${color.color}\n`);
    lastcolor = color;
    socket.broadcast.emit('changeColor', color);
  });
  drawconsoleline();
  socket.emit("changeColor",lastcolor);
  console.log('\nUm novo site foi conectado!\n');
});


