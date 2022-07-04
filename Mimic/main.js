//#region Init

/**@type Tile[][] */
var board = [];
var ui;
(function init(){
    GameKit.makeCanvas();
    GameKit.options.backgroundColor='darkgrey';
    /**Called to get the background color right */
    GameKit.renderSlowCanvas();
    setupUI();
})()

//#endregion Init

//#region UI

function setupUI(){
    ui = new GameKit.UI.Component(0,0,70,70,'royalblue');
    GameKit.UI.addComponents(ui);
    let close = new GameKit.UI.Button(0,5,30,30,'lightgrey','black','black','grey');
    close.setTextFunction(()=>"Let's Play!")
    close.setAnchor(GameKit.UI.anchorPositions.BOTTOM);
    close.setHoverColor("darkgrey");
    close.setClickFunction(()=>ui.hide());
    let t1 = new GameKit.UI.Text(0,5,99,20,'royalblue','royalblue');
    t1.setTextFunction(()=>"You control the black circle");
    t1.setAnchor(GameKit.UI.anchorPositions.TOP);
    let t2 = new GameKit.UI.Text(0,65,99,20,'royalblue','royalblue');
    t2.setTextFunction(()=>"The white circle is mirroring your movements");
    t2.setAnchor(GameKit.UI.anchorPositions.TOP);
    let t3 = new GameKit.UI.Text(0,125,99,20,'royalblue','royalblue');
    t3.setTextFunction(()=>"Try to get both on the flag!");
    t3.setAnchor(GameKit.UI.anchorPositions.TOP);
    ui.addChildren(close,t1,t2,t3);
}

//#endregion UI

//#region Tile

class Tile {
    static statuses = {NONE:0,P1:1,P2:2,BOX:3,PIT:4};
    static own = {P1:0,P2:1}
    owner;
    status;
    hasFlag;
    constructor(owner){
        this.owner = owner;
        this.status = 0;
    }
    /**@param {CanvasRenderingContext2D} ctx */
    draw(i,j,ctx){
        ctx.lineWidth = 2;
        let ox = board.length * w / 2;
        let oy = board[0].length * h / 2;

        let x = i * w - ox + innerOffset;
        let y = j * h - oy + innerOffset;

        let width =  w - 2 * innerOffset;
        let height = h - 2 * innerOffset;
        ctx.fillStyle = (this.owner == Tile.own.P1)  ? "white":"black";
        ctx.fillRect(x, y, width, height);
        ctx.strokeStyle = (this.owner == Tile.own.P1)? "black":"white";
        ctx.strokeRect(x, y, width, height);

        if(this.hasFlag){
            ctx.strokeStyle = 'green';
            ctx.fillStyle =   'green';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x + width - 4 * innerOffset, y + height - 2 * innerOffset);
            ctx.lineTo(x + width - 4 * innerOffset, y + 3 * innerOffset);
            ctx.lineTo(x + 5 * innerOffset,         y + 3 * innerOffset);
            ctx.lineTo(x + 10 * innerOffset,        y + innerOffset + height/4);
            ctx.lineTo(x + 5 * innerOffset,         y + height/2);
            ctx.lineTo(x + width - 4 * innerOffset, y + height/2);
            ctx.stroke();
            ctx.closePath();
            ctx.fill()
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'black';
        }
        switch(this.status){
            case Tile.statuses.P1:
                ctx.beginPath();
                ctx.fillStyle = 'black';
                ctx.arc(x + width / 2, y + height / 2, width / 2 - 3 * innerOffset, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                break;
            case Tile.statuses.P2:
                ctx.beginPath();
                ctx.fillStyle = 'white';
                ctx.arc(x + width / 2, y + height / 2, width / 2 - 3 * innerOffset, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fill();
                break;
            case Tile.statuses.BOX:
                ctx.fillStyle = 'orange';
                ctx.fillRect(x + innerOffset*4, y + innerOffset*4, width - innerOffset*8, height - innerOffset*8);
                break;
            case Tile.statuses.PIT:
                ctx.lineWidth = 5;
                let oldS = ctx.strokeStyle;
                ctx.strokeStyle = 'darkorange';
                ctx.beginPath()
                ctx.moveTo(x + innerOffset,         y + innerOffset);
                ctx.lineTo(x + width - innerOffset, y + height - innerOffset);
                ctx.moveTo(x + width - innerOffset, y + innerOffset);
                ctx.lineTo(x + innerOffset,         y + height - innerOffset);
                ctx.closePath();
                ctx.stroke();
                ctx.lineWidth = 1;
                ctx.strokeStyle = oldS;
                break;
        }
    }
    isEmpty(){return this.status == 0;}
    isP1(){return this.status == 1;}
    isP2(){return this.status == 2;}
    isBox(){return this.status == 3;}
    isPit(){return this.status == 4;}
}

//#endregion Tile

//#region Drawing

let w = 70;
let h = 70;

/**Used for most rendering things */
let innerOffset = 3;

/**I just offload all the rendering to the postDraw functions because it's a simple game */
GameKit.postDrawFunctions.push(ctx=>{
    let ox = board.length * w / 2;
    let oy = board[0].length * h / 2;
    ctx.strokeStyle = 'gray';
    ctx.fillStyle = '#444';
    ctx.fillRect(
        -ox-innerOffset/2,
        -oy-innerOffset/2,
        (board.length * w+innerOffset)/2,
        board[0].length * h+innerOffset
    );
    ctx.fillStyle = 'white'
    ctx.fillRect(
        -ox-innerOffset/2 + ((board.length * w+innerOffset)/2),
        -oy-innerOffset/2,
        (board.length * w+innerOffset)/2, 
        board[0].length * h+innerOffset
    );
    for(let i=0;i<board.length;i++){
        for(let j=0;j<board[i].length;j++){
            board[i][j].draw(i,j,ctx)
        }
    }
});

//#endregion Drawing

//#region Controls

GameKit.Controls.trackKeys("arrows","r");
/**Used for only stepping once when pushed */
var isPushed = {};

/**Helper for individual controls */
function handleKey(keyname, func){
    if(GameKit.Controls.pressed[keyname] && !isPushed[keyname]){
        isPushed[keyname] = true;
        func();
    } else if(!GameKit.Controls.pressed[keyname] && isPushed[keyname]){
        isPushed[keyname] = false;
    }
}

/** Movement handlers */
GameKit.onTickFunctions.push(()=>{
    handleKey('up',()=>movePlayers(dirs.UP));
    handleKey('down',()=>movePlayers(dirs.DOWN));
    handleKey('left',()=>movePlayers(dirs.LEFT));
    handleKey('right',()=>movePlayers(dirs.RIGHT));
    handleKey('r',()=>{maps[curMap]()})
});

//#endregion Controls

//#region Movement

/**Simple helper that finds both players */
function findPlayers(){
    var p1 = [-1,-1], p2=[-1,-1];
    for(let i = 0; i < board.length;i++){
        for(let j = 0; j < board[i].length; j++){
            if(board[i][j].isP1())
                p1 = [i,j];
            if(board[i][j].isP2())
                p2 = [i,j];
        }
    }
    return [p1,p2];
}

/**@enum Tells cardinal directions */
const dirs = {UP:0,DOWN:1,LEFT:2,RIGHT:3,
    flip:(dir)=>(dir==dirs.DOWN)?dirs.UP:
                (dir==dirs.UP)?dirs.DOWN:
                (dir==dirs.LEFT)?dirs.RIGHT:
                (dir == dirs.RIGHT)?dirs.LEFT:
                    console.assert(false)};
                    

/**Helper that moves x and y in the specified direction */
function moveD(x,y,dir){
    switch(dir){
        case dirs.UP:    return [x,y-1];
        case dirs.DOWN:  return [x,y+1];
        case dirs.LEFT:  return [x-1,y];
        case dirs.RIGHT: return [x+1,y];
        default:         return [x,  y];
    }
}
/**Like moveD but does both as an array instead of two params @param {[number,number]} xy @param {dirs} dir */
function moveB(xy,dir){
    return moveD(xy[0],xy[1],dir);
}

/**@returns {boolean} if the box was moves successfully */
function moveBox(x, y, dir){
    console.assert(board[x][y].isBox());
    //console.assert(false);
    let [nx, ny] = moveD(x,y,dir);
    if(
        board[nx] !== undefined && 
        board[nx][ny] !== undefined && 
        (board[nx][ny].isEmpty() || board[nx][ny].isPit()) && 
        board[x][y].owner == board[nx][ny].owner
    ){
        board[nx][ny].status = (board[nx][ny].isPit())?Tile.statuses.NONE:Tile.statuses.BOX;
        board[x][y].status = Tile.statuses.NONE;
        return true;
    }
    return false;

}

const moves = {
    SUCCESS:0,
    NO_MOVE:1,
    PIT:2
}

/**Locates player1 and moves them to whereever you want, acting like they moved in the specified direction */
function movePlayer1To(x,y,dir){
    let [p1,] = findPlayers();
    if(board[x] == undefined || (nb = board[x][y]) == undefined || nb.owner != Tile.own.P1)
        return moves.NO_MOVE;
    if(nb.isEmpty() || (nb.isBox() && moveBox(x,y,dir))){
        nb.status = Tile.statuses.P1;
        board[p1[0]][p1[1]].status = Tile.statuses.NONE;
        return moves.SUCCESS;
    } else if(nb.isPit()){
        return moves.PIT;
    }
}

/**See movePlayer1To to get description */
function movePlayer2To(x,y,dir){
    let [,p2] = findPlayers();
    let nb;
    if(board[x] == undefined || (nb = board[x][y]) == undefined|| nb.owner != Tile.own.P2)
        return moves.NO_MOVE;
    if(nb.isEmpty() || (nb.isBox() && moveBox(x,y,dir))){
        nb.status = Tile.statuses.P2;
        board[p2[0]][p2[1]].status = Tile.statuses.NONE;
        return moves.SUCCESS;
    } else if(nb.isPit()){
        return moves.PIT;
    }
}

/**Moves both players a single tile in oposite directions */
function movePlayers(dir){
    let [p1,p2] = findPlayers();
    let m1 = movePlayer1To(...moveD(p1[0],p1[1],dir),dir);
    let m2 = movePlayer2To(...moveD(p2[0],p2[1],dirs.flip(dir)),dirs.flip(dir));
    if(m1 == moves.PIT || m2 == moves.PIT){
        maps[curMap]();
        return;
    }
    [p1,p2] = findPlayers();
    if(board[p1[0]][p1[1]].hasFlag && board[p2[0]][p2[1]].hasFlag){
        GameKit.delay(()=> alert("YOU WIN"),10)
    }
}
//#endregion Movement

//#region MapMaking

/**Initializes board to be of the specified size and fill of NONE tiles of the correct ownership */
function makeBoard(width = 4, height=3){
    board = new Array(width*2)
        .fill(()=>new Array(height))
        .map(f=>f());
    for(let i = 0;i < width * 2; i++){
        for(let j = 0; j < height; j++){
            board[i][j] = new Tile(Number(i > (height-1)))
        }
    }
    return board;
}

/**Sets players on both sides of the map */
function placePlayers(p1x,p1y){
    wh(p1x,p1y,Tile.statuses.P1);
    bl(p1x,p1y,Tile.statuses.P2);
}

/**Sets a tile to have a flag */
function flag(x,y){ board[x][y].hasFlag = true; }
/**Sets a tile on the white side to have a status */
function wh(x,y,t){ board[x][y].status = t; }
/**Sets a tile on the black side to have a status. Rotational from white side */
function bl(x,y,t){ board[board.length - 1 - x][board[x].length - 1 - y].status = t; }
/**@returns {[number,number]} The coords at the other side of the board */
function otherSize(x,y){ return [board.length - 1 - x,board[x].length - 1 - y]; }
/**Places a type on both sides of the board */
function both(x,y,t){ wh(x,y,t); bl(x,y,t,t); }

var curMap = 2;

var maps = {
    [1]:function map1(){
        curMap = 1;
        makeBoard(2,2);
        placePlayers(1,1);
        flag(0,0);
        flag(3,1);
    },[2]:function map2(){
        curMap = 2;
        makeBoard(4,4);
        placePlayers(0,0);
        both(1,1,Tile.statuses.BOX);
        flag(3,2);
        wh(2,2,Tile.statuses.PIT);
        flag(...otherSize(3,3));
    },[3]:function map3(){
        curMap = 3;
        makeBoard(8,8);
        placePlayers(8-1,5);
    }
}

//#endregion MapMaking

maps[2]();