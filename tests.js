import * as GameKit from "./gameKit-2.js";

let {
  Angle, // Good
  Counter, // Good
  Range,  // Good
  DisjointRange, // Good
  Line,
  Util,
  vec2, // Good
} = GameKit;

const PROGRESS_POINTS = 2;
const PRINT_AFTER_EACH_TEST = true;

let succ = 0, fail = 0

function printCol(str, col, isErr = false){
    if(isErr)
        console.error(`%s${str}%s`,`\x1b[${col}m`,`\x1b[0m`);
    else
        console.log(`%s${str}%s`,`\x1b[${col}m`,`\x1b[0m`);
}
const Colors = {
    GREY:30,RED:31,GREEN:32,YELLOW:33,BLUE:34,MAGENTA:35,
}

let failState = false;

function test(name, func){
    // Specific check for false because undefined will assume a correct
    //  test. You opt into failed state for tests 
    failState = false;
    func();      
    if(failState){
        printCol(`[GameKit] Error: Test ${name} failed`, Colors.RED, true)
        fail++;
    } else if( typeof res === "string") {
        printCol(`[GameKit] Test ${name} failed: ${res}`, Colors.RED, true)
        fail++;
    } else {
        succ++;
    }
    // Track Progress
    if(PRINT_AFTER_EACH_TEST){
        printCol(`- test ${name} done`, Colors.GREY)
    }
    else if((succ + fail) % PROGRESS_POINTS == 0) {
        printCol(`${succ+fail} tests done`, Colors.GREY)
    }
}

/**
 * 
 * @param  {...[boolean, string]|boolean} vals 
 */
function expect(...vals) {
    for(let i = 0; i < vals.length; i++) {
        if(Array.isArray(vals[i])){
            if(!vals[i][0]) {
                failState = true;
                if(vals[i][1]){
                    printCol(` -Failed: ${vals[i][1]}`, Colors.RED, true)
                }
            }
        } else if(!vals[i]) {
            failState = true;
        }
    }
}

printCol("[GameKit] Beginning Tests:", Colors.YELLOW);

test("Angle", ()=>{
    let a1 = new Angle(180,false);
    expect(a1.rad === Math.PI);
    // Math operator from valueOf()
    expect([a1 + a1 === 2 * Math.PI, `${a1 + a1}`])
    a1.rad += Math.PI;
    expect(a1.deg === 360)
});

test("Counter",()=>{
    let x = 0;
    let c1 = new Counter(10,()=>{
        x += 10;
    })
    for(let i = 0; i < 9; i++){
        c1.count();
    }
    expect(x === 0)
    c1.count()
    expect(x === 10);
    c1.count(10);
    expect([x === 20,"x === 20"]);
});

test("Range",()=>{
    let r1 = new Range(1,5);
    // Inclusive first number
    expect(r1.contains(1));
    // Non inclusive end range
    expect(!r1.contains(5));
    r1.end = 10;
    expect(r1.contains(9));
    // Start should become the end if range is put in after end
    r1.start = 15;
    expect([r1.start === 10 && r1.end === 15,"r1.start = 15"]);
    // Because of the flip, becomes 5..10 and 15 is lost
    r1.end = 5;
    expect([r1.start === 5 && r1.end === 10,"r1.end = 5"]);
})

test("Disjoint Range",()=>{
    let dr = new DisjointRange();
    dr.addRange(new Range(5,10));
    expect(dr.contains(6));
    dr.addRange(1,2)
    expect(dr.contains(1.5));
    dr.addRange(0, -1);
    expect(dr.contains(-1));
    dr.addRange(-1,10);
    expect([dr.ranges.length === 1,"Ranges should condense"]);
});

test("Vectors",()=>{
    let v = vec2(1,1);
    v.add(2,2)
    // Test isAt function
    expect(
        [v.is(3,3),"isAt(3,3)"],
        [v.is({x:3,y:3}),"isAt({x:3,y:3})"],
        [v.is(3),"isAt(3)"]
    )
    expect(v.toAngle().deg === 45);
    let v2 = vec2(1,0);
    expect(v.projOnto(v2).is(3,0));
    expect(v.dot(v2) === 3)
    expect(v.flip().is(-3,-3))
    expect(v.set(5,0).normalize().is(1,0))
    expect(v.length() === 1)
    expect(v.setLength(10).is(10,0))
    expect(v.scale(1/10).is(1,0))
});

test("Util",()=>{
    const N1 = "Unique"
    const N2 = "Unique2"
    expect(Util.ID(N1) === 0); 
    expect(Util.ID(N1) === 1); 
    expect(Util.ID(N2) === 0); 
    expect(Util.ID(N2) === 1); 
    expect(Util.ID(N2) === 2); 
    expect(Util.ID(N1) === 2); 
    expect(Util.clamp(-1,0,1) === 0)
    expect(Util.clamp(11,0,1) === 1)
    expect(Util.clamp(0.743,0,1) === 0.743)
    expect(Util.lerp(0,1,0.5) === 0.5)
    expect(Util.lerp(0,10,0.2) === 2)
    expect(Util.lerp(0,10,1.2) === 12)
    expect(vec2().from(Util.lerp2D({x:5,y:10},{x:0,y:20},0.2)).is(4,12))
})

printCol(`Tests Done: ${succ}/${succ+fail} tests passed`, Colors.YELLOW);