GameKit.options.renderRate = 1;
GameKit.makeCanvas();
GameKit.options.autoTrackNewEnts = true;
var c = GameKit.camera;
var input = GameKit.Controls.pressed;
GameKit.Controls.trackKeys("wasd","arrows","=","-",'0');

var w = GameKit.canvas.width;
var h = GameKit.canvas.height;

class Paddle extends GameKit.RectEnt {
    constructor(){
        super(0,GameKit.canvas.height/2 - 30,100,20,'gray');
        this.x = 0;
        this.speed = 15 ;
    }
    move(){
        if(input['a'] || input["left"]){
            this.x -= this.speed;
            if((this.x - this.width/2) < (-GameKit.canvas.width/2)){
                this.x = -GameKit.canvas.width/2 + this.width/2;
            }
        }
        if(input['d'] || input['right']){
            this.x += this.speed;
            if((this.x + this.width/2) > (GameKit.canvas.width/2)){
                this.x = GameKit.canvas.width/2 - this.width/2;
            }
        }
        this.x = GameKit.mouse.x;
        /*
        if((this.x - this.width/2) < (-GameKit.canvas.width/2)){
            this.x = -GameKit.canvas.width/2 + this.width/2;
        }
        if((this.x + this.width/2) > (GameKit.canvas.width/2)){
            this.x = GameKit.canvas.width/2 - this.width/2;
        }*/
    }
}
class Ball extends GameKit.RectEnt {
    constructor(x,y){
        super(x, y, 6, 6, 'white');
        this.speed = 3;
        this.options.drawStyle = 1;
        this.rotation.deg = 70;
        this.particles = new GameKit.ParticleSystem(0,0,10,1);
        this.particles.setParent(this);
        var self = this;
        this.particles.addParticleType(()=>{
            var p = new GameKit.Particle(0,0,3,3,'red',3)
                .setChange({forward:-self.speed/4,width:1,height:1})
                .startRotation(self.rotation.deg - 40,self.rotation.deg + 40)
                .colorChoice('red','red','orange','yellow')
            p.options.hasBorder = false;
            return p;
        });
        this.particles.particlesPerSpawn = 15;
        this.particles.forever();
        this.drawLayer = 5;
    }
    move(){
        var old = this.position;
        this.moveForward(this.speed);
        /**@type {GameKit.Line} */
        var l = new GameKit.Line(old.x,old.y,this.x,this.y);

        function movePointInDir(p,dist,newDir,isRad=false){
            let a = new GameKit.Angle(newDir, isRad).rad;
            p.x+=dist*Math.cos(a);
            p.y+=dist*Math.sin(a);
        }
        //Shift forward p2 by a bit for better detection
        movePointInDir(l.p2,4,this.rotation.rad,true);

        this.rotation.round();

        function bounceLeftOrRight(t){
            t.rotation.deg = 180 - t.rotation.deg;
        }
        function bounceTop(t){
            t.rotation.deg = 360 - t.rotation.deg;
        }

        //Right and left Bound
        if((this.x + this.width/2 > w/2) || (this.x - this.width/2 < -w/2)){
            //this.rotation.deg = 180 - this.rotation.deg;
            bounceLeftOrRight(this);
        }
        //Top Bound
        if((this.y - this.height/2) < -h/2){
           //this.rotation.deg = 360 - this.rotation.deg;
           bounceTop(this);
        }
        //Lower Bound
        if(((this.y + this.height/2) > (h/2)) || input['0']){
            this.setPosition(0,90);
            this.rotation.deg = GameKit.Rnd.intRange(45,135);
        }
        //Paddle collision
        //Uses the line drawn to check in case it passes right through the paddle
        if(l.collidesRect(p)){
            //Place above to make it not bounce around inside
            var offset = Math.min(Math.max((this.x - p.x)/(p.width/2),-1),1);
            //Positive means right, neg means left
            //console.log(offset)
            var maxAngleChange = 30;
            this.y = p.y - p.height/2 -2
            this.rotation.deg = (360 - (this.rotation.deg)) + maxAngleChange * offset;
            //Limit bouncing at very boring angles
            var maxAngleBounce = 20;
            if(this.rotation.deg > 360 - maxAngleBounce){
                this.rotation.deg = 360 - maxAngleBounce;
            } else if(this.rotation.deg < 180 - maxAngleBounce){
                this.rotation.deg = 180 - maxAngleBounce;
            }
            this.speed+= 0.02
        }
        for(let i = 0; i < tiles.length; i++){
            if(this.collides(tiles[i])){
                //Get tile collision side
                var ls = GameKit.Line.fromRect(tiles[i]);
                for(let j = 0; j<ls.length;j++){
                    if(l.intersects(ls[j])){
                        switch(j){
                            case 0:case 2:bounceLeftOrRight(this);break;
                            case 1:case 3:bounceTop(this);break;
                        }
                        break;
                    }
                }
                if(tiles[i].hurt(1,i)){
                    i--;
                    continue;
                }
                continue;
            }
        }
        //0 = right, 1 = top, 2 = right, 3 = bottom
        if(input["="]){
            this.speed += 2;
        }
        if(input["-"]){
            this.speed -= 2;
        }
        if(Math.abs(this.speed) > 15 && !this.particles.active){
            this.particles.forever()
        }
        if(Math.abs(this.speed) < 15 && this.particles.active){
            this.particles.stop();
        }
    }

}
var b = new Ball(0,90);
var p = new Paddle();

class Tile extends GameKit.RectEnt {
    static width = 70;
    static height = 40;
    static vertGap = 3;
    static horizGap = 3;
    constructor(x, y){
        super(
            (x*Tile.width + (x-1) * Tile.horizGap) - w/2 + Tile.width,
            Tile.height * 1.25+(y*Tile.height + (y-1) * Tile.vertGap) - h/2,
            Tile.width,
            Tile.height,
            'red'
        );
        this.hp = 2;
        tiles.push(this)
    }
    static colors = ["red","green","blue",'teal',"peru",'orange','magenta','fuscia','yellow','pink'];
    hurt(amount = 1, curIndex = -1){
        this.hp-=amount;
        if(this.hp <= 0){
            this.toRemove = true;
            tiles.splice(curIndex,1);
            return true;
        }
        return false;
    }
    onTick(){
        if(this.hp >= Tile.colors.length){
            this.color = 'gold'
            return;
        }
        if(this.color != Tile.colors[Math.floor(this.hp) - 1]){
            this.color = Tile.colors[Math.floor(this.hp) - 1]//.substr(0,Tile.colors[this.hp - 1].length);
        }
    }
}
/**@type {Tile[]} */
var tiles = [];
let cols = (h/(2*(Tile.height+Tile.vertGap)))
let rows = (w/(Tile.width+Tile.horizGap) - 2) 
for(let i = 0; i < rows;i++){
    for(let j = 0; j<cols;j++){
        new Tile(i,j).hp = cols - j + 1;
    }
}

/*
GameKit.postDrawFunctions.push((ctx)=>{
    var ls = GameKit.Line.fromRect(b);
    ls.forEach(l=>{
        l.color = 'green';
        l.draw();
    });
});*/