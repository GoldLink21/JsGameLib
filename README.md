## A very simple Js game engine

There are two actual examples in the folders "BrickBreaker" and "Mimic"

# Features 
- Very simple setup
- Auto drawing and rendering
- Image support
- Allows pre and post drawing functions
- Rectangle based entity system
- Ents can rotate and have different collisions based on rotation
- Particles!
- Particle Systems!
- Easy Keyboard and Mouse inputs
  - This includes an event that allows running a function on single keypress only once
- Pan-able and zoom-able camera
- Simple angle system
- A lot of typings via JSDocs
- Utility Random functions
- UI functionality

## Planned Features
- Audio handling

# To Use
Add this to the head of your HTML
`<script src='./Route/To/gameKit-2.js' type="module"></script>`
As well as  
`<base href=".">`
Make sure your main file is also of `type="module"`

## Simple Setup
```Js
import * as GameKit from "./gameKit-2.js"
// Initializes everything
GameKit.makeCanvas()
```

## Hooking into events
```Js
addEventListener(GameKit.EventNames.postDraw,event=>{
  let ctx = event.detail.ctx
  // ...
})
```
Those events include a few things like `tick, postDraw, preDraw` and hopefully more in the future

## Handle Input
```Js
// Tells what keys are used in the game
//  There are some shortcut inputs for multiple keys at once
GameKit.trackKeys("wasd", "r")

addEventListener(GameKit.EventNames.tick,()=>{
  if(Controls.pressed["w"]) {
    // handle what happens
  }
})
```

If you want to do an action once when a key gets pushed, there is a shortcut
```Js
GameKit.Controls.addPressOnceEvent("w",()=>{
  // Do stuff
})
```

## UI
```Js
//TODO

```