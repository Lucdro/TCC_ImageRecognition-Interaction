const socket = io();

socket.on('click', (position) => {
    console.log(`\nClick em X:${position.x} Y:${position.y}`);
});

function ChangeColor(color){
    //{color:[0,0,0],type:'hsl'|'rgb'}
    socket.emit('changeColor',color);
}

ChangeColor({
    color:[
        260,
        40,
        60
    ],
    type:'hsl'
});