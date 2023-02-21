//@ts-check

/*

This is code used in testing many features 

*/

import * as GameKit from "../gameKit-2.js";
GameKit.makeCanvas();

let { 
    RectEnt, canvas, options, Controls, vec2,
    camera, Counter, Particle, Rnd, mouse, 
    ParticleSystem, pos, deltaTime, Angle
} = GameKit

options.imageDirectory = "../img/"
options.defaultImageFileType = ".png"

class Bullet extends RectEnt {
    constructor(x, y, w, h, c) {
        super(x, y, w, h, c);
    }
    /**@param {GunEnt} gun */
    setParent(gun){
        this.x = gun.x;
        this.y = gun.y;
        this.drawLayer = gun.drawLayer - 1;
    }
}

class GunEnt extends RectEnt {
    constructor(x, y, w, h, c) {
        super(x, y, w, h, c);
        /**@type {(()=>Bullet)[]} */
        this.bullets = [];
        this.nextBulletIndex = 0;
        this.bulletsShot = 0;
    }
    nextBullet(){
        return this.bullets[this.nextBulletIndex];
    }
    /**@param {(()=>Bullet)[]} bullets */
    addBulletTypes(...bullets){
        this.bullets.push(...bullets)
        return this;
    }
    shoot(){
        this.nextBullet()().setParent(this);
    }
    /**@param {ShootEnt} ent */
    setParent(ent) {
        
    }
}

class ShootEnt extends RectEnt{
    constructor(x, y, w, h, c) {
        super(x, y, w, h, c);
        /**@type {GunEnt} */
        this.gun = undefined;
    }
}


var player = new RectEnt(0,0, 34,41, 'royalblue')

player.options.drawStyle = RectEnt.drawStyles.DRAW_STATIC;
player.drawLayer = 1;

var o = new RectEnt(200,250,20,40,'green').track()
var c = Controls.pressed;
//#region Controls
// options.autoTrackKeys = true;
// var spd = 3
Controls.trackKeys('up','down','left','right', 'shift',
    'space',"w","a","s","d","r","q","e","i","j","k","l","=","-",'0',"9", "f");

let cameraNext = {x:camera.x,y:camera.y};
let cameraLerpSpeed = 10;
let curCameraStep = 0;

/**Adjusts the camera by an amount */
function cameraMove(x,y, speed = 10){
    cameraNext.x += x;
    cameraNext.y += y;
    curCameraStep = 2;
    cameraLerpSpeed = speed;
}

/**Moves the camera to a position */
function cameraMoveTo(x, y, speed = 10){
    cameraNext.x = x;
    cameraNext.y = y;
    cameraLerpSpeed = speed + 2;
    curCameraStep = 2;
}

/**Called every tick */
function handleControls(){
    let v = vec2(0,0);
    let speed = 5;
    if(c['w']) v.add(0,-1)
    if(c["a"]) v.add(-1,0)
    if(c["s"]) v.add(0,1)
    if(c["d"]) v.add(1,0)
    v.scale(speed);
    player.position = v.add(player.position);
    if(c["q"] && Math.hypot(player.x - mouse.x, player.y - mouse.y) > player.width) player.moveForward(speed);
    
    if(c['space']){
        if(wasShoot)
            shootCount.count()
        else {
            shootCount.onComplete()
            wasShoot = true;
        }
    }
    const scale = 20
   
    if(c['up'])     cameraMove(0,-scale*camera.zoom);
    if(c['down'])   cameraMove(0,scale*camera.zoom);
    if(c['left'])   cameraMove(-scale*camera.zoom, 0);
    if(c['right'])  cameraMove(scale*camera.zoom,0);

    if(c["="]) camera.zoomPoint(GameKit.Util.clamp(camera.zoom + camera.zoom/scale, 0.5, 5),mouse.x,mouse.y);
    if(c["-"]) camera.zoomPoint(GameKit.Util.clamp(camera.zoom - camera.zoom/scale, 0.5, 5),mouse.x,mouse.y);
}
Controls.addPressOnceEvent("9",()=>cameraMoveTo(0,0, 100))
Controls.addPressOnceEvent('0',()=>camera.zoom = 1);

// Handle camera lerping
addEventListener(GameKit.EventNames.tick, ()=>{
    if(curCameraStep < cameraLerpSpeed) {
        camera.position = GameKit.Util.lerp2D(camera.position, cameraNext, (curCameraStep/cameraLerpSpeed));
        curCameraStep++;
    }
    // Handle keeping player on screen
    let prp = player.relativePosition;
    const OUTER_RANGE = 0.05;
    const MOVE_SPEED = 70
    if(prp.x < GameKit.canvas.width * OUTER_RANGE) {
        // cameraMove(-MOVE_AMOUNT, 0, MOVE_SPEED);
        cameraMoveTo(player.x,player.y, MOVE_SPEED)
    } else if(prp.x > GameKit.canvas.width * (1 - OUTER_RANGE)) {
        // cameraMove(MOVE_AMOUNT,0, MOVE_SPEED)
        cameraMoveTo(player.x,player.y, MOVE_SPEED)
    }
    
    if(prp.y < GameKit.canvas.height * OUTER_RANGE) {
        // cameraMove(0, -MOVE_AMOUNT, MOVE_SPEED);
        cameraMoveTo(player.x,player.y, MOVE_SPEED)
    } else if(prp.y > GameKit.canvas.height * (1 - OUTER_RANGE)) {
        // cameraMove(0, MOVE_A MOUNT, MOVE_SPEED);
        cameraMoveTo(player.x,player.y, MOVE_SPEED)
    }
})

//Rotation style
Controls.addPressOnceEvent("r",()=>{
    console.log("R")
    if(player.options.drawStyle == 1)
        player.options.drawStyle = 0
    else
        player.options.drawStyle = 1
})
Controls.addPressOnceEvent  ("f",()=>{
    console.log('F')
    new ParticleFire(mouse.pos().x,mouse.pos().y,100)
})
Controls.addUnpressOnceEvent("f",()=>new ParticleFire(mouse.x,mouse.y,100))


var wasShoot = false;
var shootCount = new Counter(5, ()=>{
    var p = new RectEnt(player.x,player.y,5,5,'white').track();
    p.rotation.deg = player.rotation.deg + Rnd.intRange(-5,5);
    // @ts-ignore
    p.counter = new Counter(200, ()=>{
        p.toRemove = true
        new Particle(p.x,p.y,p.width*4,p.height * 4,"red",100).borderless()
            .grow().setChange({deg:360, forward:50, y:-50}).startRotation(0,360)
    });
    // @ts-ignore
    p.speed = Rnd.numRange(5,8);
    p.move = function(){
        // @ts-ignore
        this.moveForward(this.speed);
        // @ts-ignore
        this.counter.count(this.speed);
        if(p.collides(t)){
            p.remove()
            t.light(5);
        }
    }
    p.moveForward(player.width/2)
})
//#endregion Controls

o.rotation.deg = 45;
o.hide()
o.options.drawStyle = 1;
var help=document.getElementById('help');
help.style.position = 'absolute';
help.style.zIndex = '5';
addEventListener(GameKit.EventNames.tick, ()=>{

    help.innerHTML = `Mouse: ${mouse.down}, (${pos().from(mouse).roundString()})<br>
    Relative: ${Math.round(player.relativePosition.x)},${Math.round(player.relativePosition.y)} | Actual: ${Math.round(player.x)},${Math.round(player.y)}<br>
    Mouse Hover ${player.hasMouseHover()}<br>
    Zoom: ${Math.round(camera.zoom * 100)/100} at {${pos(camera.x,camera.y).roundString()}<br>    
    `
})

class ParticleFire extends Particle {
    constructor(x, y, lifeSpan, scale = 1, hasSmoke = true) {
        super(x, y, 22 * scale, 22* scale, 'peru', lifeSpan)
        this.colorChoice('red','red','orange','yellow')
        this.shrink()
        this.change.rotation.deg = Rnd.intTo(-60);
        this.startRotation(-45,45);
        this.change.forward = Rnd.intTo(20);
        this.change.y = Rnd.intRange(-20,-100);
        this.change.x = Rnd.intRange(-20,20)
        
        this.startWidth = this.width;
        this.startHeight = this.height;
        this.hasSmoke = hasSmoke;
    }
    onRemove() {
        if(this.hasSmoke){
            new ParticleSmoke(this.x,this.y).fromParent(this);
        }
    }
}

class ParticleSmoke extends Particle {
    constructor(x,y, lifeSpan = 3/deltaTime) {
        super(x,y,5,5,'gray',lifeSpan)
        this.startRotation(0,90)
    }
    fromParent(parent) {
        this.change = parent.change;
        this.change.width = -this.width/this.lifeSpan;
        this.change.height = this.change.width;
        this.change.y -= 5
        return this;
    }
}


class ParticleSystemFire extends ParticleSystem {
    particlesPerSpawn = 3;
    constructor(x, y, lifeSpan, scale=1){
        super(x, y, 3, 5);
        this.addParticleType(()=>new ParticleFire(10,10,lifeSpan, scale))
        this.pattern.colors = ['red','red','orange','yellow']
    }
}

class ParticleSystemTornado extends ParticleSystem {
    constructor(x, y){
        super(x, y, 30, 1);
        this.addParticleType(()=>{
            let p  = new Particle(0,0,15,15,'red',50)
                .setChange({y:Rnd.intRange(-50,-40),
                    x:Rnd.intRange(-15,15),forward:Rnd.intRange(40,50),deg:Rnd.intRange(180,360)})
                .grow()
                .startRotation(0,359)
                .colorChoice('grey','darkgrey','lightgrey')
            p.activeCollision = false;
            p.drawLayer = 5;
            return p;
        });
        this.particlesPerSpawn = 4;
    }
}

let tornado = new ParticleSystemTornado(0,0).forever().setParent(mouse).stop();

var ps = new ParticleSystemFire(415, 275, 32,0.75).setParent(mouse)

var ps2 = new ParticleSystem(100,100,7,3).addParticleType(
    ()=>new Particle(0,0,5,5,'red',10)
    .setChange({forward:8,deg:10})).setParent(player).forever()
ps2.pattern.followsPattern = true;
ps2.pattern.colors = ['red','orange','yellow','green','blue','violet'];
ps2.pattern.size = [2,1.75,1.5,1.25,1,0.75]
ps2.pattern.rotation.deg = 10;
ps2.particlesPerSpawn = 6




var ps3 = new ParticleSystem(100,100,1,2)
    .addParticleType(()=>{
        let  p = new ParticleSmoke(0,0,Rnd.intRange(4,6))
        .setChange({forward:Rnd.intRange(4,5),
            x:Rnd.intRange(-4,3), y:-5, width:0.2, height:0.2});
        if(p.rotation.deg > 45) { // Right side
            p.change.rotation.deg = -4
        } else { //Left side
            p.change.rotation.deg = 4
        }
        return p;
    })
    .setParent(mouse)

ps3.particlesPerSpawn = 3;


//@todo fix camera zoom

/**@type {{x:number,y:number}} */
let clickOffset = undefined;

addEventListener(GameKit.EventNames.tick,()=>{
    // Drag and drop stuff
    if(mouse.down){
        
        if(player.hasMouseHover() && clickOffset == undefined) {
            clickOffset = pos(
                player.x - mouse.x,
                player.y - mouse.y
            )
        }
        if(clickOffset!==undefined) {
            player.position = vec2().from(mouse.position).add(clickOffset)
        } else {
            if(!ps.active){
                ps.forever()
            }
        }
    } else {
        ps.active = false;
        if(clickOffset !== undefined){
            clickOffset = undefined;
        }
    }
    player.pointAt(mouse.x,mouse.y)
    handleControls()
})

class Torch extends RectEnt{
    constructor(x, y, burnRate = 0.5, lightDuration = 15) {
        super(x, y, 10, 100, 'saddlebrown')
        this.burnRate = burnRate;
        this.minHeight = 50;
        this.particles = new ParticleSystemFire(this.x,this.y,25, 1)
        this.particles.setParent(this,0,-(this.height/2 - this.height/10))
        //this.particles.forever();
        this.lightDuration = lightDuration;
        this.track();
    }
    burntOut(){
        return this.height <= this.minHeight;
    }
    light(ticks){
        this.particles.start()
        this.particles.particlesToSpawn += ticks;
    }
    onTick(){
        if(mouse.down && !this.particles.active 
            && this.hasMouseHover() && clickOffset === undefined)
        {
            this.light(this.lightDuration);
        }
        if(this.particles.active){
            if(this.height > this.minHeight) {
                this.height-=this.burnRate;
                this.y+=this.burnRate/2;
                this.particles.parentOffsetY = -(this.height/2 - this.height/10);
            } else {
                this.height = this.minHeight;
                this.particles.stop();
            }
        }
    }
}
var t = new Torch(100,200,0.05, 50)

ps2.stop()
o.show()
o.rotation.rad = 0;
player.rotation.rad = 0
o.options.drawStyle=1


mouse.setDrawFunction((x,y,c)=>{
    c.strokeStyle=(mouse.down)?'red':'black'
    c.lineWidth = 3
    c.beginPath()
    c.moveTo(x-5,y-5);
    c.lineTo(x+5,y+5);
    c.moveTo(x-5,y+5)
    c.lineTo(x+5,y-5)
    c.closePath()
    c.stroke();
    c.lineWidth=1;
});

class ScreenFlash extends Particle {
    constructor(duration = 4){
        super(camera.x,camera.y,canvas.width*2,canvas.height*2,'white',duration);
        this.options.hasBorder=false;
    }
}

class ScreenFade extends Particle {
    constructor(growth, duration, rotation, isRad = false, color = 'white'){
        super(camera.x,camera.y,0,0,color, duration)
        this.change.rotation = new Angle(rotation, isRad);
        this.change.width= growth;
        this.change.height = growth;
    }
    onRemove(){
        player.setPosition(camera.x,camera.y)
    }
}



// Creates all the boxes
(function boxes(){
    let whoa = 4;
    for(let i = -whoa; i < whoa; i++){
        let s = 50;
        for(let j = -whoa; j < whoa; j++){
            var en = new RectEnt(i*s+s*.75, j*s+s*.75, s, s, ((i+j) % 2 === 0)?"white":'grey').track().borderless()
            en.drawLayer = 0;
            en.options.drawStyle = 0;
        }
    }
})()


var center = new class extends RectEnt{
    constructor(){
        super(0,0,5,5,'red');
        this.borderless();
        this.oh = 5;
        this.ow = 5;
    }
    onTick(){
        this.x = camera.x / camera.zoom;
        this.y = camera.y / camera.zoom;
        this.width = this.ow / camera.zoom
        this.height = this.oh / camera.zoom
    }
}
