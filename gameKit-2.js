//@ts-check
"use strict";
/**
 * Tool used for quick simple game construction.
 * For initial setup, use this before using anything else from the GameKit
 * @example GameKit.makeCanvas();
 * GameKit.Controls.trackKeys("up","down","left","right","space")
 * @TODO: Audio functions, clean up, more documentations, refactor, optimize, and maybe utilize, fix resize, activate once on keypress
 * Maybe change to request anim frame. Zoom is towards 0,0. UI stuff
 * Uses an immediately invoked anonymous function call to isolate any variables that are left loose
 * @TODO: Add a slower rendered canvas underneath to allow better performance
 */
const GameKit = (function(){
    const GameKit = {};
    /**@type {HTMLCanvasElement} */
    GameKit.canvas=undefined;
    /**@type {HTMLCanvasElement} A canvas used for rendering more static things. Can be force re-rendered with GameKit.renderSlowCanvas = true */
    GameKit.slowCanvas=undefined;
    /**@type {HTMLCanvasElement} A canvas used for rendering the UI elements. I'm not sure if this is even used yet though.  */
    GameKit.uiCanvas=undefined;
    
    /**@type {CanvasRenderingContext2D} */
    GameKit.ctx=undefined;
    /**@type {CanvasRenderingContext2D} The context for the slowCanvas */
    GameKit.ctx2=undefined;
    
    /**@type {CanvasRenderingContext2D} The context for the UI elements */
    GameKit.ctxUI=undefined;

    /**@type {number} the variable that holds the refresh timer */
    GameKit.canvasRefreshInterval=undefined;

    /**Modifies the render rate of the canvas. If using Gamekit.options.renderIndependent, this just changes the framerate */
    GameKit.setTimeScale = function(rate){
        GameKit.options.renderRate = rate;
        GameKit.deltaTime = 1/GameKit.options.renderRate;
        if(typeof GameKit.canvasRefreshInterval == 'number'){
            clearInterval(GameKit.canvasRefreshInterval);
        }
        GameKit.canvasRefreshInterval = setInterval(()=>GameKit.tick(), GameKit.options.renderRate);
    }
    GameKit.forceRenderSlowCanvas = false;
    GameKit.options =  {
        /**Adds an event listener that updates the mouse position and mouse down variables */
        trackMouse: true,
        /**Whether to watch what keys are being pressed */
        trackControls: true, 
        /**Automatically adds keys to be tracked when they are pressed */
        autoTrackKeys:false,
        /**Allows skipping running .track() on every new entity that is created */
        autoTrackNewEnts:true,
        /**Allows the canvas to auto resize when the window gets resized. Currently broken @TODO: */
        autoSizeCanvas:true,
        /**The border color of all entities initially */
        defaultBorderColor:'black',
        /**The color that is painted onto the background after each frame */
        backgroundColor:'lightgray',
        defaultImageFileType:'.png',
        /**@type {'up'|'down'|'left'|'right'} Images facing up are considered correct from the start @TODO: */
        defaultImageOrientation:'up',
        imageDirectory:"img/",
        /**The speed that all ticking happens per millisecond */
        renderRate:1000/60,
        /** If movement options should be render independent */
        renderIndependent:true,
        /**@type {0|1} */
        defaultEntDrawStyle:0,//GameKit.RectEnt.drawStyles.DRAW_ROTATED
        /**
         * This is the scale of all movement. Useful for making you able to move at units of
         */
        unitScale:1,
        caseInsensitive:true,
    };
    GameKit.deltaTime = 1/GameKit.options.renderRate;
    /**Allows setting many options at onces using a destructured parameter */
    GameKit.setOptions = function(/** @type {{ [x: string]: any; }} */ obj){
        for(let prop in obj){
            if(prop in GameKit.options) {
                if(typeof GameKit.options[prop] != typeof obj[prop])
                    console.warn(`Expected type of ${typeof GameKit.options[prop]} for option ${prop}, but got ${typeof obj[prop]} instead`);
                else 
                    GameKit.options[prop] = obj[prop];
            }
        }
    }
    /**Initial Setup function */
    GameKit.makeCanvas = function(w,h){
        GameKit.canvas=document.createElement('canvas');
        GameKit.slowCanvas=document.createElement("canvas");
        if(h == undefined && w == undefined) {
            //AutoSizing
            GameKit.resizeCanvas();
        } else {
            //Squarification
            if(h==undefined)
                h = w;
            GameKit.canvas.width=w;
            GameKit.slowCanvas.width=w;
            GameKit.canvas.height=h;
            GameKit.slowCanvas.height=h;
            
        }
        //////
        let html = document.querySelector("html")
        document.body.style.margin = '0';
        html.style.margin = "0";
        html.style.height = "100%";
        html.style.width = "100%";
        html.style.overflow = "hidden";
        [GameKit.canvas,GameKit.slowCanvas].forEach(c=>{
            c.classList.add("GameKitCanvas")
            c.style.border='2px solid '+GameKit.options.defaultBorderColor;
            c.style.boxSizing = "border-box";
            c.style.padding = '0px';
            c.style.marginLeft = '0px';
            c.style.marginTop = '0px';
            c.style.display = 'block';
            c.style.position = 'absolute';
            c.style.offset = '0';
        });
        /////////
        
        GameKit.camera.x = 0;
        GameKit.camera.y = 0;
        GameKit.ctx=GameKit.canvas.getContext('2d');
        GameKit.ctx2=GameKit.slowCanvas.getContext('2d');
        GameKit.ctx.imageSmoothingEnabled = false;
        GameKit.ctx2.imageSmoothingEnabled = false;
        GameKit.canvas.addEventListener('mousemove',e=>{
            e.preventDefault();
            e.stopPropagation();
            if(GameKit.options.trackMouse) {
                //let scalar = Math.sqrt(1/GameKit.camera.zoom);
                let actual = GameKit.localToActual(
                    (e.pageX-GameKit.canvas.offsetLeft),
                    (e.pageY-GameKit.canvas.offsetTop)
                );
                GameKit.mouse.x = actual.x // / GameKit.camera.zoom;    
                GameKit.mouse.y = actual.y // / GameKit.camera.zoom;
                //GameKit.mouse.x = (e.pageX-GameKit.canvas.offsetLeft - GameKit.canvas.width/2 + GameKit.camera.x)*scalar;
                //GameKit.mouse.y = (e.pageY-GameKit.canvas.offsetTop - GameKit.canvas.height/2 + GameKit.camera.y)*scalar;
            }
        });
        window.addEventListener('resize',e=>{
            e.stopPropagation();
            e.preventDefault();
            console.log("Canvas resize");
            if(GameKit.options.autoSizeCanvas) {
                GameKit.resizeCanvas();
                GameKit.forceRenderSlowCanvas = true;
            }
        });
        document.addEventListener('mousedown',e=>{
            e.preventDefault();
            e.stopPropagation();

            GameKit.mouse.down = (!GameKit.options.trackMouse)?false:true;
        });
        document.body.addEventListener('mouseup',e=>{
            GameKit.mouse.down = false;
        });
        GameKit.canvas.addEventListener('click',e=>{
            e.stopPropagation();
            e.preventDefault();
            //@ts-ignore backwards compatibility
            if(document.selection && document.selection.empty) {
                //@ts-ignore
                document.selection.empty();
            } else if(window.getSelection) {
                window.getSelection().removeAllRanges();
            }
            GameKit.onClickEvent();
        });
        document.body.addEventListener('keydown', e=>{
            e.stopPropagation();
            GameKit.Controls.keydownEvent(e);
        });
        document.body.addEventListener('keyup', e=>{
            e.stopPropagation();
            e.preventDefault();
            GameKit.Controls.keyupEvent(e);
        });
        document.body.appendChild(GameKit.canvas);
        //document.body.appendChild(GameKit.slowCanvas); I don't know that this needs to actually be added
        GameKit.setTimeScale(GameKit.options.renderRate)
        GameKit.mouse.position = GameKit.vec2(-1,-1);
        //document.body.appendChild(GameKit.slowCanvas)
        return GameKit.canvas;
    }
    GameKit.resizeCanvas = throttle(()=>{
        GameKit.canvas.width = (window.innerWidth-GameKit.canvas.clientLeft)*0.9;
        GameKit.slowCanvas.width = (window.innerWidth-GameKit.slowCanvas.clientLeft)*0.9;
        GameKit.canvas.height = (window.innerHeight-GameKit.canvas.clientTop)*0.9;
        GameKit.slowCanvas.height = (window.innerHeight-GameKit.slowCanvas.clientTop)*0.9;
        /////////////////////////////////////////////
        [GameKit.canvas,GameKit.slowCanvas].forEach(c=>{
            c.width = window.innerWidth - c.clientLeft;
            c.height = window.innerHeight - c.clientTop;
        });
        GameKit.forceRenderSlowCanvas = true;
        /**@TODO: Adjust camera to not be wonky when resizing */
        /**@TODO: Fix UI elements after resize */
    }, 500);


    /**Class for easy manipulation of angles in radians and degrees */
    GameKit.Angle = class Angle {
        #cur;
        /**Angle defaults to degrees */
        constructor(ang = 0, isRad = false) {
            this.#cur = (isRad)?ang:GameKit.Angle.toRad(ang);
        }
        get rad(){return this.#cur;}
        get deg(){return GameKit.Angle.toDeg(this.#cur);}
        set rad(val){this.#cur = val;}
        set deg(val){this.#cur = GameKit.Angle.toRad(val);}
        /**Loops internal tracker to the range 0-2pi or 0-360 */
        round() {
            //@TODO: I should likely change this from a while loop
            //while(this.#cur<0)
            //    this.#cur+=(Math.PI*2);
            //this.#cur = this.#cur % (Math.PI*2);
            //if(this.#cur < 0){
            //    this.#cur += Math.PI * 2;
            //}
            return this;
        }
        static toRad(deg) {return deg*Math.PI/180}
        static toDeg(rad) {return rad*180/Math.PI}
        /**Returns the radians for the angle. Used when using math operators */
        valueOf(){
            return this.#cur;
        }
    }
    /**
     * Class that works as a rectangular base with rotations and collision detection. Center based positioning. 
     * Basic blocks of the engine
     * DON'T FORGET TO TRACK ALL YOUR ENTS AFTER MAKING THEM!
     */
    GameKit.RectEnt = class RectEnt {
        /**@type {number} */
        #x;
        /**@type {number} */
        #y;
        /**
         * @param {number} x @param {number} y @param {number} width @param {number} height
         * @param {string} color @param {string} borderColor 
         */
        constructor(x,y,width,height,color='white',borderColor=GameKit.options.defaultBorderColor,doNotAdd=false){
            this.#x=x-width/4;
            this.#y=y-height/4;
            this.width=width;
            this.height=height;
            /**This is if any collisions happen with this entity */
            this.activeCollision=true;
            /**Tells if the entity should be removed next tick */
            this.toRemove=false;
            this.color = color;
            this.borderColor = borderColor;
            /**Angle they are facing */
            this.rotation = new GameKit.Angle();
            /**@type {HTMLImageElement} */
            this.image = undefined;
            /**Layers to draw them on in increasing order. Lowest is drawn first */
            this.drawLayer = 1;
            /**@type {'up'|'down'|'left'|'right'} which way to flip the image when drawn @TODO: */
            this.imageOrientation = GameKit.options.defaultImageOrientation;
            this.imageName = undefined;
            this.beingTracked = false;
            if(GameKit.options.autoTrackNewEnts && !doNotAdd){
                this.track();
            }
            this.slowRender = false; ///////
        }
        options = {
            hidden:false,
            /**@type {number} */
            drawStyle:GameKit.options.defaultEntDrawStyle,
            hasBorder:true,
            imageBorder:true,
            drawBoxUnderImage:false
        }
        renderSlow(){
            this.slowRender = true;
            return this;
        }
        borderless(){
            this.options.hasBorder = false;
            this.options.imageBorder = false;
            return this;
        }
        setImage(src){
            //Image already loaded
            if(!((src+GameKit.options.defaultImageFileType) in GameKit.images)){
                GameKit.loadImages(src)
            }
            this.imageName = src;
            this.image = GameKit.images[src+GameKit.options.defaultImageFileType];
            return this;     
        }
        /**Position relative to the top right corner of the screen */
        get relativePosition(){
            return GameKit.pos(GameKit.canvas.width/2 - GameKit.camera.x + this.x, GameKit.canvas.height/2 - GameKit.camera.y + this.y);
        }
        /**Called each tick */
        move(){}
        /** Draws a basic rectangle with rotation, based upon options.drawStyle */
        draw(){
            if(this.options.hidden){
                return;
            }
            //Renders on other canvas if it is set to be slow rendered
            let c = (!this.slowRender)?GameKit.ctx:GameKit.ctx2;
            //Floor all values passed into any ctx funcs to optimize perf
            let fw = Math.floor(this.width),
                fh = Math.floor(this.height),
                fx = Math.floor(this.x-this.width/2),
                fy = Math.floor(this.y-this.height/2);
                
            c.fillStyle = this.color;
            if(this.options.drawStyle == GameKit.RectEnt.drawStyles.DRAW_STATIC) {
                //When Static
                if(!this.image || this.options.drawBoxUnderImage) {
                    c.beginPath()
                    c.rect(fx,fy,fw,fh);
                    c.fill();
                    if(this.options.hasBorder){
                        c.strokeStyle = this.borderColor;
                        c.stroke();
                    }
                    c.closePath();
                }
                if(this.image) {
                    //Does not draw image and box under. Add options?
                    c.drawImage(this.image,fx,fy,fw,fh);
                    if(this.options.imageBorder){
                        c.strokeStyle = this.borderColor;
                        c.strokeRect(fx, fy, fw, fh);
                    }
                }

            } else if(this.options.drawStyle == GameKit.RectEnt.drawStyles.DRAW_ROTATED) {
                //I could also get the positions of the corners when rotated and path them out individually
                //When Rotated
                var fhw = Math.floor(this.width/2),
                    fhh = Math.floor(this.height/2);
                c.save();
                c.translate(this.x,this.y);
                c.rotate(this.rotation.rad);
                if(!this.image || this.options.drawBoxUnderImage) {
                    c.beginPath()
                    c.rect(-fhw, -fhh, fw, fh);
                    c.fill();
                    if(this.options.hasBorder) {
                        c.strokeStyle = this.borderColor;
                        c.stroke();
                    }
                    c.closePath();
                }
                if(this.image) {
                    c.drawImage(this.image,-fhw,-fhh,fw,fh);
                    if(this.options.imageBorder){
                        c.strokeStyle = this.borderColor;
                        c.strokeRect(-fhw, -fhh, fw, fh);
                    }
                }
                c.restore();
            }
        }
        /**Gets the corners for when options.drawStyle is DRAW_ROTATED */
        #getRotatedCorners() {
            var Cx = this.x, Cy = this.y;
            var Ox=this.width/2, Oy=this.height/2,
                cos = Math.cos(this.rotation.rad), sin = Math.sin(this.rotation.rad);
            return [
                GameKit.pos(Cx+( Ox*cos)-( Oy*sin),Cy+( Ox*sin)+( Oy*cos)),
                GameKit.pos(Cx+( Ox*cos)-(-Oy*sin),Cy+( Ox*sin)+(-Oy*cos)),
                GameKit.pos(Cx+(-Ox*cos)-(-Oy*sin),Cy+(-Ox*sin)+(-Oy*cos)),
                GameKit.pos(Cx+(-Ox*cos)-( Oy*sin),Cy+(-Ox*sin)+( Oy*cos))
            ]
            //return ret;
        }
        /**Gets the corners for when options.drawStyle is DRAW_STATIC */
        #getStaticCorners() {
            return [
                GameKit.pos(this.x-this.width/2,this.y+this.height/2),GameKit.pos(this.x-this.width/2,this.y-this.height/2),
                GameKit.pos(this.x+this.width/2,this.y-this.height/2),GameKit.pos(this.x+this.width/2,this.y+this.height/2),
            ];
        }
        getCorners(){
            return (this.options.drawStyle==GameKit.RectEnt.drawStyles.DRAW_STATIC) ? this.#getStaticCorners() : this.#getRotatedCorners();
        }
        /**
         * Helper function to determine whether there is an intersection between the two polygons described
         * by the lists of vertices. Uses the Separating Axis Theorem
         * Stolen from stack overflow
         *
         * @param {RectEnt | {x:number,y:number}[]} other  The other thing to check the intersection with
         * @param isCoords if the passed in object is already the coords of the object
         * @return {boolean} if there is any intersection between the 2 polygons, false otherwise
         */
        #rotationalIntersects (other, isCoords = false) {
            // @ts-ignore
            if(!this.activeCollision || ((!isCoords) && !other.activeCollision))
                return false;
            var a = this.#getRotatedCorners();
            // @ts-ignore
            var b = (isCoords) ? other : other.#getRotatedCorners();
            var polygons = [a,b];
            var minA, maxA, projected, i, i1, j, minB, maxB;
            for (i = 0; i < polygons.length; i++) {
                var polygon = polygons[i];
                for (i1 = 0; i1 < polygon.length; i1++) {
                    var i2 = (i1 + 1) % polygon.length;
                    var p1 = polygon[i1];
                    var p2 = polygon[i2];
                    var normal = { x: p2.y - p1.y, y: p1.x - p2.x };
                    minA = maxA = undefined;
                    for (j = 0; j < a.length; j++) {
                        projected = normal.x * a[j].x + normal.y * a[j].y;
                        if (minA === undefined|| projected < minA)
                            minA = projected;
                        if (maxA === undefined || projected > maxA)
                            maxA = projected;
                    }
                    minB = maxB = undefined;
                    for (j = 0; j < b.length; j++) {
                        projected = normal.x * b[j].x + normal.y * b[j].y;
                        if (minB===undefined||projected<minB)
                            minB=projected;
                        if (maxB===undefined||projected>maxB)
                            maxB=projected;
                    }
                    if (maxA<minB||maxB<minA)
                        return false;
                }
            }
            return true;
        }
        /**Collision detection between entities */
        collides(other){
            if(!this.activeCollision || !other.activeCollision) 
                return false;
            if (this.options.drawStyle === GameKit.RectEnt.drawStyles.DRAW_STATIC) {
                if(other.options.drawStyle === GameKit.RectEnt.drawStyles.DRAW_STATIC) {
                    //Faster way of collision iff both are upright squares
                    return !(((this.y+this.height/2)<(other.y-other.height/2))||
                        (this.y-this.height/2>(other.y+other.height/2))||
                        ((this.x+this.width/2)<other.x-other.width/2)||
                        (this.x-this.width/2>(other.x+other.width/2)))
                }
                return other.#rotationalIntersects(this.#getStaticCorners(),true);
                
            }
            if(other.options.drawStyle === GameKit.RectEnt.drawStyles.DRAW_STATIC) {
                return this.#rotationalIntersects(other.#getStaticCorners(), true);
            }
            return this.#rotationalIntersects(other);
            
        }
        /**@returns {'none'|'right'|'left'|'bottom'|'top'} The side that the ents collide on @deprecated*/
        collisionSide(other){
            if(!this.activeCollision || !other.activeCollision)
                return 'none';
            if(this.options.drawStyle == GameKit.RectEnt.drawStyles.DRAW_ROTATED || 
                    other.options.drawStyle == GameKit.RectEnt.drawStyles.DRAW_ROTATED) {
                console.warn("Using RectEnt.collisionSide() doesn't work with the draw style DRAW_ROTATED.\n"+
                            "This will just give the side as if it were not rotated")
            }
            var dx=(this.x+this.width/2)-(other.x+other.width/2);
            var dy=(this.y+this.height/2)-(other.y+other.height/2);
            var width=(this.width+other.width)/2;
            var height=(this.height+other.height)/2;
            var crossWidth=width*dy;
            var crossHeight=height*dx;
            var collision='none';
                
            if(Math.abs(dx)<=width && Math.abs(dy)<=height){
                if(crossWidth>crossHeight)
                    collision=(crossWidth>(-crossHeight))?'bottom':'left';
                else
                    collision=(crossWidth>-(crossHeight))?'right':'top';
            }
            // @ts-ignore
            return (collision);
        }
        /**Just sets x and y in the same spot */
        setPosition(x,y){
            this.x=x;
            this.y=y;
            return this;
        }
        /**Sets the rotation to make the front of the entity face the point specified */
        pointAt(x, y){
            this.rotation.rad = Math.PI/2 + Math.atan2(y - this.y, x - this.x) - Math.PI/2;
            return this;
        }
        hide(){
            this.options.hidden = true;
            return this;
        }
        show(){
            this.options.hidden = false;
            return this;
        }
        /**Adds the entity to the GameKit entity array for drawing */
        track() {
            //If not already being tracked
            if(!this.beingTracked){
                GameKit.entities.push(this);
                this.beingTracked = true;
            }
            return this;
        }
        /**@returns {RectEnt} */
        clone(){
            return JSON.parse(JSON.stringify(this));
        }
        /**
         * Moves the specified distance in the direction they are facing
         *  @param {number} dist 
         */
        moveForward(dist) {
            let c = (GameKit.options.renderIndependent && false)?GameKit.deltaTime:1
            this.x+= dist*Math.cos(this.rotation.rad) * c;
            this.y+= dist*Math.sin(this.rotation.rad) * c;
        }
        /**Moves the specified distance in the specified direction. Defaults to degrees */
        moveInDirection(dist, newDir, isRad = false) {
            //This allows getting just the rad without needing to check anything
            let a = new GameKit.Angle(newDir, isRad).rad;
            this.x+=dist*Math.cos(a);
            this.y+=dist*Math.sin(a);
        }
        onTick(){}
        onRemove(){}
        /**
         * This affects entity collision detection 
         * @readonly @enum {number} 
         */
        static drawStyles = {
            /**Entity angle affects how it gets drawn */
            DRAW_ROTATED:0,
            /**Entity is drawn upright no matter what angle it faces */
            DRAW_STATIC:1
        } 
        /**Stages the ent to be removed next pass through */
        remove(){
            this.toRemove = true;
            return this;
        }
        get position(){
            return {x:this.x, y:this.y}
        }
        /**You can quick set position using any object with an x and y property */
        set position(obj){
            if(!obj['x'] || !obj['y']){
                return;
            }
            this.x = obj.x;
            this.y = obj.y;
        }
        /**Combine with GameKit.mouse.down to see if something has been clicked on. Also counts for if the collisions are active on it */
        hasMouseHover() {
            //return this.containsPoint(GameKit.vec2().from(GameKit.mouse).scale(1/GameKit.camera.zoom))//GameKit.mouse.collides(this)
            return this.containsPoint(GameKit.mouse);
        }
        toString(){
            return `R[x:${this.x},y:${this.y},w:${this.width},h:${this.height}]`
        }
        /**@param {number|{x:number,y:number}} x @param {number} [y] */
        containsPoint(x ={x:0,y:0},y){
            if(typeof x == 'number'){
                x = {x:x,y:y}
            }
            
            function isLeft(P0,P1,P2){
                return -( (P1.x - P0.x) * (P2.y - P0.y) - (P2.x - P0.x) * (P1.y - P0.y) );
            }
            let pts = this.getCorners()
            return (isLeft(pts[0], pts[1], x) > 0 && isLeft(pts[1], pts[2], x) > 0 && isLeft(pts[2], pts[3], x) > 0 && isLeft(pts[3], pts[0], x) > 0);
        }
        get x(){
            return this.#x;
        }
        set x(val){
            this.#x = val;
        }
        get y(){
            return this.#y;
        }
        set y(val){
            this.#y = val;
        }

    }
    /**@type {(GameKit.RectEnt)[]} */
    GameKit.entities=[];
    /** Paricles meant to give some visual pop. Can define changes over time */
    GameKit.Particle = class Particle extends GameKit.RectEnt {
        constructor(x,y,width,height,color='white', lifeSpan = 20,borderColor=GameKit.options.defaultBorderColor){
            super(x, y, width, height, color, borderColor);
            this.lifeCounter = new GameKit.Counter(lifeSpan * GameKit.deltaTime,()=>this.toRemove=true);
            //Don't add 2 copies
            if(!GameKit.options.autoTrackNewEnts)
                this.track();
            this.drawLayer = 2;
        }
        get lifeSpan() {
            return this.lifeCounter.max;
        }
        set lifeSpan(val) {
            this.lifeCounter.max = val;
        }
        /**
         * 
         * @param {object} [obj] 
         * @param {number} [obj.x] @param {number} [obj.y] @param {number} [obj.height] @param {number} [obj.width] 
         * @param {number} [obj.rad] @param {number} [obj.deg] @param {number} [obj.forward]
         */
        setChange({x, y, width, height, rad, deg, forward}){
            if(x)
                this.change.x = x;
            if(y)  
                this.change.y = y;
            if(width)
                this.change.width = width;
            if(height)
                this.change.height = height;
            if(rad)
                this.change.rotation.rad = rad;
            if(deg)
                this.change.rotation.deg = deg;
            if(forward)
                this.change.forward = forward;
            return this;
        }
        /**Picks one random color and assigns it to the particle */
        colorChoice(...colors){
            this.color = GameKit.Rnd.arrayElement(colors);
            return this;
        }
        /**Sets the inital rotation to a number between start and end */
        startRotation(start, end, isRad=false) {
            this.rotation.deg = new GameKit.Angle( Math.random() * (end - start) + start, isRad).deg;
            return this;
        }
        /** Controls the current change per tick */
        change = {
            height:0, width:0, forward:0, x:0, y:0, rotation:new GameKit.Angle()
        }
        /**Draws a basic rectangle with rotation, based upon options.drawStyle */
        draw(){
            //Shouldn't have this in the draw function, but they're particles
            //If they're not being drawn then does it really matter?
            this.onTickChanges()
            super.draw();
        }
        /**
         * Handles all movement changes per tick on the particles
         */
        onTickChanges(){

            /////////////////////////////////////////////////////////
            this.width+=this.change.width * GameKit.deltaTime;
            this.height+=this.change.height * GameKit.deltaTime;
            // @TODO: Should this be divided by it's lifespan??
            this.rotation.rad+=this.change.rotation.rad * GameKit.deltaTime;
            this.x += this.change.x * GameKit.deltaTime;
            this.y += this.change.y * GameKit.deltaTime;
            if(this.change.forward != 0)
                this.moveForward(this.change.forward * GameKit.deltaTime);
            this.lifeCounter.count(GameKit.deltaTime);
        }
        shrink(){
            this.change.width = -this.width / this.lifeSpan;
            this.change.height = -this.height / this.lifeSpan;
            return this;
        }
        grow(){
            this.change.width = this.width / this.lifeSpan;
            this.change.height = this.height / this.lifeSpan;
            this.width = 0;
            this.height = 0;
            return this;
        }
    }
    GameKit.ParticleSystem = class ParticleSystem {
        /**
         * Class for bulk distribution of particles
         * @param {number} x @param {number} y @param {number} particlesToSpawn How many particles until it burns out
         * @param {number} ticksPerParticle Ticks between each particle spawn
         */
        constructor(x, y, particlesToSpawn, ticksPerParticle, doNotAdd=false) {
            this.initialParticleCount = particlesToSpawn; //
            this.particlesToSpawn = particlesToSpawn; //
            this.ticksPerParticle = ticksPerParticle; //
            /**@type {Array.<function():GameKit.Particle>} */
            this.particleChoices = []; //
            /**The engine behind spawning all the particles on time */
            this.particleSpawnCounter = new GameKit.Counter(ticksPerParticle, ()=>{ //Arrow function here allows this to be the System
                if(this.parent != undefined) {
                    for(let i=0; i<this.particlesPerSpawn;i++)
                        this.spawnParticle().setPosition(this.parent.x+this.parentOffsetX, this.parent.y+this.parentOffsetY)
                } else 
                    for(let i =0; i <this.particlesPerSpawn;i++)
                        this.spawnParticle().setPosition(this.x,this.y);
                if(--this.particlesToSpawn == 0) {
                    this.active=false;
                    if(this.doRemoveWhenDone){
                        this.toRemove = true;
                    }
                }
                
            });
            this.particlesPerSpawn = 1; //
            this.active = false;
            this.x = x; //
            this.y = y; //
            /**@type {{x:number,y:number}} */
            this.parent = undefined;
            this.parentOffsetX = 0;
            this.parentOffsetY = 0;
            this.toRemove = false;
            if(!doNotAdd)
                GameKit.particleSystems.push(this);
            this.particlesSpawned = 0; //
            this.doRemoveWhenDone = false; //
        }
        removeWhenDone(){
            this.doRemoveWhenDone = true;
            return this;
        }
        setParticlesPerSpawn(pps){
            this.particlesPerSpawn = pps;
            return this;
        }
        /**Change between each particle */
        pattern = {
            /**Tells if it chooses the particles in order [true] or randomly [false]. */
            particleChoice:false,
            /**How much change happens per particle */
            rotation:new GameKit.Angle(),
            /**@type {string[]} */
            colors:[],
            /**@type {number[]} The size multiplier to apply to a particle. 1 means normal size */
            size:[]
        }
        setPattern({particleChoice,deg,rad,colors,size}){
            if(particleChoice){
                this.pattern.particleChoice = particleChoice;
            }
            if(deg){
                this.pattern.rotation.deg= deg;
            }
            if(rad){
                this.pattern.rotation.rad = rad;
            }
            if(colors){
                this.pattern.colors = colors;
            }
            if(size){
                this.pattern.size = size;
            }
            return this;
        }
        spawnParticle(){
            /**@type {GameKit.Particle} */
            let p;
            if(this.pattern.particleChoice){
                p = this.particleChoices[(this.particlesSpawned%this.particleChoices.length)]()
            } else {
                p = GameKit.Rnd.arrayElement(this.particleChoices)();
            }
            if(this.pattern.colors.length > 0) {
                p.color = this.pattern.colors[(this.particlesSpawned%this.pattern.colors.length)];
            }
            if(this.pattern.size.length > 0) {
                let d = this.pattern.size[(this.particlesSpawned%this.pattern.size.length)]
                p.height *= d;
                p.width *= d;
            }
            p.rotation.rad += (this.pattern.rotation.rad * this.particlesSpawned);
            this.particlesSpawned++;
            return p;
        }
        /**
         * Sets the parent which the system will follow. Must have an x and y property. 
         * Will reset it's position to be near it with the specified offset every tick
         * @param {{x:number,y:number}} ent
         */
        setParent(ent, offsetX = 0, offsetY = 0) {
            this.parent = ent;
            this.parentOffsetX = offsetX;
            this.parentOffsetY = offsetY;
            return this;
        }
        /**Sets the system to never end */
        forever(){
            this.particlesToSpawn = Infinity;
            this.active = true;
            return this;
        }
        /**@param {(function():GameKit.Particle)[]} particles */
        addParticleType(...particles){
            this.particleChoices.push(...particles)
            return this;
        }
        setPosition(x, y){
            this.x = x;
            this.y = y;
            return this;
        }
        start() {
            this.particlesSpawned = 0;
            this.particlesToSpawn = this.initialParticleCount;
            this.active = true;
            return this;
        }
        stop() {
            this.active = false;
        }
        onTick(){
            if(this.active && this.particlesToSpawn > 0) {
                this.particleSpawnCounter.count(GameKit.deltaTime);
            }
        }
        onRemove(){}
        /**Copies without setting parent */
        clone(){
            var ns = new GameKit.ParticleSystem(this.x,this.y,this.particlesToSpawn,this.ticksPerParticle)
            ns.initialParticleCount = this.initialParticleCount;
            ns.pattern.colors = this.pattern.colors.slice();
            ns.pattern.particleChoice = this.pattern.particleChoice;
            ns.pattern.rotation.rad = this.pattern.rotation.rad
            ns.pattern.size = this.pattern.size.slice()
            ns.particleChoices = this.particleChoices.slice()
            ns.particlesPerSpawn = this.particlesPerSpawn;
            ns.doRemoveWhenDone = this.doRemoveWhenDone;
        }
    }
    /**@type {GameKit.ParticleSystem[]} */
    GameKit.particleSystems = [];
    /**
     * Returns a simple position object 
     * @param {number} x 
     * @param {number} y 
     */
    GameKit.pos = function(x,y){return {x:x,y:y}}
    /**Simple x and y obj with dot and move functionality */
    GameKit.vec2=function(/** @type {number} */ x,/** @type {number} */ y) {
        return {
            x:x,
            y:y,
            /**@param {{x:number,y:number}} other @returns {number} dot product of the two */
            dot(other) {
                return this.x * other.x + this.y * other.y;
            },
            /**@param {number} x @param {number} y */
            set(x, y){
                this.x = x;
                this.y = y;
                return this;
            },
            /**@param {{x:number,y:number}} point */
            from(point){
                this.x = point.x;
                this.y = point.y;
                return this;
            },
            /**@param {{x:number,y:number}|number} other @param {number} [y] Adds to this vec2's values */
            add(other=0,y=0){
                if(typeof other === 'object'){
                    this.x += other.x;
                    this.y += other.y;
                } else {
                    this.x += other;
                    this.y += y;
                }
                return this;
            },
            /**Flips this vec2's x and y */
            flip(){
                this.x = -this.x;
                this.y = -this.y;
                return this;
            },
            /**Scales this instance of vec2 */
            scale(scalar = 1){
                this.x *= scalar;
                this.y *= scalar;
                return this;
            },
            /**Gets a new instance of vec2 that is scaled */
            scaled(scalar = 1){
                return GameKit.vec2(this.x * scalar, this.y * scalar);
            },
            length(){
                return Math.hypot(this.x,this.y);
            },
            /**@param {number} val Scales the current vec2 to the specified len */
            setLength(val){
                if(this.length() !== 0)
                    this.scale(val/this.length());
                return this;
            },
            /**@param {{x:number,y:number}} other returns a new vec2 of the projection */
            projOnto(other){
                var s = (this.dot(other)/(other.x*other.x+other.y*other.y));
                return GameKit.vec2(other.x * s, other.y * s);
            },
            copy(){
                return GameKit.vec2(this.x,this.y);
            },
            /**Converts the vector into an angle on GameKit's basis */
            toAngle(){
                return new GameKit.Angle( - Math.atan2(this.x,this.y) + Math.PI/2,true);
            },
            toString(){
                return `{${this.x}, ${this.y}}`
            },
            normalize(){
                if(this.length() == 0)
                    return this;
                return this.scale(1/this.length())
            },
            normalized() {
                if(this.length() == 0)
                    return this.copy();
                return this.scaled(1/this.length())
            }
        }
    }
    /**Useful for seeing if there was a collision between a moving point and a solid line */
    GameKit.Line = class Line {
        /**
         * Line class for simple extra math
         * @param {number} x1 @param {number} y1 
         * @param {number} x2 @param {number} y2 
         * @param {string} color 
         */
        constructor(x1,y1,x2,y2, color = GameKit.options.defaultBorderColor){
            this.p1=GameKit.pos(x1,y1);
            this.p2=GameKit.pos(x2,y2);
            this.color = color;
        }
        get x1(){return this.p1.x}
        set x1(val){this.p1.x = val}

        get x2(){return this.p2.x}
        set x2(val){this.p2.x = val}

        get y1(){return this.p1.y}
        set y1(val){this.p1.y = val}

        get y2(){return this.p2.y}
        set y2(val){this.p2.y = val}

        get midpoint(){
            return GameKit.pos((this.p1.x+this.p2.x)/2,(this.p1.y+this.p2.y)/2);
        }
        get length(){
            return Math.hypot(this.x1+this.x2,this.y1+this.y2);
        }
        draw() {
            GameKit.ctx.strokeStyle = this.color;
            GameKit.ctx.beginPath();
            GameKit.ctx.moveTo(Math.floor(this.p1.x), Math.floor(this.p1.y));
            GameKit.ctx.lineTo(Math.floor(this.p2.x), Math.floor(this.p2.y));
            GameKit.ctx.stroke();
            GameKit.ctx.closePath();
        }
        forceDraw(duration = 0){
            let count = 0;
            GameKit.postDrawFunctions.push(ctx=>{
                this.draw();
                return ((++count) == duration);
            })
        }
        /**
         * @param {GameKit.RectEnt} r
         */
        static fromRect(r){
            var c = r.getCorners();
            return [
                new Line(c[0].x,c[0].y,c[1].x,c[1].y),
                new Line(c[1].x,c[1].y,c[2].x,c[2].y),
                new Line(c[2].x,c[2].y,c[3].x,c[3].y),
                new Line(c[3].x,c[3].y,c[0].x,c[0].y)
            ];
        }
        /**
         * @param {{ x: any; y: any; }} p Point 1 of line
         * @param {{ x: any; y: any; }} q Point 2 of line
         * @param {{ x: any; y: any; }} r The point to check
         */
        static pointOnSegment(p,q,r) {
            return (q.x<=Math.max(p.x,r.x) && q.x>=Math.max(p.x,r.x)&&q.y<=Math.max(p.y,r.y) && q.y>=Math.max(p.y,r.y));
        }
        /**
         * @param {{ y: number; x: number; }} p
         * @param {{ y: number; x: number; }} q
         * @param {{ x: number; y: number; }} r
         */
        static #orientation(p,q,r){
            let val = (q.y-p.y) * (r.x - q.x) - (q.x - p.x) * (r.y-q.y);
            if(val===0) return 0;
            return (val>0)?1:2;
        }

        /**
         * @param {{ x: number; y: number; }} p1
         * @param {{ x: number; y: number; }} q1
         * @param {{ x: number; y: number; }} [p2]
         * @param {{ x: number; y: number; }} [q2]
         */
        static doIntersect(p1,q1,p2,q2){
            var o1=Line.#orientation(p1,q1,p2),
                o2=Line.#orientation(p1,q1,q2),
                o3=Line.#orientation(p2,q2,p1),
                o4=Line.#orientation(p2,q2,q1);
            if(o1!==o2&&o3!==o4) return true;
            if(o1===0&&Line.pointOnSegment(p1,p2,q1)) return true;
            if(o2===0&&Line.pointOnSegment(p1,q2,q1)) return true;
            if(o3===0&&Line.pointOnSegment(p2,p1,q2)) return true;
            if(o4===0&&Line.pointOnSegment(p2,q1,q2)) return true;
            return false;
        }
        /**@param {Line} other */
        intersects(other){
            return Line.doIntersect(this.p1,this.p2,other.p1,other.p2);
        }
        /**@param {GameKit.RectEnt} rect Does not cover if the line is contained within the rect*/
        collidesRect(rect){
            var ls = Line.fromRect(rect);
            for(let i=0;i<ls.length;i++){
                if(this.intersects(ls[i])){
                    return true;
                }
            }
            return false;
        }
        /**@param {{x:number,y:number}|number} x */
        hasPoint(x,y){
            if(typeof x == 'number'){
                x = {x:x,y:y}
            }
            return Line.pointOnSegment(this.p1,this.p2,x);
        }
    }
    /**Class for doing something after so many times, repeatedly */
    GameKit.Counter = class Counter {
        #max;
        #cur;
        /**
         * A class for counting times a thing happens and running a function after that
         * @param {number} max The max number of times the counter can count till it does onComplete
         * @param {function():void} onComplete The function to run once the counter is complete
         */
        constructor(max,onComplete=()=>{}){
            if(max<=0)
                throw new RangeError('Max count must be positive and greater than 0');
            this.#max=max;
            this.#cur=0;
            this.onComplete=onComplete;
        }
        count(n=1){
            this.cur+=n;
            return this;
        }
        reset(){
            this.cur=0;
            return this;
        }
        toString(){
            return this.cur+'/'+this.max;
        }
        set cur(val){
            this.#cur=val;
            while(this.#cur>=this.#max){
                this.#cur-=this.#max;
                this.onComplete();
            }
        }
        set max(val){
            if(val<=0)
                throw new RangeError('Max count must be poitive and greater than 0');
            this.#max=val;
            this.cur=this.cur;
        }
        get cur(){return this.#cur;}
        get max(){return this.#max;}
    }
    /**Randomizers for utility */
    GameKit.Rnd={
        /**@returns {string} Hex value from 000000 to ffffff preceded by a # */
        color:()=>'#'+('000000'+Math.floor(Math.random()*16581375).toString(16)).slice(-6),
        /**@returns {number} a number from [0-2pi) */
        rad:()=>Math.random()*2*Math.PI,
        /**@returns {number} a number from [0-360) */
        deg:()=>Math.floor(Math.random()*360),
        /**@returns {boolean} true with a chance of 1/n if d not defined and n/d otherwise. 1/2 chance if nothing passed in */
        chance:(n=2,d)=>(d===undefined)?GameKit.Rnd.chance(1,n):Math.floor(Math.random()*d)<n,
        /**@returns {number} a number between the specified numbers from [start, end) */
        intRange:(start,end)=>Math.floor(Math.random()*(Math.abs(end-start)))+Math.min(start,end),
        /**@returns a random object from an array */
        arrayElement:(arr)=>(arr.length == 0)? undefined : arr[Math.floor(Math.random()*arr.length)],
        /**@returns {number} an int from [0, max) */
        intTo:(max)=>Math.floor(Math.random()*max),
        /**@returns {number} an int from [0, max) */
        numTo:(max)=>Math.random()*max,
        numRange:(min,max)=>min + Math.random()*(max-min),
        /**@returns {number[]} an array of numbers shuffled from [start, end) */
        intArrNoRepeat(start,end){
            if(end<start){
                var t=start;
                start=end;
                end=t;
            }
            var nums=[],ret=[];
            for(let j=0;j<(end-start);j++)
                nums.push(start+j);
            while(nums.length>0)
                ret.push(nums.splice(GameKit.Rnd.intTo(nums.length),1)[0]);
            return ret;
        }
    },
    /**Simply attatches an event listener to the canvas */
    GameKit.eventHandle = function(type, handler) {
        GameKit.canvas.addEventListener(type, handler);
    }
    /**Tracks the center of the camera */
    GameKit.camera = (function(){
        //Doing it this way lets me keep the actual coords localized and unaccecible
        var _x = 0;
        var _y = 0;
        var _zoom = 1;
        return {    
            get x(){return _x;},
            set x(val){
                GameKit.mouse.x += (val - _x)// / _zoom;
                _x = val;
            },
            get y(){return _y;},
            set y(val){
                GameKit.mouse.y += (val - _y)// / _zoom;
                _y = val;
            },
            /**@param {{x:number,y:number}} obj */
            set position(obj){
                this.x = obj.x;
                this.y = obj.y;
            },
            get position(){
                return GameKit.pos(_x,_y);
            },
            get zoom(){
                return _zoom;
            },
            set zoom(val){
                //Zoom point should be camera.position
                var scaleChange = val - _zoom;
                var ox = ((GameKit.camera.x/_zoom) * scaleChange);
                var oy = ((GameKit.camera.y/_zoom) * scaleChange);
                //GameKit.mouse.x*=_zoom;
                //GameKit.mouse.y*=_zoom;
                _zoom = val;
                //GameKit.mouse.x/=_zoom;
                //GameKit.mouse.y/=_zoom;

                GameKit.camera.x += ox;
                GameKit.camera.y += oy;
            }
        }
    })();
    /**Takes an absolute position and converts it to a position relative to the camera based on the top left corner */
    GameKit.relativePositionToCamera = function(x,y){
        return GameKit.vec2(GameKit.canvas.width/2 - GameKit.camera.x + x, GameKit.canvas.height/2 - GameKit.camera.y + y);
    }
    /**Takes a relative position and makes it into an absolute. Think mouse or UI */
    GameKit.localToActual = function(x,y){
        let scalar = 1//1/GameKit.camera.zoom;
        return GameKit.vec2(
            (x - GameKit.canvas.width/2 + GameKit.camera.x)*scalar,
            (y - GameKit.canvas.height/2 + GameKit.camera.y)*scalar
        )
    }

    GameKit.renderSlowCanvas = function(){
        this.ctx2.fillStyle = GameKit.options.backgroundColor;
        this.ctx2.fillRect(0, 0, GameKit.canvas.width, GameKit.canvas.height);

        var xOff = Math.floor((GameKit.canvas.width/2-GameKit.camera.x));
        var yOff = Math.floor((GameKit.canvas.height/2-GameKit
            .camera.y));
        
        let zoom = GameKit.camera.zoom;
        
        //Setup
        this.ctx2.translate(xOff,yOff);
        if(zoom != 1){
            this.ctx2.scale(zoom,zoom);
            //this.ctx.translate(Math.floor(tx),Math.floor(ty))
        }
        GameKit.entities
            .filter(e=>e.slowRender)
            .sort((a,b)=>a.drawLayer - b.drawLayer)
            .forEach(e=>e.draw());
        //Reset
        if(zoom != 1){
            this.ctx2.scale(1/zoom,1/zoom);

        }
        this.ctx2.translate(-xOff,-yOff);
    }
    /** Runs the game loop and entity movement @TODO: OPTIMIZE ME */
    GameKit.render=function(){
        var zoom = GameKit.camera.zoom;
        //this.ctx.fillStyle = GameKit.options.backgroundColor;
        this.ctx.fillRect(0, 0, GameKit.canvas.width, GameKit.canvas.height);
        //Always draw the slowCanvas after clearing it
        if(GameKit.forceRenderSlowCanvas){
            GameKit.renderSlowCanvas();
            GameKit.forceRenderSlowCanvas=false;
        }
        GameKit.ctx.drawImage(GameKit.slowCanvas, 0, 0, GameKit.canvas.width, GameKit.canvas.height)

        var xOff = Math.floor((GameKit.canvas.width/2-GameKit.camera.x));
        var yOff = Math.floor((GameKit.canvas.height/2-GameKit.camera.y));

        this.ctx.translate(xOff,yOff);
        if(zoom != 1){
            this.ctx.scale(zoom,zoom);
            //this.ctx.translate(Math.floor(tx),Math.floor(ty))
        }
        for(let i=0;i<this.preDrawFunctions.length;i++){
            if(this.preDrawFunctions[i](this.ctx)){
                this.preDrawFunctions.splice(i--,1)
                continue;
            }
        }
        //Sorts by drawing layer so it draws in the correct order
        this.entities.sort((a,b)=>a.drawLayer - b.drawLayer);
        for(let i=0;i<this.entities.length;i++) {
            //Entity removal
            if(this.entities[i].toRemove) {
                //Set to not tracking
                this.entities[i].beingTracked = false;
                this.entities.splice(i--,1)[0].onRemove();
                continue;
            }
            this.entities[i].onTick();
            this.entities[i].move();
            //Slows down movement to allow better numbers I guess?
            if(!this.entities[i].slowRender)
                this.entities[i].draw();
        }
        //These will never be slow rendered
        for(let i=0;i<this.particleSystems.length;i++){
            this.particleSystems[i].onTick();
            if(this.particleSystems[i].toRemove){
                this.particleSystems.splice(i--,1)[0].onRemove();
                continue;
            }
        }
        for(let i=0;i<this.postDrawFunctions.length;i++){
            if(this.postDrawFunctions[i](this.ctx)){
                this.postDrawFunctions.splice(i--,1)
                continue;
            }
        }
        

        if(zoom != 1){
            this.ctx.scale(1/zoom,1/zoom);
        }
        this.ctx.translate(-xOff,-yOff);


        for(let i = 0; i < this.UI.components.length;i++){
            this.UI.components[i].draw()
        }
        this.mouse.draw();
        if(GameKit.ticks % 250 == 0){
            GameKit.renderSlowCanvas()
        }
    }
    /**Handles all keyboard inputs */
    GameKit.Controls= new class Controls {
        /** 
         * This holds all inputs currently being watched. They'll just have boolean vals of if they are pressed 
         * There are certain shortcuts like up, down, left, right, and space
         */
        pressed={}
        /**
         * This tracks what has been unpressed for single action button press functions
         * @type {Object.<string,{unpressed:boolean,pressFunc:(()=>void)|null, unpressFunc:(()=>void)|null}>}
         */
        #keyEvents={}
        anyPressed() {
            for(let key in this.pressed){
                if(this.pressed[key])
                    return true;
            }
            return false;
        }
        /**Adds an individual key to track 
         * @param {string} keyName
         */
        trackKey(keyName){
            if(keyName in this.#shorthands){
                this.trackKeys(...this.#shorthands[keyName])
                return;
            }
            this.pressed[keyName]=false;
        }
        /**
         * Allows tracking more than one key quickly
         * @param {string[]} keys
         */
        trackKeys(...keys){
            keys.forEach(k=>{
                this.trackKey(k);
            });
        }
        /**Used for alternate names to the default button names */
        #pairs={
            ArrowUp:'up',
            ArrowLeft:'left',
            ArrowRight:'right',
            ArrowDown:'down',
            Shift:'shift',
            ' ':'space',
            Enter:"enter",
            Delete:"delete",
            Control:"control",
            Backspace:"backspace"
        }
        #shorthands={
            arrows:["up","down","left","right"],
            wasd:["w",'a','s','d'],
            WASD:["W","A","S","D"],
            numbers:["1","2","3","4","5","6","7","8","9","0"],
            shiftNumbers:["!","@","#","$","%","^","&","*","(",")"],
            "A-Z":((x=[])=>{
                for(let i=0;i<26;i++)
                    x.push(String.fromCharCode(65+i));
                return x;
            })(),
            "a-z":((x=[])=>{
                for(let i=0;i<26;i++)
                    x.push(String.fromCharCode(97+i));
                return x;
            })(),
            letters:["a-z","A-Z"]
        }
        keyupEvent(e){
            if(!GameKit.options.trackControls){
                return;
            }
            let key = (GameKit.options.caseInsensitive && e.key.length == 1)?e.key.toLowerCase():e.key
            
            if(this.pressed[key] != undefined) {
                this.pressed[key] = false;
            }
            else if(this.pressed[this.#pairs[key]] != undefined){
                this.pressed[this.#pairs[key]] = false;
            }
        }
        keydownEvent(e){
            if(!GameKit.options.trackControls){
                return
            }
            let key = (GameKit.options.caseInsensitive && e.key.length == 1)?e.key.toLowerCase():e.key

            if(this.pressed[key] != undefined) {
                this.pressed[key] = true;
            } else if(this.pressed[this.#pairs[key]] != undefined) {
                this.pressed[this.#pairs[key]] = true;
            } else if(GameKit.options.autoTrackKeys) {
                //Only tracks new keys if it is enabled. Maybe useful for rebindings? Or just being lazy
                if(this.#pairs[key] != undefined) {
                    this.trackKey(this.#pairs[key]);
                } else {
                    this.trackKey(key);
                }
            }
    
        }
        _handleKeys(){
            for(let key in this.#keyEvents){
                if(this.pressed[key] && this.#keyEvents[key].unpressed){
                    if("pressFunc" in this.#keyEvents[key] && this.#keyEvents[key].pressFunc !== null ){
                        this.#keyEvents[key].pressFunc();
                    }
                    this.#keyEvents[key].unpressed = false;
                } else if(!this.pressed[key] && !this.#keyEvents[key].unpressed){
                    if("unpressFunc" in this.#keyEvents[key] && this.#keyEvents[key].unpressFunc !== null) {
                        this.#keyEvents[key].unpressFunc();
                    }
                    this.#keyEvents[key].unpressed = true;
                }
            }
        }
        /**
         * Adds an event that will run on clicking a key onces, then
         * waits for you to unpress to be able to trigger again
         * @param {string} key 
         * @param {()=>void} event 
         */
        addPressOnceEvent(key,event){
            if(!this.#keyEvents[key])
                this.#keyEvents[key]={unpressed:true,pressFunc:event,unpressFunc:null}
            else
                this.#keyEvents[key].pressFunc = event;
        }
        /**
         * Adds an event that will run on unpressing a key onces, then
         * waits for you to unpress to be able to trigger again
         * @param {string} key 
         * @param {()=>void} event 
         */
        addUnpressOnceEvent(key, event){
            if(!this.#keyEvents[key])
                this.#keyEvents[key]={unpressed:true,unpressFunc:event,pressFunc:null}
            else
                this.#keyEvents[key].unpressFunc = event;
        }

    }
    /**Handles all things relating to the mouse. Is an extension of RectEnt to allow easy collision checking */
    GameKit.mouse = new class Mouse extends GameKit.RectEnt{
        /**@type {function(number,number,CanvasRenderingContext2D):void} */
        #drawFunction;
        constructor(){
            super(-1,-1,3,3,'transparent','transparent');
            this.down = false;
            this.options.hidden=true;
            
        }
        /**@param {function(number,number,CanvasRenderingContext2D):void} func */
        setDrawFunction(func, hideCursor = true){
            this.#drawFunction = func;
            if(func == undefined) {
                GameKit.canvas.style.cursor = 'initial'
            } else if(hideCursor) {
                GameKit.canvas.style.cursor = "none";
            } else {
                GameKit.canvas.style.cursor = "initial";
            }
        }
        /**@override so this does not get added to the entity list */
        track(){return this}
        draw(){
            if(this.#drawFunction != undefined){
                var p = GameKit.relativePositionToCamera(this.x,this.y);
                this.#drawFunction(p.x,p.y,GameKit.ctx);
            }
        }
        toString(){
            return `M{${Math.round(this.x*10)/10}, ${Math.round(this.y*10)/10}, ${this.down}}`
        }
        set collisionSize(val){
            this.width = val;
            this.height = val;
        }
        get collisionSize(){
            return this.width;
        }
        /**The proper way to get mouse position due to zooming being difficult */
        pos(){
            return GameKit.pos(this.x / GameKit.camera.zoom, this.y / GameKit.camera.zoom);
        }
    }
    GameKit.ticks = 0;
    /**Handles everything that needs to start */
    GameKit.tick=function() {
        for(let i=0;i<this.onTickFunctions.length;i++){
            if(this.onTickFunctions[i]()){
                this.onTickFunctions.splice(i--,1)
                continue;
            }
        }
        this.render();
        GameKit.Controls._handleKeys();
        GameKit.ticks++;
        if(GameKit.ticks > 100000){
            GameKit.ticks = 0;
        }
    }
    /**General storage for random things */
    GameKit.misc={};
    /**@type {(function():(boolean|void))[]} Functions ran every tick. Return true when it should be removed */
    GameKit.onTickFunctions=[];
    /**@type {(function(CanvasRenderingContext2D):boolean|void)[]} Functions to control things drawn before everything else. Return true to remove */
    GameKit.preDrawFunctions=[];
    /**@type {(function(CanvasRenderingContext2D):boolean|void)[]} Functions to control things drawn after everything else. Return true to remove */
    GameKit.postDrawFunctions=[];
    /**
     * Used to store all image objects in the project. 
     * @example GameKit.images.end // This gets the image at img/end.png (See GameKit.options.defaultImageFileType)
     * GameKit.images['player/idle'] // This would be at img/player/idle.png (GameKit.options.imageDirectory)
     * @type {{[x:string]:HTMLImageElement}}
     */
    GameKit.images={};
    GameKit.loadImages = function(...images){
        images.forEach(src=>{
            GameKit.images[src+GameKit.options.defaultImageFileType] = new Image(this.width,this.height)
            GameKit.images[src+GameKit.options.defaultImageFileType].src = 
                GameKit.options.imageDirectory+src+GameKit.options.defaultImageFileType;
        })
    }
    /**Event ran when you click anywhere. You can now check on entity tick if it has mouse collision instead */
    GameKit.onClickEvent=()=>{};
    /**@param {()=>void} func */
    GameKit.timeTestFunction = function(func){
        var s = performance.now();
        for(let i=0;i<100000000;i++){
            func();
        }
        var e = performance.now();
        return e - s;
    }
    GameKit.timeCompare2 = function(func1,func2){
        var t = 1000000;
        var s = performance.now();
        for(let i = 0; i < t; i++){
            func1();
        }
        var e = performance.now();
        let t1 = e - s;
        s = performance.now();
        for(let i = 0; i < t; i++){
            func2();
        }
        e = performance.now();
        let t2 = e - s;
        return {t1:t1,t2:t2,[`1 faster than 2?`]: (t1 < t2)};
    }
    /**
     * 
     * @param {{x:number,y:number}} pos 
     * @param {GameKit.Angle} dir 
     * @param {number} max 
     */
    GameKit.rayCast = function(pos,dir, max = 1000, ignore,checkFrom = GameKit.entities) {
        //Switch to line based movement;
        var dx = 3*Math.cos(dir.rad);
        var dy = 3*Math.sin(dir.rad);
        //Make a copy so it does not change actual location
        pos = {x:pos.x,y:pos.y}
        //////
        /**@param {{x:number, y:number}} p  @param {GameKit.RectEnt} e*/
        function pointInRotatedRectangle(p, e) {
            var relX = p.x - e.x;
            var relY = p.y - e.y;
            var angle = -e.rotation.rad;
            var angleCos = Math.cos(angle);
            var angleSin = Math.sin(angle);
            var localX = angleCos * relX - angleSin * relY;
            var localY = angleSin * relX + angleCos * relY;
            return localX >= 0 && localX <= e.width && localY >= 0 && localY <= e.height;
        }
        /////
        for(let i = 0; i<max;i++){
            pos.x+=dx;
            pos.y+=dy;
            for(let j=0;j<checkFrom.length;j++){
                if(checkFrom[j] != ignore && pointInRotatedRectangle(pos,checkFrom[j])){
                    return checkFrom[j];
                }
            }
        }
        return undefined;
    }
    GameKit.UI = (function(){

        /**
         * The points that allow you to set position from 
         * @readonly @enum {number}
         */
        let anchorPositions = {
            TOP_LEFT:0,     TOP:1,      TOP_RIGHT:2,
            LEFT:3,         CENTER:4,   RIGHT:5,  
            BOTTOM_LEFT:6,  BOTTOM:7,   BOTTOM_RIGHT:8
        }
        class UIComponent extends GameKit.RectEnt {
            //constructor(widthPercent, heightPercent,color,borderColor, anchor = anchorPositions.CENTER){ 
            constructor(x,y,width,height,color,borderColor){
                super(x,y,width,height,color,borderColor,true);
                this.x = x;
                this.y = y;
                /**@type {UIComponent[]} */
                this.children = [];
                /**@type {UIComponent} */
                this.parent = null;
                this.options.drawStyle = 0;
                /**@type {number} Percentage width, 0-100 */
                this.width;
                /**@type {number} Percentage height, 0-100 */
                this.height;
                /**@type {anchorPositions} */
                this.anchor = anchorPositions.CENTER;
            }
            /**@param {UIComponent[]} kids */
            addChildren(...kids){
                let t = this;
                kids.forEach(k=>{
                    this.children.push(k);
                    k.parent = t;
                });
                return this;
            }
            /**
             * @param {anchorPositions} anchor
             */
            setAnchor(anchor) {
                this.anchor = anchor;
                return this;
            }
            drawSelf(){
                let c = GameKit.ctx;
                let size = this.getTotalSize();
                let topLeft = this.getTopLeftCorner();
                c.fillStyle = this.color;
                c.fillRect(topLeft.x, topLeft.y, size.width,size.height);
                if(this.options.hasBorder){
                    c.strokeStyle = this.borderColor;
                    c.strokeRect(topLeft.x, topLeft.y,size.width,size.height);
                }
            }
            drawChildren(){
                for(let i = 0; i < this.children.length;i++){
                    this.children[i].draw();
                }
            }
            draw(){
                if(!this.options.hidden){
                    this.drawSelf();
                    this.drawChildren();
                }
            }
            /**@returns {{width:number,height:number}} */
            getTotalSize(){
                if(this.parent == null){
                    return {width: GameKit.canvas.width*this.width/100, height:GameKit.canvas.height*this.height/100};
                }
                var ps = this.parent.getTotalSize();
                return {width: ps.width*this.width/100, height:ps.height*this.height/100}
            }
            getTopLeftCorner(){
                //////FIX LOCATION OF CHILDREN
                let size = this.getTotalSize();
                let parentBounds = this.getParentBounds();

                var topBound = parentBounds.y;
                var leftBound = parentBounds.x;

                var centerX = parentBounds.x + parentBounds.width/2 - size.width/2;
                var centerY = parentBounds.y + parentBounds.height/2 - size.height/2;

                var rightBound = parentBounds.x + parentBounds.width - size.width;
                var bottomBound = parentBounds.y + parentBounds.height - size.height;
                
                
                switch (this.anchor) {
                    case anchorPositions.TOP_LEFT:
                        return {x:leftBound + this.x, y:topBound + this.y}

                    case anchorPositions.TOP:
                        return {x:centerX + this.x, y:topBound + this.y}

                    case anchorPositions.TOP_RIGHT:
                        return {x:rightBound - this.x, y:topBound + this.y}

                    case anchorPositions.LEFT:
                        return {x:leftBound + this.x, y:centerY + this.y}

                    case anchorPositions.RIGHT:
                        return {x:rightBound - this.x, y: centerY + this.y}

                    case anchorPositions.BOTTOM_LEFT:
                        return {x:leftBound + this.x, y:bottomBound - this.y}

                    case anchorPositions.BOTTOM:
                        return {x:centerX + this.x, y:bottomBound - this.y}

                    case anchorPositions.BOTTOM_RIGHT:
                        return {x:rightBound - this.x, y:bottomBound - this.y}

                    default: //Same as center
                        return {x:centerX + this.x,y:centerY + this.y}

                }
            }
            getCorners(){
                var topLeft = this.getTopLeftCorner();
                var size = this.getTotalSize();
                return [
                    GameKit.pos(topLeft.x+size.width,topLeft.y),
                    GameKit.pos(topLeft.x+size.width,topLeft.y+size.height),
                    GameKit.pos(topLeft.x,topLeft.y+size.height),
                    GameKit.pos(topLeft.x,topLeft.y)
                ]
            }
            hasMouseHover(){
                //Works for corners, but not cardinals
                if(!this.activeCollision){
                    return false;
                }
                let size = this.getTotalSize();
                let topLeft = this.getTopLeftCorner();
                let pos = GameKit.localToActual(
                    topLeft.x,
                    topLeft.y
                );
                let tester = new GameKit.RectEnt(pos.x,pos.y,size.width,size.height,'red','red',true);
                tester.x = pos.x + size.width/2;
                tester.y = pos.y + size.height/2
                return tester.hasMouseHover();
            }
            /**
             * Gets the bounds of the parent, or the main window if no parent exists 
             * @returns {{x:number, y:number, width:number,height:number}}
             */
            getParentBounds(){
                if(this.parent == null) {
                    return {
                        x:0,y:0,width:GameKit.canvas.width,height:GameKit.canvas.height
                    }
                }
                //return Object.assign(this.parent.getTopLeftCorner(),this.parent.getTotalSize())
                let pSize = this.parent.getTotalSize();
                let pCorner = this.parent.getTopLeftCorner();
                return {
                    x:pCorner.x, y:pCorner.y, width:pSize.width, height:pSize.height
                }
            }
        }
        /**@TODO: Fix the texts. They're bad... */
        let text = class TextUI extends UIComponent {
            constructor(x, y, width, height, color, borderColor, textColor = 'black'){
                super(x, y, width, height, color, borderColor);
                this.text = ()=>"Hello World";
                this.textColor = textColor;
                /**@type {string} The cached value for the string to draw so the text function isn't called each tick */
                this.currentText = undefined;
                this.updateText = false;
            }
            /**@param {function():string} func */
            setTextFunction(func){
                this.text = func;
                this.updateText = true;
                return this;
            }
            drawSelf() {
                //Can't just super.draw() then draw text because of children
                let c = GameKit.ctx;
                let size = this.getTotalSize();
                let topLeft = this.getTopLeftCorner();
                super.drawSelf();

                c.fillStyle = this.textColor;
                
                let fontSize = 30;
                c.font = fontSize + 'px Times New Roman'
                if(this.updateText){
                    this.currentText = this.text();
                }
                fontSize = fontSize * Math.sqrt(size.width/c.measureText(this.currentText).width)
                c.font = fontSize + 'px Times New Roman';
                c.textAlign = 'center';
                c.fillText(this.currentText,topLeft.x + size.width/2,topLeft.y + size.height/2,size.width);
            }
        }
        let button = class ButtonUI extends text {
            /**
             * 
             * @param {number} x the x offset 
             * @param {number} y the y offset
             * @param {number} width width as a percent of the parent, 0-100
             * @param {number} height height as a percent of the parent, 0-100
             * @param {string} color the standard color of the button
             * @param {string} textColor the color of the text of the button 
             * @param {string} clickColor the color of the button after clicked
             * @param {string} hoverColor the color of the button when hovered over
             */
            constructor(x, y, width, height, color, borderColor,textColor='black',clickColor = 'dark'+color, hoverColor = 'dark'+color){
                super(x,y,width,height,color,borderColor,textColor);
                this.hasMouseDown = false;
                /**@type {function(button):void} */
                this.onClickFunction = (t)=>{}
                this.clickColor = clickColor;
                this.nonClickColor = color;
                this.hoverColor = undefined;
                this.onHoverFunction = (t)=>{}
                this.hoverColor = hoverColor;
            }
            /**@param {function(button):void} func */
            setClickFunction(func){
                this.onClickFunction = func;
                return this;
            }
            /**@param {function(button):void} func */
            setHoverFunction(func){
                this.onHoverFunction = func;
                return this;
            }
            setHoverColor(color){
                this.hoverColor = color;
                return this;
            }
            setClickColor(color){
                this.clickColor = color;
                return this;
            }
            checkClick(){
                if(this.options.hidden){
                    return;
                }
                let hmh = this.hasMouseHover();
                //Maybe check children before accepting the click
                if(!this.hasMouseDown && GameKit.mouse.down && hmh){
                    this.hasMouseDown = true;
                    this.color = this.clickColor;
                    return;
                }
                if(this.hasMouseDown && !GameKit.mouse.down){
                    if(hmh){
                        this.onClickFunction(this);
                    }
                    this.hasMouseDown = false;
                    this.color = this.nonClickColor;
                    return;
                }
                if(this.hoverColor != undefined){
                    if(!GameKit.mouse.down && hmh){
                        this.color = this.hoverColor;
                        this.onHoverFunction();
                    } else if(!this.hasMouseDown) {
                        this.color = this.nonClickColor;
                    }
                }
            }
            draw(){
                super.draw();
                this.checkClick();
            }
            /**Calls the onClick function */
            click(){
                this.onClickFunction(this);
                return this;
            }
        }
        const UI = new class UI{
            /**@type {UIComponent[]} */
            components = [];
            Component = UIComponent;
            Text = text;
            Button = button;
            anchorPositions = anchorPositions;
            /**@param {UIComponent[]} comp */
            addComponents(...comp){
                this.components.push(...comp);
                return this;
            }
        }();
        return UI;
    })()
    /**Simple incremental ID generator using generator functions */
    GameKit.ID = function nextId(type='generic'){
        if(nextId["ID"+type]===undefined)
            nextId["ID"+type]=(function*(){var id=0;while(true)yield String(id++);})()
        return Number(nextId["ID"+type].next().value)
    }

    /**
     * Enables you to call a function after a set number of ticks
     * @param {function():any} 
     * func @param {number} ticks 
     */
    GameKit.delay = function(func,ticks){
        var count = 0;
        GameKit.onTickFunctions.push(()=>{
            count++;
            if(count >= ticks){
                func();
                return true;
            }
        })
    }
    GameKit.clamp = function(val,min,max){
        return (val < min)? min: (val > max)? max : val;
    }
    /**
     * Useful for delaying something happening when it happens first for a bit
     * @param {function(...any):any} func 
     * @param {number} timeout 
     * @returns 
     */
    function debounce(func, timeout = 300){
        let timer;
        return (...args) => {
          clearTimeout(timer);
          timer = setTimeout(() => { func.apply(this, args); }, timeout);
        };
    }
    
    GameKit.debounce = debounce;

    /**
     * 
     * @param {function(...any):any} func 
     * @param {number} limit 
     * @returns 
     */
    function throttle(func, limit) {
        let lastFunc
        let lastRan
        return function() {
            const context = this
            const args = arguments
            if (!lastRan) {
                func.apply(context, args)
                lastRan = Date.now()
            } else {
                clearTimeout(lastFunc)
                lastFunc = setTimeout(function() {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(context, args)
                        lastRan = Date.now()
                    }
                }, limit - (Date.now() - lastRan))
            }
        }
    }
    GameKit.throttle = throttle;
    return GameKit;
})()