const socket = io();
const screen = document.getElementById('screen');
const ctx = screen.getContext('2d');
var color = undefined;
const frames = [];
var currentFrame = 0;
var qrcode = undefined;
const interactionScreenLink = `https://${window.location.host}/interactionScreen`;
const makeQrCode = ()=>{
    const size = 128;
    if(!qrcode){
        qrcode = new QRCode(document.getElementById("qrcode"), {
            text: interactionScreenLink,
            width: size,
            height: size,
            colorDark : "#121212",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });
    }
}

document.getElementById("siteinfo").innerHTML = interactionScreenLink;

function ChangeColor(color){
    //{color:[0,0,0],type:'hsl'|'rgb'}
    socket.emit('changeColor',color);
}
window.addEventListener('load', () =>{
    loadImage();
    makeQrCode();
})

const loadImage = () =>{
    for(let i = 1; i <= 16; i++){
        frames.push(new Image);
        frames[i-1].src = "sprites/screen/screen-frame"+i+".png"; 
    }
    frames[0].addEventListener('load',()=>{
        screen.width = frames[0].width
        screen.height = frames[0].height
        ctx.drawImage(frames[0],0,0);
        const cornerSpot = ctx.getImageData(32,32,1,1).data;
        color = {
            color:[
                cornerSpot[0],
                cornerSpot[1],
                cornerSpot[2]
            ],
            type:'rgb'
        };
        ChangeColor(color);
        animate();
    })
}

class FadeinImage{
    constructor(img,ctx,pos){
        this.img = new Image;
        this.img.src = img;
        this.img.addEventListener('load', ()=>{
            this.#Icanvas = document.createElement('canvas');
            this.#Icanvas.width = this.img.width;
            this.#Icanvas.height = this.img.height;
            this.#Ictx = this.#Icanvas.getContext('2d');
            this.#Ictx.drawImage(this.img,0,0);
        });
        this.ctx = ctx;
        this.position = pos;
    }
    fAn = 30;
    nAn = 1;
    loopcount = 0;
    loopmax = 3;
    animate = false;
    #Icanvas = undefined;
    #Ictx = undefined;
    ctx = undefined;
    img = undefined;
    position = undefined;

    draw(){
        if(this.animate){
            const oldalpha = this.ctx.globalAlpha;
            this.ctx.globalAlpha = this.nAn/this.fAn;
            this.ctx.drawImage(this.img,this.position[0],this.position[1]);

            this.nAn++;
            if(this.nAn > this.fAn){
                this.nAn = 1;
                this.loopcount++;
                if(this.loopcount >= this.loopmax){
                    this.animate = false;
                    this.loopcount = 0;
                }
            }
            this.ctx.globalAlpha = oldalpha;
        }
    }

    isPixelVisible(pos){
        const x = this.img.width * pos.x;
        const y = this.img.height * pos.y;
        const pixel = this.#Ictx.getImageData(x,y,1,1).data;
        return pixel[3] > 0;
    }

    turnOn(){
        this.animate = true;
    }
}

const fps = 60;
const bodyparts = [];
for(i = 1; i <= 5; i++){
    bodyparts.push(new FadeinImage(`sprites/bodyparts/bodypart${i}.png`,ctx,[0,0])); 
}

const animationfps = 4;
var animationwait = 0;
const idleWait = 4;
var idleLoop = 0;
function animate() {
    // perform some animation task here
    if(animationwait >= fps/animationfps){
        currentFrame++;
        if(currentFrame == 8 && idleLoop < idleWait){
            idleLoop++;
            currentFrame=0;
        }
        else if(currentFrame >= frames.length){
            currentFrame=0;
            idleLoop=0;
        }
        animationwait = 0;
    }
    else{
        animationwait++;
    }
    ctx.drawImage(frames[currentFrame],0,0);
    bodyparts.forEach(b =>{
        b.draw();
    })
    setTimeout(() => {
        requestAnimationFrame(animate);
    }, 1000 / fps);
}

socket.on('click', (position) => {
    console.log(`\nClick em X:${position.x} Y:${position.y}`);
    bodyparts.forEach(p => {
        if(p.isPixelVisible(position)){
            p.turnOn();
        }
    })
});

socket.io.on('reconnect', () =>{
    if(color){
        socket.emit('changeColor',color);
    }
});

screen.addEventListener('click', (e)=> {
    position = {
        x: e.x/e.view.innerWidth,
        y: e.y/e.view.innerHeight
    }
    bodyparts.forEach(p => {
        if(p.isPixelVisible(position)){
            p.turnOn();
        }
    })
})