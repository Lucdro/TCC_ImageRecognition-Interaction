const camera = document.getElementById('camera');
const out = document.getElementById('canvas')
const ctxOut = out.getContext('2d');
const canvasTemp = document.createElement('canvas');
var ctx;
const btnInteragir = document.getElementById('btnInteragir');
var lastclick = new Date();
var stream;
const socket = io();
//CONFIGS
const clickCoolDown = 250;
var pointHUE = 0;
const hueOffset = 10;
var saturation = 0;
const sOffset = 20;
var lumination = 0;
const lOffset = 15;
const maxWidth = 1280;
const maxHeight = 720;

const setRearCamera = async () =>{
    if ('mediaDevices' in navigator && navigator.mediaDevices.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                width: { min: 640, ideal: 1920 },
                height: { min: 400, ideal: 1080 },
                aspectRatio: { ideal: 1.7777777778 },
                facingMode: 'environment',
                autoGainControl: true
            }
        })
        if(!stream) return;
        camera.srcObject = stream;
        canvasTemp.width = camera.videoWidth;
        canvasTemp.height = camera.videoHeight;
        ctx = canvasTemp.getContext('2d');
    }
}

function GetNormalizedPosition(videoinfo, point){
    //Normalize Data
    var data;
    var width;
    var height;
    if(videoinfo[1] > maxWidth || videoinfo[2] > maxHeight){
        if(width > height){
            data = Scale(videoinfo[0],videoinfo[1],videoinfo[2],maxWidth,maxHeight);
            width = maxWidth;
            height = maxHeight;
            point[0] = maxWidth * (point[0]/videoinfo[1])
            point[1] = maxHeight * (point[1]/videoinfo[2])
        }
        else{
            data = Scale(videoinfo[0],videoinfo[1],videoinfo[2],maxHeight,maxWidth);
            width = maxHeight;
            height = maxWidth;
            point[0] = maxHeight * (point[0]/videoinfo[1])
            point[1] = maxWidth * (point[1]/videoinfo[2])
        }
    }
    else{
        data = videoinfo[0];
        width = videoinfo[1];
        height = videoinfo[2];
    }
    const ndata = Scale(data, width, height, out.width, out.height);
    ctxOut?.putImageData(new ImageData(ndata,out.width,out.height),0,0);
    //console.log('Scalou');
    //Find the screen corners
    //Blur(data,width,height,2);

    const smin = Math.max(0,saturation - sOffset);
    const smax = Math.min(360,saturation + sOffset);
    const lmin = Math.max(0,lumination - lOffset);
    const lmax = Math.min(100,lumination + lOffset);
    var points = GetPointsHSL(data,pointHUE,hueOffset,smin,smax,lmin,lmax, width);
    if(points.length == 0) return undefined;
    //console.log('Pegou Pontos');

    points = ConvergePoints(points,3);
    
    //  console.log(point.length)
    if(points.length != 4) {
        DrawToCanvas(width, height, points, point);
        return undefined;
    }

    SortClockWisePoints(points);
    //console.log('Ordenou');

    //Draw to canvas
    DrawToCanvas(width, height, points, point);

    //Find the relative position
    return  GetRelativePosition(points,point,0.01, width, height,20);
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

function surroundingAvarage(imagedata,index,w,h,radius,includecenter = false){
    const rowLength = (1 + radius * 2) * 4;
    const nextLine = w * 4
    var inicialI = index - radius * 4 - nextLine * radius;
    var finalI =  index + radius * 4 + nextLine * radius;
    //Force inicial and final to valid points
    inicialI = Math.max(inicialI,0);
    finalI = Math.min(finalI, w * h * 4)
    const avaragePixel = [0,0,0,0];
    let pixelIndex = 0;
    let pixelCount = 0;
    for(let y = inicialI; y < finalI; y += nextLine){
        for(let x = y; x < y + rowLength && x < finalI; x++){
            if(pixelIndex >= 4) {
                pixelIndex = 0;
                pixelCount++;
            };
            if (x == index && !includecenter){
                x += 3;
                continue;
            }
            avaragePixel[pixelIndex] += imagedata[x];
            pixelIndex++;
        }
    }
    if(pixelIndex == 3) pixelCount++;
    avaragePixel[0] = avaragePixel[0]/pixelCount;
    avaragePixel[1] = avaragePixel[1]/pixelCount;
    avaragePixel[2] = avaragePixel[2]/pixelCount;
    avaragePixel[3] = avaragePixel[3]/pixelCount;
    return avaragePixel;
}

function Blur(imagedata,w,h, intensity){
    for(let i = 0; i < imagedata.length; i +=4){
        const newPixel = surroundingAvarage(imagedata,i,w,h,intensity,true);
        imagedata[i] = newPixel[0];
        imagedata[i + 1] = newPixel[1];
        imagedata[i + 2] = newPixel[2];
        imagedata[i + 3] = newPixel[3];
    }
}

//Creditos
//https://www.30secondsofcode.org/js/s/rgb-to-hsl/
const RGBToHSL = (r, g, b) => {
    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
      ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
      : 0;
    return [
      60 * h < 0 ? 60 * h + 360 : 60 * h,
      100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
      (100 * (2 * l - s)) / 2,
    ];
};

function DataImageIndexToPoint(i, w){
    return [i%w, Math.floor(i/w)];
}

function GetPointsHSL(data, hue, hmof ,smin,smax,lmin,lmax, w){
    var min = hue - hmof;
    min = min < 0 ? 360 + min : min
    var max = hue + hmof;
    max = max > 359 ? max - 359 : max
    const compare = (h) => {
        if(min > max)   
            return h >= min || h <= max;
        return h >= min && h <= max;
    }

    const points = [];
    for(let i = 0; i < data.length; i +=4){
        const hsl = RGBToHSL(data[i],data[i + 1],data[i + 2]);
        //console.log('index:' +i)
        const lightnessCondition = hsl[2] >= lmin && hsl[2] <= lmax;
        const saturationCondition = hsl[1] >= smin && hsl[1] <= smax;
        const hueCondition = compare(hsl[0]); 
        const isPoint = hueCondition && saturationCondition && lightnessCondition ? true : false;
        if(isPoint){
            //console.log('push '+i)
            points.push(DataImageIndexToPoint(i/4, w));   
        }
    }
    return points;
}

function _convergePoints(points, distance){
    const convergedPoints = [];
    points.forEach(point => {
        var stored = false;
        convergedPoints.forEach((storedpoint) => {
            if(Math.abs(storedpoint[0] - point[0]) < distance && 
            Math.abs(storedpoint[1] - point[1]) < distance){
                stored = true
                return; 
            };
        });
        if(!stored){
            convergedPoints.push(point);
        };
    });
    
    return convergedPoints;
}

function ConvergePoints(points,tries){
    let i = 0;
    let converged;
    while(points.length > 4 && i < tries){
        converged = _convergePoints(points,25+i*25);
        i++;
    }
    //console.log(converged)
    return converged
}

function SortClockWisePoints(points){
    points.sort((a,b)=>a[0] - b[0]);
    const left = [points[0],points[1]];
    const right = [points[2],points[3]];

    left.sort((a,b)=>a[1] - b[1]);
    right.sort((a,b)=>a[1] - b[1]);
  
    points[0] = left[0];
    points[1] = right[0];
    points[2] = right[1];
    points[3] = left[1];
}

function GetRelativePosition(pointsGiven,aim,precision, width, height, maximumTries = 20){
    pointToProject = {
        x: aim[0],
        y: aim[1]
    }
    const points = [
        {x:pointsGiven[0][0], y:pointsGiven[0][1]},
        {x:pointsGiven[1][0], y:pointsGiven[1][1]},
        {x:pointsGiven[2][0], y:pointsGiven[2][1]},
        {x:pointsGiven[3][0], y:pointsGiven[3][1]},
    ]
    
    const middleleft = {
        x: (points[0].x + points[3].x)/2,
        y: (points[0].y + points[3].y)/2
    }
    const middleup = {
        x: (points[0].x + points[1].x)/2,
        y: (points[0].y + points[1].y)/2
    }
    const middleright = {
        x: (points[1].x + points[2].x)/2,
        y: (points[1].y + points[2].y)/2
    }
    const middledown = {
        x: (points[2].x + points[3].x)/2,
        y: (points[2].y + points[3].y)/2
    }
    const middle = {
        x: (middleup.x + middledown.x)/2,
        y: (middleleft.y + middleright.y)/2
    } 
    const relativePos ={
        x:0.5,
        y:0.5
    }
    const scaleX = out.width / width; 
    const scaleY = out.height / height; 
    drawLine(ctxOut,middleleft.x*scaleX,middleleft.y*scaleY,middleright.x*scaleX,middleright.y*scaleY,'rgb(38, 122, 21)',2);
    drawLine(ctxOut,middleup.x*scaleX,middleup.y*scaleY,middledown.x*scaleX,middledown.y*scaleY,'rgb(38, 122, 21)',2);
    drawDot(ctxOut,[middle.x*scaleX,middle.y*scaleY],'red',2,true);
    const changepoint = (point, to) => {
        point.x = to.x;
        point.y = to.y;
    }
    let i = 0;
    while(i < maximumTries && (Math.abs(middle.x - pointToProject.x) > precision || Math.abs(middle.y - pointToProject.y) > precision)){
        let jmp = 2**-(i+2);
        //primeiro quadrante
        if(pointToProject.x > middle.x && pointToProject.y < middle.y){
            changepoint(points[0],middleup);
            changepoint(points[2],middleright);
            changepoint(points[3],middle);
            relativePos.x += jmp;
            relativePos.y -= jmp;
        }
        //segundo quadrante
        if(pointToProject.x < middle.x && pointToProject.y < middle.y){
            changepoint(points[1],middleup);
            changepoint(points[3],middleleft);
            changepoint(points[2],middle);
            relativePos.x -= jmp;
            relativePos.y -= jmp;
        }
        //terceiro quadrante
        if(pointToProject.x < middle.x && pointToProject.y > middle.y){
            changepoint(points[0],middleleft);
            changepoint(points[2],middledown);
            changepoint(points[1],middle);
            relativePos.x -= jmp;
            relativePos.y += jmp;
        }
        //quarto quadrante
        if(pointToProject.x > middle.x && pointToProject.y > middle.y){
            changepoint(points[1],middleright);
            changepoint(points[3],middledown);
            changepoint(points[0],middle);
            relativePos.x += jmp;
            relativePos.y += jmp;
        }

        middleleft.x = (points[0].x + points[3].x)/2;
        middleleft.y = (points[0].y + points[3].y)/2;
        
        middleup.x = (points[0].x + points[1].x)/2;
        middleup.y = (points[0].y + points[1].y)/2;

        middleright.x = (points[1].x + points[2].x)/2;
        middleright.y = (points[1].y + points[2].y)/2;

        middledown.x = (points[2].x + points[3].x)/2;
        middledown.y = (points[2].y + points[3].y)/2;
        
        middle.x = (middleup.x + middledown.x)/2;
        middle.y = (middleleft.y + middleright.y)/2;

        i++;
        [...points,middleleft,middleup,middleright,middledown].forEach(p => {drawDot(ctxOut,[p.x*scaleX,p.y*scaleY],'blue',2,true);})
        drawDot(ctxOut,[middle.x*scaleX,middle.y*scaleY],'red',4,true);
        drawLine(ctxOut,middleleft.x*scaleX,middleleft.y*scaleY,middleright.x*scaleX,middleright.y*scaleY,'rgb(38, 122, 21)',2);
        drawLine(ctxOut,middleup.x*scaleX,middleup.y*scaleY,middledown.x*scaleX,middledown.y*scaleY,'rgb(38, 122, 21)',2);
    }
    //console.log(i)
    return relativePos;
}

function drawDot(ctx,point,color,radius,fill = true){
    ctx.beginPath();
    ctx.arc(point[0], point[1], radius, 0, 2 * Math.PI);
    if(fill){
        ctx.fillStyle = color;
        ctx.fill();
    }else{
        ctx.strokeStyle = color;
        ctx.stroke();
    }
}

function drawLine(ctx,startx,starty,endx,endy,color,width){
    const linewidth = ctx.lineWidth;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(startx,starty);
    ctx.lineTo(endx,endy);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.lineWidth = linewidth; 
}

function DrawToCanvas(width, height, points, point){
    const scaleX = out.width / width; 
    const scaleY = out.height / height; 
    const nPoints = [];
    points.forEach( p => {
        const npoint = [p[0] * scaleX, p[1] * scaleY];
        drawDot(ctxOut, npoint, 'red', 3, true);
        nPoints.push(npoint);
    });
    for(let i = 0; i < nPoints.length; i++){
        if(i == nPoints.length-1){
            drawLine(ctxOut,nPoints[i][0],nPoints[i][1],nPoints[0][0],nPoints[0][1],'blue',2);
        }
        else{
            drawLine(ctxOut,nPoints[i][0],nPoints[i][1],nPoints[i+1][0],nPoints[i+1][1],'blue',2);
        }
    }
    //console.log(point);
    const nPoint = [point[0] * scaleX, point[1] * scaleY];
    //console.log(point);

    drawDot(ctxOut, nPoint, 'blue', 4, true);
}

function SetColor(color, hsl = true){
    if(!hsl){
        color = RGBToHSL(color[0],color[1],color[2]);
    }
    pointHUE = color[0];
    saturation = color[1];
    lumination = color[2];
}

function SendPositionToScreen(position){
    socket.emit('click', position);
}

window.addEventListener('load', function() {
    setRearCamera();
    SetColor([260,40,60],true);
    btnInteragir.addEventListener('click', async function(){
        let newDate = new Date();
        if(newDate.getTime() - lastclick.getTime() < clickCoolDown){return;}
        lastclick = newDate;
        if(!stream){alert('Por favor libere o acesso à câmera e reinicie a página!'); return;}
        canvasTemp.width = camera.videoWidth;
        canvasTemp.height = camera.videoHeight;
        ctx = canvasTemp.getContext('2d');
        ctx.drawImage(camera,0,0);
        const scan = ctx.getImageData(0,0,camera.videoWidth,camera.videoHeight);
        const normalizedPosition = GetNormalizedPosition([scan.data,camera.videoWidth,camera.videoHeight], [camera.videoWidth*0.5,camera.videoHeight*0.5]);

        if(!normalizedPosition){
            console.log("Retornou undefined");
            //socket.emit('click',[0,0]);
            return;
        }
        console.log(normalizedPosition)
        SendPositionToScreen(normalizedPosition);
    })
    socket.on('changeColor',(color) => {
        SetColor(color.color, color.type == 'hsl');
    });
});