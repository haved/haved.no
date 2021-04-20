
// Loosely based on https://github.com/crnacura/AmbientCanvasBackgrounds/blob/master/js/aurora.js

'use strict';

class Node {
    constructor(x, y, radius, letter, magic) {
        this.x = x;
        this.y = y;
        this.xSpeed = 0;
        this.ySpeed = 0;
        this.radius = radius;
        this.letter = letter;
        this.magic = magic;
        this.left = null;
        this.right = null;
    }
}

const STRINGS = [
    "haved.no",
    "hello",
    "welcome",
    "hallo",
    "treap",
    "compilers",
    "algorithms",
    "languages"
];
const RADIUS = 20;
const MAX_MAGIC = 10000;

let width, height;
let nodes = [];
let root = null;

function makeEdgePos() {
    if (Math.random()*2 < 1) {
        let x = Math.random()*width;
        return [x, (Math.random()*2 < 1) ? 0 : height];
    } else {
        let y = Math.random()*height;
        return [(Math.random()*2 < 1) ? 0 : width, y];
    }
}

function makeMagic() {
    return Math.floor(Math.random()*MAX_MAGIC);
}

function merge(left, right) {
    if (left == null)
        return right;
    if (right == null)
        return left;

    if (left.magic > right.magic) {
        left.right = merge(left.right, right);
        return left;
    } else {
        right.left = merge(left, right.left);
        return right;
    }
}

function* program() {
    const startWord = STRINGS[0];
    let rightNodes = [];

    for (const chr of startWord) {
        rightNodes.push(new Node(...makeEdgePos(), RADIUS, chr, makeMagic()));
    }

    nodes.push(...rightNodes);

    root = rightNodes.shift();

    yield 30;

    while(rightNodes.length) {
        root = merge(root, rightNodes.shift());
        yield 20;
    }
}

function dist(x1, y1, x2, y2) {
    return Math.hypot(x2-x1, y2-y1);
}

function towardsCenter(pos, min, max) {
    if(pos < min)
        return 1;
    if(pos > max)
        return -1;
    return 1/((pos-min)*0.2+1) + 1/((pos-max)*0.2-1);
}

function pushTowards(node, x, y, force) {
    const dst = dist(node.x, node.y, x, y);
    force = -force * Math.pow(dst/100,.3)/10000;
    const xPush = (node.x-x)*force;
    const yPush = (node.y-y)*force;
    node.xSpeed += xPush;
    node.ySpeed += yPush;
}

const EDGE_LEN = 30;
function updateNodePositions() {
    if (root != null) {
        root.xSpeed -= (root.x-width/2)/1000;
    }

    for (const node of nodes) {
        //Prevent nodes from going off screen
        node.xSpeed += towardsCenter(node.x, 0, width);
        node.ySpeed += towardsCenter(node.y, 0, height);

        //Push away all other nodes that are too close
        for (const node2 of nodes) {
            const dst = dist(node.x, node.y, node2.x, node2.y);
            const push = 3/(dst*dst+100); //Coulomb is that you?
            const xPush = (node2.x-node.x)*push;
            const yPush = (node2.y-node.y)*push;
            node2.xSpeed += xPush;
            node2.ySpeed += yPush;
        }

        if (node.left != null) {
            const targetX = node.x-EDGE_LEN;
            const targetY = node.y+EDGE_LEN;
            pushTowards(node.left, targetX, targetY, 50);
            const thisX = node.left.x+EDGE_LEN;
            const thisY = node.left.y-EDGE_LEN;
            pushTowards(node, thisX, thisY, 25);
        }
        if (node.right != null) {
            const targetX = node.x+EDGE_LEN;
            const targetY = node.y+EDGE_LEN;
            pushTowards(node.right, targetX, targetY, 50);
            const thisX = node.right.x-EDGE_LEN;
            const thisY = node.right.y-EDGE_LEN;
            pushTowards(node, thisX, thisY, 25);
        }
    }

    for (const node of nodes) {
        node.xSpeed -= node.xSpeed*0.1;
        node.ySpeed -= node.ySpeed*0.1;
        node.x += node.xSpeed;
        node.y += node.ySpeed;
    }
}


let canvas, ctx;
function makeCanvas() {
    const container = document.querySelector('.homepage-hero');
    canvas = document.createElement('canvas');
    container.appendChild(canvas);

    ctx = canvas.getContext('2d');
}

function onResize() {
    width = canvas.offsetWidth;
    height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
}

const high = [255, 240, 173];
const low = [240, 173, 255];
function magicToColor(magic) {
    const frac = magic / MAX_MAGIC;
    const rgb = [];
    for (let i = 0; i < 3; i++) {
        const squared = low[i]*low[i] - frac*(low[i]*low[i]-high[i]*high[i]);
        rgb.push(Math.sqrt(squared));
    }
    const [r,g,b] = rgb;
    return `rgb(${r}, ${g}, ${b})`;
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.font = "25px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const line = (from, to) => {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    };

    for (const node of nodes) {
        if(node.left != null)
            line(node, node.left);
        if(node.right != null)
            line(node, node.right);
    }

    for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI*2);
        ctx.fillStyle = magicToColor(node.magic);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "black";
        ctx.fillText(node.letter, node.x, node.y);
    }
}

let theProgram;
let nextProgramTime = 0;
let prevTime; //timestamp in milliseconds

function onFrame(timestamp) {
    const delta = (timestamp - prevTime) ?? 16;
    prevTime = timestamp;

    if (nextProgramTime <= 0)
        nextProgramTime = theProgram.next().value;
    nextProgramTime -= 1;

    updateNodePositions();
    render();
    window.requestAnimationFrame(onFrame);
}

function setup() {
    makeCanvas();
    onResize();
    theProgram = program();
    window.requestAnimationFrame(onFrame);
}

window.addEventListener('load', setup);
window.addEventListener('resize', onResize);

