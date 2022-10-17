//@ts-check

/*

This is code used in testing many features 

*/

var g = GameKit;
GameKit.makeCanvas();
var player = new g.RectEnt(g.canvas.width/2,g.canvas.height/2, 21,41, 'red').track().
    setImage('end')
var o = new g.RectEnt(200,250,20,40,'green').track()
var c = GameKit.Controls.pressed;
//#region Controls
GameKit.options.autoTrackKeys = true;
var spd = 3
GameKit.Controls.trackKeys('up','down','left','right', 'shift',
    'space',"w","a","s","d","r","q","e","i","j","k","l","=","-",'0',"9");

function handleControls(){
    let v = g.vec2(0,0);
    let speed = 5;
    if(c['w']) v.add(0,-1)
    if(c["a"]) v.add(-1,0)
    if(c["s"]) v.add(0,1)
    if(c["d"]) v.add(1,0)
    //v = v.scaled(5);
    v.normalize().setLength(speed);
    //console.log(v);
    player.x += v.x;
    player.y += v.y;
    if(c["q"]) player.moveForward(speed);

    //if(c['r']) player.rotation.deg+=5;
    
    if(c['space']){
        if(wasShoot)
            shootCount.count()
        else {
            shootCount.onComplete()
            wasShoot = true;
        }
    }
    let scale = 20
    if(c['up']) g.camera.y-=scale*g.camera.zoom;
    if(c['down']) g.camera.y+=scale*g.camera.zoom;
    if(c['left']) g.camera.x-=scale*g.camera.zoom;
    if(c['right']) g.camera.x+=scale*g.camera.zoom;
    if(c["="]) g.camera.zoom += g.camera.zoom/20;
    if(c["-"]) g.camera.zoom -= g.camera.zoom/20;
    if(c['0']) g.camera.zoom = 1;
    if(c['9']) g.camera.position = GameKit.pos(0,0);
}
//Rotation style
GameKit.Controls.addPressOnceEvent("r",()=>{
    if(player.options.drawStyle == 1)
        player.options.drawStyle = 0
    else
        player.options.drawStyle = 1
})
GameKit.Controls.addPressOnceEvent  ("f",
    ()=>new ParticleFire(GameKit.mouse.pos().x,GameKit.mouse.pos().y,100))
GameKit.Controls.addUnpressOnceEvent("f",
    ()=>new ParticleFire(GameKit.mouse.x,GameKit.mouse.y,100))


var wasShoot = false;
var shootCount = new g.Counter(5,()=>{
    var p = new g.RectEnt(player.x,player.y,5,5,'white').track();
    p.rotation.deg = player.rotation.deg + g.Rnd.intRange(-5,5);
    // @ts-ignore
    p.counter = new GameKit.Counter(200,()=>{
        p.toRemove =true
        new g.Particle(p.x,p.y,p.width*4,p.height * 4,"red",100,'black')
            .grow().setChange({deg:360, forward:1}).startRotation(0,360)
    });
    // @ts-ignore
    p.speed = GameKit.Rnd.numRange(5,8);
    p.move = function(){
        // @ts-ignore
        this.moveForward(this.speed);
        // @ts-ignore
        this.counter.count(this.speed);
    }
})
//#endregion Controls

o.rotation.deg = 45;
o.hide()
player.rotation.deg = 45
o.options.drawStyle = 1;
var help=document.getElementById('help');
help.style.position = 'absolute';
help.style.zIndex = '5';
setInterval(()=>{
    help.innerHTML = `Mouse: ${g.mouse.down}, (${g.mouse.x},${g.mouse.y})<br>
    ${player.relativePosition.x},${player.relativePosition.y} || ${player.x},${player.y}<br>
    Mouse Hover ${player.hasMouseHover()}<br>
    Zoom: ${GameKit.camera.zoom} at ${GameKit.camera.position.toString()}`
},60)

class ParticleFire extends g.Particle {
    constructor(x, y, lifeSpan, scale = 1, hasSmoke = true) {
        super(x, y, 22 * scale, 22* scale, 'peru', lifeSpan)
        this.colorChoice('red','red','orange','yellow')
        this.shrink()
        this.change.rotation.deg = GameKit.Rnd.intTo(-60);
        this.startRotation(-45,45);
        this.change.forward = GameKit.Rnd.intTo(20);
        this.change.y = GameKit.Rnd.intRange(-20,-100);
        this.change.x = GameKit.Rnd.intRange(-20,20)
        
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

class ParticleSmoke extends g.Particle {
    constructor(x,y, lifeSpan = 3/GameKit.deltaTime) {
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


class ParticleSystem extends GameKit.ParticleSystem {}

class ParticleSystemFire extends GameKit.ParticleSystem {
    constructor(x, y, lifeSpan, scale=1){
        /*
        super(x, y, 3, 2);
        this.addParticleType(()=>new ParticleFire(10,10,lifeSpan, scale))
        this.particlesPerSpawn = 3;
        this.pattern.colors = ['red','red','orange','yellow']
        */
        super(x, y, 3, 0.2);
        this.addParticleType(()=>new ParticleFire(10,10,lifeSpan, scale))
        this.particlesPerSpawn = 2;
        this.pattern.colors = ['red','red','orange','yellow']
    }
}

var ps = new ParticleSystemFire(415, 275, 32,0.75).setParent(GameKit.mouse)

var ps2 = new ParticleSystem(100,100,7,3).addParticleType(
    ()=>new GameKit.Particle(0,0,5,5,'red',10)
    .setChange({forward:8,deg:10})).setParent(player).forever()
ps2.pattern.followsPattern = true;
ps2.pattern.colors = ['red','orange','yellow','green','blue','violet'];
ps2.pattern.size = [2,1.75,1.5,1.25,1,0.75]
ps2.pattern.rotation.deg = 10;
ps2.particlesPerSpawn = 6




var ps3 = new ParticleSystem(100,100,1,2)
    .addParticleType(()=>{
        let  p = new ParticleSmoke(0,0,GameKit.Rnd.intRange(4,6))
        .setChange({forward:GameKit.Rnd.intRange(4,5),
            x:GameKit.Rnd.intRange(-4,3), y:-5, width:0.2, height:0.2});
        if(p.rotation.deg > 45) { // Right side
            p.change.rotation.deg = -4
        } else { //Left side
            p.change.rotation.deg = 4
        }
        return p;
    })
    .setParent(GameKit.mouse)

ps3.particlesPerSpawn = 3;


//@todo fix camera zoom

/**@type {{x:number,y:number}} */
let clickOffset = undefined;

GameKit.onTickFunctions.push(()=>{
    if(GameKit.mouse.down){
        
        if(player.hasMouseHover() && clickOffset == undefined) {
            clickOffset = GameKit.pos(
                player.x - GameKit.mouse.x,
                player.y - GameKit.mouse.y
            )
        }
        if(clickOffset!==undefined) {
            player.position = GameKit.vec2().from(GameKit.mouse.position).add(clickOffset)
        } else {
            if(!ps.active){
                ps.forever()
            }
        }
        //if(t.hasMouseHover())
        //    t.onClick();
        //ps3.active = false;
    } else {
        ps.active = false;
        //if(!ps3.active)
        //    ps3.forever()
        if(clickOffset !== undefined){
            clickOffset = undefined;
        }
    }
    player.pointAt(g.mouse.x,g.mouse.y)
    handleControls()
})

class Torch extends GameKit.RectEnt{
    constructor(x, y, burnRate = 0.5) {
        super(x, y, 10, 100, 'saddlebrown')
        this.burnRate = burnRate;
        this.minHeight = 51;
        this.particles = new ParticleSystemFire(this.x,this.y,7,1)
        this.particles.setParent(this,0,-(this.height/2 - this.height/10))
        //this.particles.forever();
        this.track();
    }
    burntOut(){
        return this.height <= this.minHeight;
    }
    onTick(){
        if(GameKit.mouse.down && !this.particles.active 
            && this.hasMouseHover() && clickOffset === undefined)
        {
            this.particles.start()
            this.particles.particlesToSpawn = 15;
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
var t = new Torch(100,200,1)

ps2.stop()
o.show()
o.rotation.rad = 0;
player.rotation.rad = 0
o.options.drawStyle=1

//Cursor
/*
GameKit.postDrawFunctions.push((c)=>{
    
})
*/
GameKit.mouse.setDrawFunction((x,y,c)=>{
    c.strokeStyle=(GameKit.mouse.down)?'red':'black'
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

player.x=0;
player.y=0;
g.camera.x-=10

class ScreenFlash extends g.Particle {
    constructor(duration = 4){
        super(g.camera.x,g.camera.y,GameKit.canvas.width*2,GameKit.canvas.height*2,'white',duration);
        this.options.hasBorder=false;
    }
}

class ScreenFade extends g.Particle {
    constructor(growth, duration, rotation, isRad = false, color = 'white'){
        super(g.camera.x,g.camera.y,0,0,color, duration)
        this.change.rotation = new g.Angle(rotation, isRad);
        this.change.width= growth;
        this.change.height = growth;
    }
    onRemove(){
        player.setPosition(g.camera.x,g.camera.y)
    }
}


player.drawLayer = 1;
let whoah = 8;
for(let i = -whoah; i < whoah; i++){
    let s = 50;
    for(let j = -whoah; j < whoah; j++){
        var en = new GameKit.RectEnt(i*s+s*.75, j*s+s*.75, s, s, GameKit.Rnd.color()).track()
        en.drawLayer = 0;
        en.options.drawStyle = 0;
        en.pointAt(0,0)
    }
}


function test1(){
    
}
function test2(){
    
}
function test(){
    console.table(GameKit.timeCompare2(test2,test1))
    return ;
}
GameKit.postDrawFunctions.push((ctx)=>{
    var v = GameKit.vec2().from(GameKit.mouse);
    v = v.projOnto(GameKit.pos(1,1)).setLength(100);
    //new GameKit.Line(0,0,v.x,v.y).draw();
    return false;
})
var center = new class extends GameKit.RectEnt{
    constructor(){
        super(0,0,5,5,'red');
        this.borderless();
        this.oh = 5;
        this.ow = 5;
    }
    onTick(){
        this.x = GameKit.camera.x / GameKit.camera.zoom;
        this.y = GameKit.camera.y / GameKit.camera.zoom;
        this.width = this.ow / GameKit.camera.zoom
        this.height = this.oh / GameKit.camera.zoom
        // this.x = GameKit.canvas.width/2 + GameKit.camera.x;
        // this.y = GameKit.canvas.height/2 + GameKit.camera.y;
    }
}

