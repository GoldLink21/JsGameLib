"use strict";
/**
 * Tool used for quick simple game construction.
 *
 * TODO Fix mouse draw function when camera zoom != 1 
 * TODO Audio functions
 * TODO More Documentations
 * TODO refactor, optimize, and maybe utilize
 * TODO Fix UI stuff
 * TODO fix the slower rendered canvas underneath to allow better performance
 * TODO Add Canvas for UI Elems
 * TODO Add more event handling 
 * TODO Add Entities that get drawn different than where their collision box is
 *      Like a DisplayEnt
 * TODO Maybe add offset for center of entity
 * TODO Maybe change to request anim frame.
 * TODO Image loading error handling
 * TODO Maybe debug string function to allow writing text simply
 * TODO Fix and test image loading
 */

/**@type {HTMLCanvasElement} */
export let canvas = undefined;

/**@type {HTMLCanvasElement} A canvas used for rendering more static things. Can be force re-rendered with renderSlowCanvas = true */
export let slowCanvas = undefined;

/**@type {number} the variable that holds the refresh timer */
let canvasRefreshInterval = undefined;

/**@type {CanvasRenderingContext2D} */
let ctx = undefined;

/**@type {CanvasRenderingContext2D} Context for slow-canvas*/
let ctx2 = undefined;

//==================================
// Attempt at event handling features
const ENABLE_EVENTS = true;

export const EventNames = {
    tick: "gTick",
    postDraw: "gPostDraw",
    preDraw: "gPreDraw",
    click:"gClick",
    postUIDraw:"gPostUIDraw",
};
Object.freeze(EventNames);

/**@type {Event} Called every tick */
let tickEvent = new Event(EventNames.tick);
/**@type {CustomEvent<{ctx:CanvasRenderingContext2D}>} Called before all drawing occurs */
let postDrawEvent; // = new CustomEvent(EventNames.postDraw, {detail:{ctx}});
/**@type {CustomEvent<{ctx:CanvasRenderingContext2D}>} Called after all drawing occurs, but before UI gets drawn */
let preDrawEvent; // = new CustomEvent(EventNames.preDraw, {detail:{ctx}});
/**@type {CustomEvent<{ctx:CanvasRenderingContext2D}>} Called after all UI drawing occurs */
let postUIDrawEvent; // = new CustomEvent(EventNames.preDraw, {detail:{ctx}});
/**@type {CustomEvent<{x:number, y:number}>} Called after all drawing occurs */
let clickEvent;

//==================================

/**Modifies the render rate of the canvas. If using options.renderIndependent, this just changes the framerate */
export function setTimeScale(rate) {
    options.renderRate = rate;
    deltaTime = 1 / options.renderRate;
    if (typeof canvasRefreshInterval == "number") {
        // Interval is already defined
        clearInterval(canvasRefreshInterval);
    }
    canvasRefreshInterval = setInterval(() => tick(), options.renderRate);
}

/**Set to true to force a rerender of the slow-canvas */
export let forceRenderSlowCanvas = false;
export let options = {
    /**Adds an event listener that updates the mouse position and mouse down variables */
    trackMouse: true,
    /**Whether to watch what keys are being pressed */
    trackControls: true,
    /**Automatically adds keys to be tracked when they are pressed */
    autoTrackKeys: false,
    /**Allows skipping running .track() on every new entity that is created */
    autoTrackNewEnts: true,
    /**Allows the canvas to auto resize when the window gets resized. Currently broken @TODO: */
    autoSizeCanvas: true,
    /**The border color of all entities initially */
    defaultBorderColor: "black",
    /**The color that is painted onto the background after each frame */
    backgroundColor: "lightgray",
    defaultImageFileType: ".png",
    /**@type {'up'|'down'|'left'|'right'} Images facing up are considered correct from the start @TODO: */
    defaultImageOrientation: "up",
    /**The directory holding all images. Should include the / */
    imageDirectory: "img/",
    /**The speed that all ticking happens per millisecond */
    renderRate: 1000 / 60,
    /** If movement options should be render independent */
    renderIndependent: true,
    /**@type {0|1} */
    defaultEntDrawStyle: 0, //RectEnt.drawStyles.DRAW_ROTATED
    /**
     * This is the scale of all movement. Useful for making you able to move at units of
     * TODO; actually implement it
     */
    unitScale: 1,
    /**
     * Used for keyboard inputs
     */
    caseInsensitive: true,
};

export let deltaTime = 1 / options.renderRate;

/**Allows setting many options at onces using a destructured parameter */
export function setOptions(/** @type {{ [x: string]: any; }} */ obj) {
    for (let prop in obj) {
        if (prop in options) {
            if (typeof options[prop] != typeof obj[prop])
                console.warn(
                    `Expected type of ${typeof options[
                        prop
                    ]} for option ${prop}, but got ${typeof obj[prop]} instead`
                );
            else options[prop] = obj[prop];
        }
    }
}

/**
 * Initializes the event listeners and some object initialization
 */
function init() {
    camera.x = 0;
    camera.y = 0;
    ctx = canvas.getContext("2d");

    // Setup event things
    postDrawEvent   = new CustomEvent(EventNames.postDraw,  { detail: { ctx } });
    preDrawEvent    = new CustomEvent(EventNames.preDraw,   { detail: { ctx } });
    clickEvent      = new CustomEvent(EventNames.click,     { detail: { x: mouse.x, y: mouse.y}});
    postUIDrawEvent = new CustomEvent(EventNames.postUIDraw,{ detail: { ctx } });

    
    slowCanvas = document.createElement("canvas");
    slowCanvas.width = canvas.width;
    slowCanvas.height = canvas.height;
    
    ctx2 = slowCanvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx2.imageSmoothingEnabled = false;

    canvas.addEventListener("mousemove", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (options.trackMouse) {
            //let scalar = Math.sqrt(1/camera.zoom);
            let actual = localToActual(
                e.pageX - canvas.offsetLeft,
                e.pageY - canvas.offsetTop
            );
            mouse.x = actual.x; // / camera.zoom;
            mouse.y = actual.y; // / camera.zoom;
            //mouse.position = pos(0,0)
            //mouse.x = (e.pageX-canvas.offsetLeft - canvas.width/2 + camera.x)*scalar;
            //mouse.y = (e.pageY-canvas.offsetTop - canvas.height/2 + camera.y)*scalar;
        }
    });
    window.addEventListener("resize", (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (options.autoSizeCanvas) {
            resizeCanvas();
            forceRenderSlowCanvas = true;
        }
    });
    document.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();

        mouse.down = !options.trackMouse ? false : true;
    });
    document.body.addEventListener("mouseup", (e) => {
        mouse.down = false;
    });
    canvas.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        //@ts-ignore backwards compatibility
        if (document.selection && document.selection.empty) {
            //@ts-ignore
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
        clickEvent.detail.x = mouse.x;
        clickEvent.detail.y = mouse.y;
        if(ENABLE_EVENTS) {
            dispatchEvent(clickEvent)
        }
        onClickEvent();
    });
    document.body.addEventListener("keydown", (e) => {
        e.stopPropagation();
        Controls.keydownEvent(e);
    });
    document.body.addEventListener("keyup", (e) => {
        e.stopPropagation();
        e.preventDefault();
        Controls.keyupEvent(e);
    });

    setTimeScale(options.renderRate);
    mouse.position = vec2(-1, -1);
}

/**Initial Setup function */
export function makeCanvas(w, h) {
    canvas = document.createElement("canvas");

    init(canvas);

    if (h == undefined && w == undefined) {
        //AutoSizing
        resizeCanvas();
    } else {
        if (h == undefined) h = w;
        canvas.width = w;
        slowCanvas.width = w;
        canvas.height = h;
        slowCanvas.height = h;
    }
    let html = document.querySelector("html");
    document.body.style.margin = "0";
    html.style.margin = "0";
    html.style.height = "100%";
    html.style.width = "100%";
    html.style.overflow = "hidden";
    [canvas, slowCanvas].forEach((c) => {
        c.classList.add("GameKitCanvas");
        c.style.border = "2px solid " + options.defaultBorderColor;
        c.style.boxSizing = "border-box";
        c.style.padding = "0px";
        c.style.marginLeft = "0px";
        c.style.marginTop = "0px";
        c.style.display = "block";
        c.style.position = "absolute";
        c.style.offset = "0";
    });
    document.body.appendChild(canvas);
    return canvas;
}
/**Class for easy manipulation of angles in radians and degrees */
export class Angle {
    /**Internal tracker is kept in radians */
    #cur;
    /**Angle defaults to degrees */
    constructor(ang = 0, isRad = false) {
        this.#cur = isRad ? ang : Angle.toRad(ang);
    }
    get rad() {
        return this.#cur;
    }
    get deg() {
        return Angle.toDeg(this.#cur);
    }
    set rad(val) {
        this.#cur = val;
    }
    set deg(val) {
        this.#cur = Angle.toRad(val);
    }
    /**Returns the radians for the angle. Used when using math operators */
    valueOf() {
        return this.#cur;
    }
    toString() {
        return `${this.deg}deg`;
    }
    [Symbol.toPrimitive](hint) {
        return hint === "string" ? this.toString() : this.#cur;
    }
    static toRad(deg) {
        return (deg * Math.PI) / 180;
    }
    static toDeg(rad) {
        return (rad * 180) / Math.PI;
    }
}

/**
 * Returns a new function that will limit how many times a function
 * can get called in a short time
 * @param {function(...any):any} func
 * @param {number} limit
 * @returns
 */
export function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function () {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function () {
                if (Date.now() - lastRan >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    };
}

export let resizeCanvas = throttle(() => {
    [canvas, slowCanvas].forEach((c) => {
        c.width = window.innerWidth - c.clientLeft;
        c.height = window.innerHeight - c.clientTop;
    });
    forceRenderSlowCanvas = true;
    /**@TODO: Adjust camera to not be wonky when resizing */
    /**@TODO: Fix UI elements after resize */
}, 500);

/**
 * Class that works as a rectangular base with rotations and collision detection. Center based positioning.
 * Basic blocks of the engine
 * DON'T FORGET TO TRACK ALL YOUR ENTS AFTER MAKING THEM!
 */
export class RectEnt {
    /**@type {number} */
    #x;
    /**@type {number} */
    #y;
    /**
     * @param {number} x @param {number} y @param {number} width @param {number} height
     * @param {string} color @param {string} borderColor
     */
    constructor(
        x,
        y,
        width,
        height,
        color = "white",
        borderColor = options.defaultBorderColor,
        doNotAdd = false
    ) {
        this.#x = x - width / 4;
        this.#y = y - height / 4;
        this.width = width;
        this.height = height;
        /**This is if any collisions happen with this entity */
        this.activeCollision = true;
        /**Tells if the entity should be removed next tick */
        this.toRemove = false;
        this.color = color;
        this.borderColor = borderColor;
        /**Angle they are facing */
        this.rotation = new Angle();
        /**@type {HTMLImageElement} */
        this.image = undefined;
        /**Layers to draw them on in increasing order. Lowest is drawn first */
        this.drawLayer = 1;
        /**@type {'up'|'down'|'left'|'right'} which way to flip the image when drawn @TODO: */
        this.imageOrientation = options.defaultImageOrientation;
        this.imageName = undefined;
        this.beingTracked = false;
        if (options.autoTrackNewEnts && !doNotAdd) {
            this.track();
        }
        /**Tells if this should be rendered slowly, aka only
         * updated a small percentage of the time or on demand */
        this.slowRender = false;
    }
    options = {
        hidden: false,
        /**@type {number} */
        drawStyle: options.defaultEntDrawStyle,
        hasBorder: true,
        imageBorder: true,
        drawBoxUnderImage: false,
    };
    renderSlow() {
        this.slowRender = true;
        return this;
    }
    borderless() {
        this.options.hasBorder = false;
        this.options.imageBorder = false;
        return this;
    }
    setImage(src) {
        //Image already loaded
        if (!(src + options.defaultImageFileType in images)) {
            loadImages(src);
        }
        this.imageName = src;
        this.image = images[src + options.defaultImageFileType];
        return this;
    }
    /**
     * Position relative to the top right corner of the screen 
     */
    get relativePosition(){
        return pos(
            (this.x*camera.zoom)-(camera.x) + canvas.width/2,
            (this.y*camera.zoom)-(camera.y) + canvas.height/2
        ); 
    }
    /**Called each tick */
    move() {}
    /** Draws a basic rectangle with rotation, based upon options.drawStyle */
    draw() {
        if (this.options.hidden) {
            return;
        }
        //Renders on other canvas if it is set to be slow rendered
        let c = !this.slowRender ? ctx : ctx2;
        //Floor all values passed into any ctx funcs to optimize perf
        let fw = Math.floor(this.width),
            fh = Math.floor(this.height),
            fx = Math.floor(this.x - this.width / 2),
            fy = Math.floor(this.y - this.height / 2);

        c.fillStyle = this.color;
        if (this.options.drawStyle == RectEnt.drawStyles.DRAW_STATIC) {
            //When Static
            if (!this.image || this.options.drawBoxUnderImage) {
                c.beginPath();
                c.rect(fx, fy, fw, fh);
                c.fill();
                if (this.options.hasBorder) {
                    c.strokeStyle = this.borderColor;
                    c.stroke();
                }
                c.closePath();
            }
            if (this.image) {
                //Does not draw image and box under. Add options?
                c.drawImage(this.image, fx, fy, fw, fh);
                if (this.options.imageBorder) {
                    c.strokeStyle = this.borderColor;
                    c.strokeRect(fx, fy, fw, fh);
                }
            }
        } else if (this.options.drawStyle == RectEnt.drawStyles.DRAW_ROTATED) {
            //I could also get the positions of the corners when rotated and path them out individually
            //When Rotated

            var fhw = Math.floor(this.width / 2),
                fhh = Math.floor(this.height / 2);
            c.save();
            c.translate(this.x, this.y);
            c.rotate(this.rotation.rad);
            if (!this.image || this.options.drawBoxUnderImage) {
                c.beginPath();
                c.rect(-fhw, -fhh, fw, fh);
                c.fill();
                if (this.options.hasBorder) {
                    c.strokeStyle = this.borderColor;
                    c.stroke();
                }
                c.closePath();
            }
            if (this.image) {
                c.drawImage(this.image, -fhw, -fhh, fw, fh);
                if (this.options.imageBorder) {
                    c.strokeStyle = this.borderColor;
                    c.strokeRect(-fhw, -fhh, fw, fh);
                }
            }
            c.restore();

            /* //TODO think about doing this way
            let dx = Math.floor(this.width/2*Math.cos(this.rotation.rad))
            let dy = Math.floor(this.height/2*Math.sin(this.rotation.rad))
            let pts = [
                [fx - dx,fy + dy],
                [fx + dx,fy + dy],
                [fx + dx,fy - dy]
            ]
            c.moveTo(fx - dx,fy - dy)
            c.beginPath()
            pts.forEach(p=>{
                c.lineTo(p[0],p[1])
            })
            c.stroke()
            c.closePath()
            */
        }
    }
    /**Gets the corners for when options.drawStyle is DRAW_ROTATED */
    #getRotatedCorners() {
        var Cx = this.x,
            Cy = this.y;
        var Ox = this.width / 2,
            Oy = this.height / 2,
            cos = Math.cos(this.rotation.rad),
            sin = Math.sin(this.rotation.rad);
        return [
            pos(Cx + Ox * cos - Oy * sin, Cy + Ox * sin + Oy * cos),
            pos(Cx + Ox * cos - -Oy * sin, Cy + Ox * sin + -Oy * cos),
            pos(Cx + -Ox * cos - -Oy * sin, Cy + -Ox * sin + -Oy * cos),
            pos(Cx + -Ox * cos - Oy * sin, Cy + -Ox * sin + Oy * cos),
        ];
        //return ret;
    }
    /**Gets the corners for when options.drawStyle is DRAW_STATIC */
    #getStaticCorners() {
        return [
            pos(this.x - this.width / 2, this.y + this.height / 2),
            pos(this.x - this.width / 2, this.y - this.height / 2),
            pos(this.x + this.width / 2, this.y - this.height / 2),
            pos(this.x + this.width / 2, this.y + this.height / 2),
        ];
    }
    getCorners() {
        return this.options.drawStyle == RectEnt.drawStyles.DRAW_STATIC
            ? this.#getStaticCorners()
            : this.#getRotatedCorners();
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
    #rotationalIntersects(other, isCoords = false) {
        // @ts-ignore
        if (!this.activeCollision || (!isCoords && !other.activeCollision))
            return false;
        var a = this.#getRotatedCorners();
        // @ts-ignore
        var b = isCoords ? other : other.#getRotatedCorners();
        var polygons = [a, b];
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
                    if (minA === undefined || projected < minA)
                        minA = projected;
                    if (maxA === undefined || projected > maxA)
                        maxA = projected;
                }
                minB = maxB = undefined;
                for (j = 0; j < b.length; j++) {
                    projected = normal.x * b[j].x + normal.y * b[j].y;
                    if (minB === undefined || projected < minB)
                        minB = projected;
                    if (maxB === undefined || projected > maxB)
                        maxB = projected;
                }
                if (maxA < minB || maxB < minA) return false;
            }
        }
        return true;
    }
    /**Collision detection between entities */
    collides(other) {
        if (!this.activeCollision || !other.activeCollision) return false;
        if (this.options.drawStyle === RectEnt.drawStyles.DRAW_STATIC) {
            if (other.options.drawStyle === RectEnt.drawStyles.DRAW_STATIC) {
                //Faster way of collision iff both are upright squares
                return !(
                    this.y + this.height / 2 < other.y - other.height / 2 ||
                    this.y - this.height / 2 > other.y + other.height / 2 ||
                    this.x + this.width / 2 < other.x - other.width / 2 ||
                    this.x - this.width / 2 > other.x + other.width / 2
                );
            }
            return other.#rotationalIntersects(this.#getStaticCorners(), true);
        }
        if (other.options.drawStyle === RectEnt.drawStyles.DRAW_STATIC) {
            return this.#rotationalIntersects(other.#getStaticCorners(), true);
        }
        return this.#rotationalIntersects(other);
    }
    /**@returns {'none'|'right'|'left'|'bottom'|'top'} The side that the ents collide on @deprecated*/
    collisionSide(other) {
        if (!this.activeCollision || !other.activeCollision) return "none";
        if (
            this.options.drawStyle == RectEnt.drawStyles.DRAW_ROTATED ||
            other.options.drawStyle == RectEnt.drawStyles.DRAW_ROTATED
        ) {
            console.warn(
                "Using RectEnt.collisionSide() doesn't work with the draw style DRAW_ROTATED.\n" +
                    "This will just give the side as if it were not rotated"
            );
        }
        var dx = this.x + this.width / 2 - (other.x + other.width / 2);
        var dy = this.y + this.height / 2 - (other.y + other.height / 2);
        var width = (this.width + other.width) / 2;
        var height = (this.height + other.height) / 2;
        var crossWidth = width * dy;
        var crossHeight = height * dx;
        var collision = "none";

        if (Math.abs(dx) <= width && Math.abs(dy) <= height) {
            if (crossWidth > crossHeight)
                collision = crossWidth > -crossHeight ? "bottom" : "left";
            else collision = crossWidth > -crossHeight ? "right" : "top";
        }
        // @ts-ignore
        return collision;
    }
    /**Just sets x and y in the same spot */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    /**Sets the rotation to make the front of the entity face the point specified */
    pointAt(x, y) {
        this.rotation.rad =
            Math.PI / 2 + Math.atan2(y - this.y, x - this.x) - Math.PI / 2;
        return this;
    }
    hide() {
        this.options.hidden = true;
        return this;
    }
    show() {
        this.options.hidden = false;
        return this;
    }
    /**Adds the entity to the GameKit entity array for drawing */
    track() {
        //If not already being tracked
        if (!this.beingTracked) {
            entities.push(this);
            this.beingTracked = true;
        }
        return this;
    }
    /**@returns {RectEnt} */
    clone() {
        return JSON.parse(JSON.stringify(this));
    }
    /**
     * Moves the specified distance in the direction they are facing
     *  @param {number} dist
     */
    moveForward(dist) {
        let c = options.renderIndependent && false ? deltaTime : 1;
        this.x += dist * Math.cos(this.rotation.rad) * c;
        this.y += dist * Math.sin(this.rotation.rad) * c;
    }
    /**Moves the specified distance in the specified direction. Defaults to degrees */
    moveInDirection(dist, newDir, isRad = false) {
        //This allows getting just the rad without needing to check anything
        let a = new Angle(newDir, isRad).rad;
        this.x += dist * Math.cos(a);
        this.y += dist * Math.sin(a);
    }
    onTick() {}
    onRemove() {}
    /**
     * This affects entity collision detection
     * @readonly @enum {number}
     */
    static drawStyles = {
        /**Entity angle affects how it gets drawn */
        DRAW_ROTATED: 0,
        /**Entity is drawn upright no matter what angle it faces */
        DRAW_STATIC: 1,
    };
    /**Stages the ent to be removed next pass through */
    remove() {
        this.toRemove = true;
        return this;
    }
    get position() {
        return { x: this.x, y: this.y };
    }
    /**You can quick set position using any object with an x and y property */
    set position(obj) {
        if (!obj["x"] || !obj["y"]) {
            return;
        }
        this.x = obj.x;
        this.y = obj.y;
    }
    /**Combine with mouse.down to see if something has been clicked on. Also counts for if the collisions are active on it */
    hasMouseHover() {
        //return this.containsPoint(vec2().from(mouse).scale(1/camera.zoom))//mouse.collides(this)
        return this.containsPoint(mouse);
    }
    toString() {
        return `R[x:${this.x},y:${this.y},w:${this.width},h:${this.height}]`;
    }
    /**@param {number|{x:number,y:number}} x @param {number} [y] */
    containsPoint(x = { x: 0, y: 0 }, y) {
        if (typeof x == "number") {
            x = { x: x, y: y };
        }
        if (this.options.drawStyle === RectEnt.drawStyles.DRAW_STATIC) {
            return (
                x.x >= this.x - this.width / 2 &&
                x.x <= this.x + this.width / 2 &&
                x.y >= this.y - this.height / 2 &&
                x.y <= this.y + this.height / 2
            );
        }
        function isLeft(P0, P1, P2) {
            return -(
                (P1.x - P0.x) * (P2.y - P0.y) -
                (P2.x - P0.x) * (P1.y - P0.y)
            );
        }
        let pts = this.getCorners();
        return (
            isLeft(pts[0], pts[1], x) > 0 &&
            isLeft(pts[1], pts[2], x) > 0 &&
            isLeft(pts[2], pts[3], x) > 0 &&
            isLeft(pts[3], pts[0], x) > 0
        );
    }
    get x() {
        return this.#x;
    }
    set x(val) {
        this.#x = val;
    }
    get y() {
        return this.#y;
    }
    set y(val) {
        this.#y = val;
    }
}

/**@type {(RectEnt)[]} */
export let entities = [];

/** Particles meant to give some visual pop. Can define changes over time */
export class Particle extends RectEnt {
    constructor(
        x,
        y,
        width,
        height,
        color = "white",
        lifeSpan = 20,
        borderColor = options.defaultBorderColor
    ) {
        super(x, y, width, height, color, borderColor);
        this.lifeCounter = new Counter(
            lifeSpan * deltaTime,
            () => (this.toRemove = true)
        );
        //Don't add 2 copies
        if (!options.autoTrackNewEnts) this.track();
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
     * @param {object} obj
     * @param {number} [obj.x] @param {number} [obj.y] @param {number} [obj.height] @param {number} [obj.width]
     * @param {number} [obj.rad] @param {number} [obj.deg] @param {number} [obj.forward]
     */
    setChange({ x, y, width, height, rad, deg, forward } = {}) {
        if (x) this.change.x = x;
        if (y) this.change.y = y;
        if (width) this.change.width = width;
        if (height) this.change.height = height;
        if (rad) this.change.rotation.rad = rad;
        if (deg) this.change.rotation.deg = deg;
        if (forward) this.change.forward = forward;
        return this;
    }
    /**Picks one random color and assigns it to the particle */
    colorChoice(...colors) {
        this.color = Rnd.arrayElement(colors);
        return this;
    }
    /**Sets the initial rotation to a number between start and end */
    startRotation(start, end, isRad = false) {
        this.rotation.deg = new Angle(
            Math.random() * (end - start) + start,
            isRad
        ).deg;
        return this;
    }
    /** Controls the current change per tick */
    change = {
        height: 0,
        width: 0,
        forward: 0,
        x: 0,
        y: 0,
        rotation: new Angle(),
    };
    /**Draws a basic rectangle with rotation, based upon options.drawStyle */
    draw() {
        //Shouldn't have this in the draw function, but they're particles
        //If they're not being drawn then does it really matter?
        this.onTickChanges();
        super.draw();
    }
    /** Handles all movement changes per tick on the particles */
    onTickChanges() {
        this.width += this.change.width * deltaTime;
        this.height += this.change.height * deltaTime;
        //TODO: Should this be divided by it's lifespan??
        this.rotation.rad += this.change.rotation.rad * deltaTime;
        this.x += this.change.x * deltaTime;
        this.y += this.change.y * deltaTime;
        if (this.change.forward != 0)
            this.moveForward(this.change.forward * deltaTime);
        this.lifeCounter.count(deltaTime);
    }
    /**Shrinks over lifeSpan till it is gone */
    shrink() {
        this.change.width = -this.width / this.lifeSpan;
        this.change.height = -this.height / this.lifeSpan;
        return this;
    }
    /**Gradually grows over lifeSpan from nothing to the width */
    grow() {
        this.change.width = this.width / this.lifeSpan;
        this.change.height = this.height / this.lifeSpan;
        this.width = 0;
        this.height = 0;
        return this;
    }
}

export class ParticleSystem {
    /**
     * Class for bulk distribution of particles
     * @param {number} x @param {number} y @param {number} particlesToSpawn How many particles until it burns out
     * @param {number} ticksPerParticle Ticks between each particle spawn
     */
    constructor(x, y, particlesToSpawn, ticksPerParticle, doNotAdd = false) {
        this.initialParticleCount = particlesToSpawn; //
        this.particlesToSpawn = particlesToSpawn; //
        this.ticksPerParticle = ticksPerParticle; //
        /**@type {Array.<function():Particle>} */
        this.particleChoices = []; //
        /**The engine behind spawning all the particles on time */
        this.particleSpawnCounter = new Counter(ticksPerParticle, () => {
            //Arrow function here allows this to be the System
            if (this.parent != undefined) {
                for (let i = 0; i < this.particlesPerSpawn; i++)
                    this.spawnParticle().setPosition(
                        this.parent.x + this.parentOffsetX,
                        this.parent.y + this.parentOffsetY
                    );
            } else
                for (let i = 0; i < this.particlesPerSpawn; i++)
                    this.spawnParticle().setPosition(this.x, this.y);
            if (--this.particlesToSpawn == 0) {
                this.active = false;
                if (this.doRemoveWhenDone) {
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
        if (!doNotAdd) particleSystems.push(this);
        this.particlesSpawned = 0; //
        this.doRemoveWhenDone = false; //
    }
    removeWhenDone() {
        this.doRemoveWhenDone = true;
        return this;
    }
    setParticlesPerSpawn(pps) {
        this.particlesPerSpawn = pps;
        return this;
    }
    /**Change between each particle */
    pattern = {
        /**Tells if it chooses the particles in order [true] or randomly [false]. */
        particleChoice: false,
        /**How much change happens per particle */
        rotation: new Angle(),
        /**@type {string[]} */
        colors: [],
        /**@type {number[]} The size multiplier to apply to a particle. 1 means normal size */
        size: [],
    };
    setPattern({ particleChoice, deg, rad, colors, size }) {
        if (particleChoice) {
            this.pattern.particleChoice = particleChoice;
        }
        if (deg) {
            this.pattern.rotation.deg = deg;
        }
        if (rad) {
            this.pattern.rotation.rad = rad;
        }
        if (colors) {
            this.pattern.colors = colors;
        }
        if (size) {
            this.pattern.size = size;
        }
        return this;
    }
    spawnParticle() {
        /**@type {Particle} */
        let p;
        if (this.pattern.particleChoice) {
            p =
                this.particleChoices[
                    this.particlesSpawned % this.particleChoices.length
                ]();
        } else {
            p = Rnd.arrayElement(this.particleChoices)();
        }
        if (this.pattern.colors.length > 0) {
            p.color =
                this.pattern.colors[
                    this.particlesSpawned % this.pattern.colors.length
                ];
        }
        if (this.pattern.size.length > 0) {
            let d =
                this.pattern.size[
                    this.particlesSpawned % this.pattern.size.length
                ];
            p.height *= d;
            p.width *= d;
        }
        p.rotation.rad += this.pattern.rotation.rad * this.particlesSpawned;
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
    forever() {
        this.particlesToSpawn = Infinity;
        this.active = true;
        return this;
    }
    /**@param {(function():Particle)[]} particles */
    addParticleType(...particles) {
        this.particleChoices.push(...particles);
        return this;
    }
    setPosition(x, y) {
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
    onTick() {
        if (this.active && this.particlesToSpawn > 0) {
            this.particleSpawnCounter.count(deltaTime);
        }
    }
    onRemove() {}
    /**Copies without setting parent */
    clone() {
        var ns = new ParticleSystem(
            this.x,
            this.y,
            this.particlesToSpawn,
            this.ticksPerParticle
        );
        ns.initialParticleCount = this.initialParticleCount;
        ns.pattern.colors = this.pattern.colors.slice();
        ns.pattern.particleChoice = this.pattern.particleChoice;
        ns.pattern.rotation.rad = this.pattern.rotation.rad;
        ns.pattern.size = this.pattern.size.slice();
        ns.particleChoices = this.particleChoices.slice();
        ns.particlesPerSpawn = this.particlesPerSpawn;
        ns.doRemoveWhenDone = this.doRemoveWhenDone;
    }
}

/**@type {ParticleSystem[]} */
export let particleSystems = [];
/**
 * Returns a simple position object
 * @param {number} x
 * @param {number} y
 */
export function pos(x=0, y=0) {
    return {
        x: x,
        y: y,
        toString: function () {
            return `{${this.x},${this.y}}`;
        },
        roundString : function(){
            return `{${Math.round(this.x)},${Math.round(this.y)}}`
        },
        from(obj){
            this.x = obj.x;
            this.y = obj.y;
            return this;
        }
    };
}

/**Simple x and y obj with dot and move functionality */
export function vec2(/** @type {number} */ x, /** @type {number} */ y) {
    return {
        x: x,
        y: y,
        /**@param {{x:number,y:number}} other @returns {number} dot product of the two */
        dot(other) {
            return this.x * other.x + this.y * other.y;
        },
        /**@param {number} x @param {number} y */
        set(x, y) {
            this.x = x;
            this.y = y;
            return this;
        },
        /**@param {{x:number,y:number}} point */
        from(point) {
            this.x = point.x;
            this.y = point.y;
            return this;
        },
        /**@param {{x:number,y:number}|number} other @param {number} [y] Adds to this vec2's values */
        add(other = 0, y = 0) {
            if (typeof other === "object") {
                this.x += other.x;
                this.y += other.y;
            } else {
                this.x += other;
                this.y += y;
            }
            return this;
        },
        /**Flips this vec2's x and y */
        flip() {
            this.x = -this.x;
            this.y = -this.y;
            return this;
        },
        /**Scales this instance of vec2 */
        scale(scalar = 1) {
            this.x *= scalar;
            this.y *= scalar;
            return this;
        },
        /**Gets a new instance of vec2 that is scaled */
        scaled(scalar = 1) {
            return vec2(this.x * scalar, this.y * scalar);
        },
        length() {
            return Math.hypot(this.x, this.y);
        },
        /**@param {number} val Scales the current vec2 to the specified len */
        setLength(val) {
            if (this.length() !== 0) this.scale(val / this.length());
            return this;
        },
        /**@param {{x:number,y:number}} other returns a new vec2 of the projection */
        projOnto(other) {
            var s = this.dot(other) / (other.x * other.x + other.y * other.y);
            return vec2(other.x * s, other.y * s);
        },
        copy() {
            return vec2(this.x, this.y);
        },
        /**Converts the vector into an angle on GameKit's basis */
        toAngle() {
            return new Angle(-Math.atan2(this.x, this.y) + Math.PI / 2, true);
        },
        toString() {
            return `{${this.x}, ${this.y}}`;
        },
        normalize() {
            if (this.length() == 0) return this;
            return this.scale(1 / this.length());
        },
        normalized() {
            if (this.length() == 0) return this.copy();
            return this.scaled(1 / this.length());
        },
        /** Tells if this vec2 is at the specified location */
        is(x, y){
            if(typeof x === 'number'){
                return (this.x === x) && (y === undefined || this.y === y);
            } else {
                return this.x === x.x && this.y === x.y;
            }
        }
    };
}

/**Useful for seeing if there was a collision between a moving point and a solid line */
export class Line {
    /**
     * Line class for simple extra math
     * @param {number} x1 @param {number} y1
     * @param {number} x2 @param {number} y2
     * @param {string} color
     */
    constructor(x1, y1, x2, y2, color = options.defaultBorderColor) {
        this.p1 = pos(x1, y1);
        this.p2 = pos(x2, y2);
        this.color = color;
    }
    get x1() {
        return this.p1.x;
    }
    set x1(val) {
        this.p1.x = val;
    }

    get x2() {
        return this.p2.x;
    }
    set x2(val) {
        this.p2.x = val;
    }

    get y1() {
        return this.p1.y;
    }
    set y1(val) {
        this.p1.y = val;
    }

    get y2() {
        return this.p2.y;
    }
    set y2(val) {
        this.p2.y = val;
    }

    get midpoint() {
        return pos((this.p1.x + this.p2.x) / 2, (this.p1.y + this.p2.y) / 2);
    }
    get length() {
        return Math.hypot(this.x1 + this.x2, this.y1 + this.y2);
    }
    draw() {
        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(Math.floor(this.p1.x), Math.floor(this.p1.y));
        ctx.lineTo(Math.floor(this.p2.x), Math.floor(this.p2.y));
        ctx.stroke();
        ctx.closePath();
    }
    forceDraw(duration = 0) {
        let count = 0;
        postDrawFunctions.push((ctx) => {
            this.draw();
            return ++count == duration;
        });
    }
    /**
     * @param {RectEnt} r
     */
    static fromRect(r) {
        var c = r.getCorners();
        return [
            new Line(c[0].x, c[0].y, c[1].x, c[1].y),
            new Line(c[1].x, c[1].y, c[2].x, c[2].y),
            new Line(c[2].x, c[2].y, c[3].x, c[3].y),
            new Line(c[3].x, c[3].y, c[0].x, c[0].y),
        ];
    }
    /**
     * @param {{ x: any; y: any; }} p Point 1 of line
     * @param {{ x: any; y: any; }} q Point 2 of line
     * @param {{ x: any; y: any; }} r The point to check
     */
    static pointOnSegment(p, q, r) {
        return (
            q.x <= Math.max(p.x, r.x) &&
            q.x >= Math.max(p.x, r.x) &&
            q.y <= Math.max(p.y, r.y) &&
            q.y >= Math.max(p.y, r.y)
        );
    }
    /**
     * @param {{ y: number; x: number; }} p
     * @param {{ y: number; x: number; }} q
     * @param {{ x: number; y: number; }} r
     */
    static #orientation(p, q, r) {
        let val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val === 0) return 0;
        return val > 0 ? 1 : 2;
    }

    /**
     * @param {{ x: number; y: number; }} p1
     * @param {{ x: number; y: number; }} q1
     * @param {{ x: number; y: number; }} [p2]
     * @param {{ x: number; y: number; }} [q2]
     */
    static doIntersect(p1, q1, p2, q2) {
        var o1 = Line.#orientation(p1, q1, p2),
            o2 = Line.#orientation(p1, q1, q2),
            o3 = Line.#orientation(p2, q2, p1),
            o4 = Line.#orientation(p2, q2, q1);
        if (o1 !== o2 && o3 !== o4) return true;
        if (o1 === 0 && Line.pointOnSegment(p1, p2, q1)) return true;
        if (o2 === 0 && Line.pointOnSegment(p1, q2, q1)) return true;
        if (o3 === 0 && Line.pointOnSegment(p2, p1, q2)) return true;
        if (o4 === 0 && Line.pointOnSegment(p2, q1, q2)) return true;
        return false;
    }
    /**@param {Line} other */
    intersectsLine(other) {
        return Line.doIntersect(this.p1, this.p2, other.p1, other.p2);
    }
    /**@param {RectEnt} rect Does not cover if the line is contained within the rect*/
    collidesRect(rect) {
        var ls = Line.fromRect(rect);
        for (let i = 0; i < ls.length; i++) {
            if (this.intersects(ls[i])) {
                return true;
            }
        }
        return false;
    }
    /**@param {{x:number,y:number}|number} x */
    hasPoint(x, y) {
        if (typeof x == "number") {
            x = { x: x, y: y };
        }
        return Line.pointOnSegment(this.p1, this.p2, x);
    }
    toString(){
        return `(${this.p1.x},${this.p1.y})->(${this.p2.x},${this.p2.y})`
    }
}

/**
 * Ranges which are [start-end)
 */
export class Range {

    /**
     * TODO Technically Range(5,6) != Range(6, 5) because
     * of the inclusivity of the end values, but right now I just
     * swap Range(6, 5) to be Range(5, 6) 
     */
    #start;
    #end;
    /**
     * @param {number} start
     * @param {number} end
     */
    constructor(start, end) {
        this.#start = Math.min(start, end);
        this.#end = Math.max(start, end);
    }
    get start() {
        return this.#start;
    }
    set start(val) {
        if (val > this.#end) {
            // 1..2 Start = 4 -> 2..4
            this.#start = this.#end;
            this.#end = val;
        } else {
            this.#start = val;
        }
    }
    get end() {
        return this.#end;
    }
    set end(val) {
        if (val < this.#start) {
            // 2..5 end = 1 -> 1..2
            this.#end = this.#start;
            this.#start = val;
        } else {
            this.#end = val;
        }
    }
    /**
     * @param {number} val
     */
    contains(val) {
        return val >= this.start && val < this.end;
    }
    static zero = new Range(0, 0);
    toString() {
        return `${this.start}..${this.end}`;
    }
    [Symbol.toPrimitive](hint) {
        return this.toString();
    }
}

/**
 * A disjoint range. Can
 */
export class DisjointRange {
    constructor() {
        /**@type {Range[]} */
        this.ranges = [];
    }
    condense() {
        // Double loop seems bad, but the ranges used with this
        //  will likely never need more than two or three ranges
        for (let i = 0; i < this.ranges.length; i++) {
            for (let j = 0; j < this.ranges.length; j++) {
                if (i === j || i < 0 || j < 0) continue;
                let r1 = this.ranges[i];
                let r2 = this.ranges[j];
                // 0..5   2..6 M  0..6
                // 1..2   2..3 M  1..3
                // 3..4   5..6 X
                // 3..5   1..3 M  1..5

                if (r1.end >= r2.start && r1.start < r2.end) {
                    this.#merge(i, j);
                    i = 0;
                    j = 0;
                } else if (r2.end >= r1.start && r2.start < r1.end) {
                    this.#merge(i, j);
                    i = 0;
                    j = 0;
                }
            }
        }
    }
    /**Used in condensing */
    #merge(i, j) {
        if (i === j) {
            return;
        }
        if (i > j) {
            let t = i;
            i = j;
            j = t;
        }
        this.ranges[i].start = Math.min(
            this.ranges[i].start,
            this.ranges[j].start
        );
        this.ranges[i].end = Math.max(this.ranges[i].end, this.ranges[j].end);
        this.ranges.splice(j, 1);
    }

    /**
     *
     * @param {Range|number} rng
     * @param {number} [end]
     */
    addRange(rng, end) {
        if (
            end === undefined &&
            typeof rng === "object" &&
            rng.constructor.name === "Range"
        ) {
            this.ranges.push(rng);
        } else if (typeof rng === "number") {
            this.ranges.push(new Range(rng, end));
        }
        this.condense();
    }
    contains(val) {
        return this.ranges.some((e) => e.contains(val));
    }
    toString() {
        return (
            "(" +
            this.ranges
                .sort((a, b) => a.start - b.start)
                .map((r) => `${r}`)
                .join(", ") +
            ")"
        );
    }
    [Symbol.toPrimitive](hint) {
        return this.toString();
    }
}

/**Class for doing something after so many times, repeatedly */
export class Counter {
    #max;
    #cur;
    /**
     * A class for counting times a thing happens and running a function after that
     * @param {number} max The max number of times the counter can count till it does onComplete
     * @param {function():void} onComplete The function to run once the counter is complete
     */
    constructor(max, onComplete = () => {}) {
        if (max <= 0)
            throw new RangeError(
                "Max count must be positive and greater than 0"
            );
        this.#max = max;
        this.#cur = 0;
        this.onComplete = onComplete;
    }
    count(n = 1) {
        this.cur += n;
        return this;
    }
    reset() {
        this.cur = 0;
        return this;
    }
    toString() {
        return this.cur + "/" + this.max;
    }
    set cur(val) {
        this.#cur = val;
        while (this.#cur >= this.#max) {
            this.#cur -= this.#max;
            this.onComplete();
        }
    }
    set max(val) {
        if (val <= 0)
            throw new RangeError(
                "Max count must be positive and greater than 0"
            );
        this.#max = val;
        this.cur = this.cur;
    }
    get cur() {
        return this.#cur;
    }
    get max() {
        return this.#max;
    }
}

/**Randomizers for utility */
export let Rnd = {
    /**@returns {string} Hex value from 000000 to ffffff preceded by a # */
    color: () =>
        "#" +
        ("000000" + Math.floor(Math.random() * 16581375).toString(16)).slice(
            -6
        ),
    /**@returns {number} a number from [0-2pi) */
    rad: () => Math.random() * 2 * Math.PI,
    /**@returns {number} a number from [0-360) */
    deg: () => Math.floor(Math.random() * 360),
    /**@returns {boolean} true with a chance of 1/n if d not defined and n/d otherwise. 1/2 chance if nothing passed in */
    chance: (n = 2, d) =>
        d === undefined ? Rnd.chance(1, n) : Math.floor(Math.random() * d) < n,
    /**@returns {number} a number between the specified numbers from [start, end) */
    intRange: (start, end) =>
        Math.floor(Math.random() * Math.abs(end - start)) +
        Math.min(start, end),
    /**@returns a random object from an array */
    arrayElement: (arr) =>
        arr.length == 0
            ? undefined
            : arr[Math.floor(Math.random() * arr.length)],
    /**@returns {number} an int from [0, max) */
    intTo: (max) => Math.floor(Math.random() * max),
    /**@returns {number} an int from [0, max) */
    numTo: (max) => Math.random() * max,
    numRange: (min, max) => min + Math.random() * (max - min),
    /**@returns {number[]} an array of numbers shuffled from [start, end) */
    intArrNoRepeat(start, end) {
        if (end < start) {
            var t = start;
            start = end;
            end = t;
        }
        var nums = [],
            ret = [];
        for (let j = 0; j < end - start; j++) nums.push(start + j);
        while (nums.length > 0)
            ret.push(nums.splice(Rnd.intTo(nums.length), 1)[0]);
        return ret;
    },
};

/**Tracks the center of the camera */
export let camera = (function () {
    //Doing it this way lets me keep the actual coords localized and unaccessible
    var _x = 0;
    var _y = 0;
    var _zoom = 1;
    return {
        get x() {
            return _x;
        },
        set x(val) {
            mouse.x += (val - _x)// / _zoom;
            _x = val;
        },
        get y() {
            return _y;
        },
        set y(val) {
            mouse.y += (val - _y)// / _zoom;
            _y = val;
        },
        /**@param {{x:number,y:number}} obj */
        set position(obj) {
            this.x = obj.x;
            this.y = obj.y;
        },
        get position() {
            return pos(_x, _y);
        },
        get zoom() {
            return _zoom;
        },
        set zoom(val) {
            //Zoom point should be camera.position
            var scaleChange = val - _zoom;
            var ox = (camera.x / _zoom) * scaleChange;
            var oy = (camera.y / _zoom) * scaleChange;

            mouse.x = mouse.x * _zoom / val;
            mouse.y = mouse.y * _zoom / val

            _zoom = val;

            camera.x += ox;
            camera.y += oy;
        },
    };
})();

/**
 * Takes an absolute position and converts it to a position relative to the camera based on the top left corner 
 * Compare
*/
export function relativePositionToCamera(x, y) {
    return pos(
        (x*camera.zoom)-(camera.x) + canvas.width/2,
        (y*camera.zoom)-(camera.y) + canvas.height/2
    ); 
    return vec2(
        canvas.width / 2 + (camera.x + x),
        canvas.height / 2 + (camera.y + y)
    );
}

/**Takes a relative position and makes it into an absolute. Think mouse or UI */
export function localToActual(x, y) {
    let scalar = 1/camera.zoom;
    return vec2(
        (x - canvas.width / 2 + camera.x) * scalar,
        (y - canvas.height / 2 + camera.y) * scalar
    );
}

export function renderSlowCanvas() {
    ctx2.fillStyle = options.backgroundColor;
    ctx2.fillRect(0, 0, canvas.width, canvas.height);

    var xOff = Math.floor(canvas.width / 2 - camera.x);
    var yOff = Math.floor(canvas.height / 2 - camera.y);

    let zoom = camera.zoom;

    //Setup
    ctx2.translate(xOff, yOff);
    if (zoom != 1) {
        ctx2.scale(zoom, zoom);
        //ctx.translate(Math.floor(tx),Math.floor(ty))
    }
    entities
        .filter((e) => e.slowRender)
        .sort((a, b) => a.drawLayer - b.drawLayer)
        .forEach((e) => e.draw());
    //Reset
    if (zoom != 1) {
        ctx2.scale(1 / zoom, 1 / zoom);
    }
    ctx2.translate(-xOff, -yOff);
}

/** Runs the game loop and entity movement @TODO: OPTIMIZE ME */
export function render() {
    if (ENABLE_EVENTS) {
        dispatchEvent(preDrawEvent);
    }

    var zoom = camera.zoom;
    //this.ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    //Always draw the slowCanvas after clearing it
    if (forceRenderSlowCanvas) {
        renderSlowCanvas();
        forceRenderSlowCanvas = false;
    }
    ctx.drawImage(slowCanvas, 0, 0, canvas.width, canvas.height);

    var xOff = Math.floor(canvas.width / 2 - camera.x);
    var yOff = Math.floor(canvas.height / 2 - camera.y);

    ctx.translate(xOff, yOff);
    if (zoom != 1) {
        ctx.scale(zoom, zoom);
        //this.ctx.translate(Math.floor(tx),Math.floor(ty))
    }
    for (let i = 0; i < preDrawFunctions.length; i++) {
        if (preDrawFunctions[i](ctx)) {
            preDrawFunctions.splice(i--, 1);
            continue;
        }
    }
    //Sorts by drawing layer so it draws in the correct order
    entities.sort((a, b) => a.drawLayer - b.drawLayer);
    for (let i = 0; i < entities.length; i++) {
        //Entity removal
        if (entities[i].toRemove) {
            //Set to not tracking
            entities[i].beingTracked = false;
            entities.splice(i--, 1)[0].onRemove();
            continue;
        }
        entities[i].onTick();
        entities[i].move();
        //Slows down movement to allow better numbers I guess?
        if (!entities[i].slowRender) entities[i].draw();
    }
    //These will never be slow rendered
    for (let i = 0; i < particleSystems.length; i++) {
        particleSystems[i].onTick();
        if (particleSystems[i].toRemove) {
            particleSystems.splice(i--, 1)[0].onRemove();
            continue;
        }
    }
    for (let i = 0; i < postDrawFunctions.length; i++) {
        if (postDrawFunctions[i](ctx)) {
            postDrawFunctions.splice(i--, 1);
            continue;
        }
    }
    if (ENABLE_EVENTS) {
        dispatchEvent(postDrawEvent);
    }

    if (zoom != 1) {
        ctx.scale(1 / zoom, 1 / zoom);
    }
    ctx.translate(-xOff, -yOff);

    for (let i = 0; i < UI.components.length; i++) {
        UI.components[i].draw();
    }
    mouse.draw();
    if (ticks % 250 == 0) {
        renderSlowCanvas();
    }
}

/**
 * Handles all keyboard inputs
 * TODO: Maybe handle CTRL specially
 */
export let Controls = new (class Controls {
    /**
     * This holds all inputs currently being watched. They'll just have boolean vals of if they are pressed
     * There are certain shortcuts like up, down, left, right, and space
     * @type {Object.<string,boolean>}
     */
    pressed = {};
    /**
     * This tracks what has been unpressed for single action button press functions
     * @type {Object.<string,{unpressed:boolean,pressFunc:(()=>void)?, unpressFunc:(()=>void)?}>}
     */
    #keyEvents = {};
    /**Returns true if any key is currently pressed */
    anyPressed() {
        for (let key in this.pressed) {
            if (this.pressed[key]) return true;
        }
        return false;
    }
    /**Adds an individual key to track
     * @param {string} keyName
     */
    trackKey(keyName) {
        if (keyName in this.#shorthands) {
            this.trackKeys(...this.#shorthands[keyName]);
            return;
        }
        this.pressed[keyName] = false;
    }
    /**
     * Allows tracking more than one key quickly
     * @param {string[]} keys
     */
    trackKeys(...keys) {
        keys.forEach((k) => {
            this.trackKey(k);
        });
    }
    /**Used for alternate names to the default button names */
    #pairs = {
        ArrowUp: "up",
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowDown: "down",
        Shift: "shift",
        " ": "space",
        Enter: "enter",
        Delete: "delete",
        Control: "control",
        Backspace: "backspace",
    };
    #shorthands = {
        arrows: ["up", "down", "left", "right"],
        wasd: ["w", "a", "s", "d"],
        WASD: ["W", "A", "S", "D"],
        numbers: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
        shiftNumbers: ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
        "A-Z": ((x = []) => {
            for (let i = 0; i < 26; i++) x.push(String.fromCharCode(65 + i));
            return x;
        })(),
        "a-z": ((x = []) => {
            for (let i = 0; i < 26; i++) x.push(String.fromCharCode(97 + i));
            return x;
        })(),
        letters: ["a-z", "A-Z"],
    };
    keyupEvent(e) {
        if (!options.trackControls) {
            return;
        }
        let key =
            options.caseInsensitive && e.key.length == 1
                ? e.key.toLowerCase()
                : e.key;

        if (this.pressed[key] != undefined) {
            this.pressed[key] = false;
        } else if (this.pressed[this.#pairs[key]] != undefined) {
            this.pressed[this.#pairs[key]] = false;
        }
    }
    keydownEvent(e) {
        if (!options.trackControls) {
            return;
        }
        let key =
            options.caseInsensitive && e.key.length == 1
                ? e.key.toLowerCase()
                : e.key;

        if (this.pressed[key] != undefined) {
            this.pressed[key] = true;
        } else if (this.pressed[this.#pairs[key]] != undefined) {
            this.pressed[this.#pairs[key]] = true;
        } else if (options.autoTrackKeys) {
            //Only tracks new keys if it is enabled. Maybe useful for rebinding? Or just being lazy
            if (this.#pairs[key] != undefined) {
                this.trackKey(this.#pairs[key]);
            } else {
                this.trackKey(key);
            }
        }
    }
    _handleKeys() {
        for (let key in this.#keyEvents) {
            if (this.pressed[key] && this.#keyEvents[key].unpressed) {
                if (
                    "pressFunc" in this.#keyEvents[key] &&
                    this.#keyEvents[key].pressFunc !== null
                ) {
                    this.#keyEvents[key].pressFunc();
                }
                this.#keyEvents[key].unpressed = false;
            } else if (!this.pressed[key] && !this.#keyEvents[key].unpressed) {
                if (
                    "unpressFunc" in this.#keyEvents[key] &&
                    this.#keyEvents[key].unpressFunc !== null
                ) {
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
    addPressOnceEvent(key, event) {
        if (!this.#keyEvents[key])
            this.#keyEvents[key] = {
                unpressed: true,
                pressFunc: event,
                unpressFunc: null,
            };
        else this.#keyEvents[key].pressFunc = event;
    }
    /**
     * Adds an event that will run on unpressing a key onces, then
     * waits for you to unpress to be able to trigger again
     * @param {string} key
     * @param {()=>void} event
     */
    addUnpressOnceEvent(key, event) {
        if (!this.#keyEvents[key])
            this.#keyEvents[key] = {
                unpressed: true,
                unpressFunc: event,
                pressFunc: null,
            };
        else this.#keyEvents[key].unpressFunc = event;
    }
})();

/**Handles all things relating to the mouse. Is an extension of RectEnt to allow easy collision checking */
export let mouse = new (class Mouse extends RectEnt {
    /**@type {function(number,number,CanvasRenderingContext2D):void} */
    #drawFunction;
    constructor() {
        super(-1, -1, 3, 3, "transparent", "transparent");
        this.down = false;
        this.options.hidden = true;
    }
    /**
     * TODO: Currently broken when using camera.zoom != 1
     * @param {function(number,number,CanvasRenderingContext2D):void} func 
     */
    setDrawFunction(func, hideCursor = true) {
        this.#drawFunction = func;
        if (func == undefined) {
            canvas.style.cursor = "initial";
        } else if (hideCursor) {
            canvas.style.cursor = "none";
        } else {
            canvas.style.cursor = "initial";
        }
    }
    /**@override so this does not get added to the entity list */
    track() {
        return this;
    }
    /**
     * TODO: Currently broken
     */
    draw() {
        if (this.#drawFunction === undefined) {
            return;
        }
        var p = this.relativePosition;
        this.#drawFunction(p.x, p.y, ctx);
    }
    toString() {
        return `M{${Math.round(this.x * 10) / 10}, ${
            Math.round(this.y * 10) / 10
        }, ${this.down}}`;
    }
    set collisionSize(val) {
        this.width = val;
        this.height = val;
    }
    get collisionSize() {
        return this.width;
    }
    /**The proper way to get mouse position due to zooming being difficult */
    pos() {
        // return relativePositionToCamera(this.x,this.y).scale(1/camera.zoom)
        return pos(this.x, this.y);
    }
})();

export let ticks = 0;

/**Handles everything that needs to start */
export function tick() {
    Controls._handleKeys();
    for (let i = 0; i < onTickFunctions.length; i++) {
        if (onTickFunctions[i]()) {
            onTickFunctions.splice(i--, 1);
            continue;
        }
    }
    if (ENABLE_EVENTS) {
        dispatchEvent(tickEvent);
    }
    render();
    ticks++;
    if (ticks > Number.MAX_SAFE_INTEGER) {
        ticks = 0;
    }
}

/**General storage for random things */
export let misc = {};
/**@type {(function():(boolean|void))[]} Functions ran every tick. Return true when it should be removed */
export let onTickFunctions = [];
/**@type {(function(CanvasRenderingContext2D):boolean|void)[]} Functions to control things drawn before everything else. Return true to remove */
export let preDrawFunctions = [];
/**@type {(function(CanvasRenderingContext2D):boolean|void)[]} Functions to control things drawn after everything else. Return true to remove */
export let postDrawFunctions = [];

/**
 * Used to store all image objects in the project.
 * @example images.end // This gets the image at img/end.png (See options.defaultImageFileType)
 * images['player/idle'] // This would be at img/player/idle.png (options.imageDirectory)
 * @type {{[x:string]:HTMLImageElement}}
 */
export let images = {};

/**
 * Loads in multiple images relative to options
 * @param  {...string} images 
 */
export function loadImages(...images) {
    images.forEach((src) => {
        images[src + options.defaultImageFileType] = new Image();
        images[src + options.defaultImageFileType].src =
            options.imageDirectory + src + options.defaultImageFileType;
    });
}

/**Event ran when you click anywhere. You can now check on entity tick if it has mouse collision instead */
export let onClickEvent = () => {};

/**@param {()=>void} func */
export function timeTestFunction(func) {
    var s = performance.now();
    for (let i = 0; i < 100000000; i++) {
        func();
    }
    var e = performance.now();
    return e - s;
}

export function timeCompare2(func1, func2) {
    var t = 1000000;
    var s = performance.now();
    for (let i = 0; i < t; i++) {
        func1();
    }
    var e = performance.now();
    let t1 = e - s;
    s = performance.now();
    for (let i = 0; i < t; i++) {
        func2();
    }
    e = performance.now();
    let t2 = e - s;
    return { t1: t1, t2: t2, [`1 faster than 2?`]: t1 < t2 };
}

/**
 * TODO: Document which has size based on parents and stuff
 */
export let UI = (function () {
    // This is done the way it is to allow Inheritance
    /**
     * The points that allow you to set position from
     * @readonly @enum {number}
     */
    let anchorPositions = {
        TOP_LEFT:     0,
        TOP:          1,
        TOP_RIGHT:    2,
        LEFT:         3,
        CENTER:       4,
        RIGHT:        5,
        BOTTOM_LEFT:  6,
        BOTTOM:       7,
        BOTTOM_RIGHT: 8,
    };
    class UIComponent extends RectEnt {
        constructor(x, y, width, height, color, borderColor) {
            super(x, y, width, height, color, borderColor, true);
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
        addChildren(...kids) {
            let t = this;
            kids.forEach((k) => {
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
        drawSelf() {
            let c = ctx;
            let size = this.getTotalSize();
            let topLeft = this.getTopLeftCorner();
            c.fillStyle = this.color;
            c.fillRect(topLeft.x, topLeft.y, size.width, size.height);
            if (this.options.hasBorder) {
                c.strokeStyle = this.borderColor;
                c.strokeRect(topLeft.x, topLeft.y, size.width, size.height);
            }
        }
        drawChildren() {
            for (let i = 0; i < this.children.length; i++) {
                this.children[i].draw();
            }
        }
        draw() {
            if (!this.options.hidden) {
                this.drawSelf();
                this.drawChildren();
            }
        }
        /**@returns {{width:number,height:number}} */
        getTotalSize() {
            if (this.parent == null) {
                return {
                    width: (canvas.width * this.width) / 100,
                    height: (canvas.height * this.height) / 100,
                };
            }
            var ps = this.parent.getTotalSize();
            return {
                width: (ps.width * this.width) / 100,
                height: (ps.height * this.height) / 100,
            };
        }
        getTopLeftCorner() {
            // TODO Fix location of children
            let size = this.getTotalSize();
            let parentBounds = this.getParentBounds();

            var topBound = parentBounds.y;
            var leftBound = parentBounds.x;

            var centerX =
                parentBounds.x + parentBounds.width / 2 - size.width / 2;
            var centerY =
                parentBounds.y + parentBounds.height / 2 - size.height / 2;

            var rightBound = parentBounds.x + parentBounds.width - size.width;
            var bottomBound =
                parentBounds.y + parentBounds.height - size.height;

            switch (this.anchor) {
                case anchorPositions.TOP_LEFT:
                    return { x: leftBound + this.x, y: topBound + this.y };

                case anchorPositions.TOP:
                    return { x: centerX + this.x, y: topBound + this.y };

                case anchorPositions.TOP_RIGHT:
                    return { x: rightBound - this.x, y: topBound + this.y };

                case anchorPositions.LEFT:
                    return { x: leftBound + this.x, y: centerY + this.y };

                case anchorPositions.RIGHT:
                    return { x: rightBound - this.x, y: centerY + this.y };

                case anchorPositions.BOTTOM_LEFT:
                    return { x: leftBound + this.x, y: bottomBound - this.y };

                case anchorPositions.BOTTOM:
                    return { x: centerX + this.x, y: bottomBound - this.y };

                case anchorPositions.BOTTOM_RIGHT:
                    return { x: rightBound - this.x, y: bottomBound - this.y };

                default: //Same as center
                    return { x: centerX + this.x, y: centerY + this.y };
            }
        }
        getCorners() {
            var topLeft = this.getTopLeftCorner();
            var size = this.getTotalSize();
            return [
                pos(topLeft.x + size.width, topLeft.y),
                pos(topLeft.x + size.width, topLeft.y + size.height),
                pos(topLeft.x, topLeft.y + size.height),
                pos(topLeft.x, topLeft.y),
            ];
        }
        /**
         * TODO Make work for rotation lock
         * @returns
         */
        hasMouseHover() {
            //Works for corners, but not cardinals
            if (!this.activeCollision) {
                return false;
            }
            let size = this.getTotalSize();
            let topLeft = this.getTopLeftCorner();
            let pos = localToActual(topLeft.x, topLeft.y);
            let tester = new RectEnt(
                pos.x,
                pos.y,
                size.width,
                size.height,
                "red",
                "red",
                true
            );
            tester.x = pos.x + size.width / 2;
            tester.y = pos.y + size.height / 2;
            return tester.hasMouseHover();
        }
        /**
         * Gets the bounds of the parent, or the main window if no parent exists
         * @returns {{x:number, y:number, width:number,height:number}}
         */
        getParentBounds() {
            if (this.parent == null) {
                return {
                    x: 0,
                    y: 0,
                    width: canvas.width,
                    height: canvas.height,
                };
            }
            //return Object.assign(this.parent.getTopLeftCorner(),this.parent.getTotalSize())
            let pSize = this.parent.getTotalSize();
            let pCorner = this.parent.getTopLeftCorner();
            return {
                x: pCorner.x,
                y: pCorner.y,
                width: pSize.width,
                height: pSize.height,
            };
        }
    }
    /**@TODO: Fix the texts. They're bad... */
    let text = class TextUI extends UIComponent {
        constructor(
            x,
            y,
            width,
            height,
            color,
            borderColor,
            textColor = "black"
        ) {
            super(x, y, width, height, color, borderColor);
            this.text = () => "Hello World";
            this.textColor = textColor;
            /**@type {string} The cached value for the string to draw so the text function isn't called each tick */
            this.currentText = undefined;
            this.updateText = false;
        }
        /**@param {function():string} func */
        setTextFunction(func) {
            this.text = func;
            this.updateText = true;
            return this;
        }
        drawSelf() {
            //Can't just super.draw() then draw text because of children
            let c = ctx;
            let size = this.getTotalSize();
            let topLeft = this.getTopLeftCorner();
            super.drawSelf();

            c.fillStyle = this.textColor;

            let fontSize = 30;
            c.font = fontSize + "px Times New Roman";
            if (this.updateText) {
                this.currentText = this.text();
            }
            fontSize =
                fontSize *
                Math.sqrt(size.width / c.measureText(this.currentText).width);
            c.font = fontSize + "px Times New Roman";
            c.textAlign = "center";
            c.fillText(
                this.currentText,
                topLeft.x + size.width / 2,
                topLeft.y + size.height / 2,
                size.width
            );
        }
    };
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
        constructor(
            x,
            y,
            width,
            height,
            color,
            borderColor,
            textColor = "black",
            clickColor = "dark" + color,
            hoverColor = "dark" + color
        ) {
            super(x, y, width, height, color, borderColor, textColor);
            this.hasMouseDown = false;
            /**@type {function(button):void} */
            this.onClickFunction = (t) => {};
            this.clickColor = clickColor;
            this.nonClickColor = color;
            this.hoverColor = undefined;
            this.onHoverFunction = (t) => {};
            this.hoverColor = hoverColor;
        }
        /**@param {function(button):void} func */
        setClickFunction(func) {
            this.onClickFunction = func;
            return this;
        }
        /**@param {function(button):void} func */
        setHoverFunction(func) {
            this.onHoverFunction = func;
            return this;
        }
        setHoverColor(color) {
            this.hoverColor = color;
            return this;
        }
        setClickColor(color) {
            this.clickColor = color;
            return this;
        }
        checkClick() {
            if (this.options.hidden) {
                return;
            }
            let hmh = this.hasMouseHover();
            //Maybe check children before accepting the click
            if (!this.hasMouseDown && mouse.down && hmh) {
                this.hasMouseDown = true;
                this.color = this.clickColor;
                return;
            }
            if (this.hasMouseDown && !mouse.down) {
                if (hmh) {
                    this.onClickFunction(this);
                }
                this.hasMouseDown = false;
                this.color = this.nonClickColor;
                return;
            }
            if (this.hoverColor != undefined) {
                if (!mouse.down && hmh) {
                    this.color = this.hoverColor;
                    this.onHoverFunction();
                } else if (!this.hasMouseDown) {
                    this.color = this.nonClickColor;
                }
            }
        }
        draw() {
            super.draw();
            this.checkClick();
        }
        /**Calls the onClick function */
        click() {
            this.onClickFunction(this);
            return this;
        }
    };
    const UI = new (class UI {
        /**@type {UIComponent[]} */
        components = [];
        Component = UIComponent;
        Text = text;
        Button = button;
        anchorPositions = anchorPositions;
        /**@param {UIComponent[]} comp */
        addComponents(...comp) {
            this.components.push(...comp);
            return this;
        }
    })();
    return UI;
})();

/**
 * Enables you to call a function after a set number of ticks
 * @param {function():any}
 * func @param {number} ticks
 */
export function delay(func, ticks) {
    var count = 0;
    onTickFunctions.push(() => {
        count++;
        if (count >= ticks) {
            func();
            return true;
        }
    });
}

/**
 * Useful for delaying something happening when it happens first for a bit
 * @param {function(...any):any} func
 * @param {number} timeout
 * @returns
 */
export function debounce(func, timeout = 300) {
    let timer;
    return (/**@type {any[]} */ ...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

export let Util = new (class Util {
    /**
     * Interpolates from start to end across a range of 0-1
     * @param {number} start
     * @param {number} end
     * @param {number} t [0-1]
     */
    lerp(start, end, t) {
        return start * (1 - t) + end * t;
    }

    /**
     * Interpolates from start to end across a range of 0-1 with 2D points
     * @param {{x:number,y:number}} start
     * @param {{x:number,y:number}} end
     * @param {number} t [0-1]
     */
    lerp2D(start, end, t) {
        return {
            x: start.x * (1 - t) + end.x * t,
            y: start.y * (1 - t) + end.y * t,
        };
    }
    /**
     * Simple clamp function
     * @param {number} val
     * @param {number} min
     * @param {number} max
     */
    clamp(val, min, max) {
        return val < min ? min : val > max ? max : val;
    }
    //TODO Test
    /**Simple incremental ID generator using generator functions */
    ID(type = "generic") {
        if (this.ID["ID" + type] === undefined)
            this.ID["ID" + type] = (function* () {
                var id = 0;
                while (true) yield String(id++);
            })();
        return Number(this.ID["ID" + type].next().value);
    }

    /**
     * This isn't great, I wouldn't recommend using this
     * @param {{x:number,y:number}} pos
     * @param {Angle} dir
     * @param {number} max
     */
    rayCast(pos, dir, max = 1000, ignore, checkFrom = entities) {
        //Switch to line based movement;
        var dx = 3 * Math.cos(dir.rad);
        var dy = 3 * Math.sin(dir.rad);
        //Make a copy so it does not change actual location
        pos = { x: pos.x, y: pos.y };
        //////
        /**@param {{x:number, y:number}} p  @param {RectEnt} e*/
        function pointInRotatedRectangle(p, e) {
            var relX = p.x - e.x;
            var relY = p.y - e.y;
            var angle = -e.rotation.rad;
            var angleCos = Math.cos(angle);
            var angleSin = Math.sin(angle);
            var localX = angleCos * relX - angleSin * relY;
            var localY = angleSin * relX + angleCos * relY;
            return (
                localX >= 0 &&
                localX <= e.width &&
                localY >= 0 &&
                localY <= e.height
            );
        }
        /////
        for (let i = 0; i < max; i++) {
            pos.x += dx;
            pos.y += dy;
            for (let j = 0; j < checkFrom.length; j++) {
                if (
                    checkFrom[j] != ignore &&
                    pointInRotatedRectangle(pos, checkFrom[j])
                ) {
                    return checkFrom[j];
                }
            }
        }
        return undefined;
    }
})();
