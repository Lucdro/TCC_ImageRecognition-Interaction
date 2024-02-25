const socket = io();
const screen = document.getElementById('screen');
const ctx = screen.getContext('2d');
const frames = [];
var currentFrame = 0;

function ChangeColor(color){
    //{color:[0,0,0],type:'hsl'|'rgb'}
    socket.emit('changeColor',color);
}

function Scale(imagedata,ow,oh,nw,nh){
    const jx = ow/nw; 
    const jy = oh/nh;
    const newImage = new Uint8ClampedArray(nw*nh*4);
    const nextLine = nw * 4
    for(let y = 0, row = 0; row < nh; y += nextLine, row++){
        const limX = y + nextLine;
        const mapRow = Math.min(Math.round(jy * row), oh);
        for(let x = y, pixel = 0; x < limX; x += 4, pixel++){
            var closestIndex = mapRow*ow + Math.round(pixel * jx);
            closestIndex *= 4
            closestIndex = closestIndex - closestIndex % 4
            newImage[x] = imagedata[closestIndex];
            newImage[x + 1] = imagedata[closestIndex + 1];
            newImage[x + 2] = imagedata[closestIndex + 2];
            newImage[x + 3] = imagedata[closestIndex + 3];
        }
    }
    return newImage;
}

window.addEventListener('load', () =>{
    loadImage();
})

const loadImage = () =>{
    for(let i = 1; i <= 40; i++){
        frames.push(new Image);
        frames[i-1].src = "sprites/screen-frame"+i+".png"; 
    }
    frames[0].addEventListener('load',()=>{
        screen.width = frames[0].width
        screen.height = frames[0].height
        ctx.drawImage(frames[0],0,0);
        const cornerSpot = ctx.getImageData(32,32,1,1).data;
        ChangeColor({
            color:[
                cornerSpot[0],
                cornerSpot[1],
                cornerSpot[2]
            ],
            type:'rgb'
        });
        animate();
    })
}

const fps = 4;
function animate() {
    // perform some animation task here
    currentFrame++;
    if(currentFrame >= frames.length){
        currentFrame=0;
    }
    ctx.drawImage(frames[currentFrame],0,0);
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, 1000 / fps);
}

socket.on('click', (position) => {
    console.log(`\nClick em X:${position.x} Y:${position.y}`);
});
