
let MobileWidgetCameraControls = function(
    element, camera)
{
    this.camera = camera;
    let onLeftStickMove = function(x, y) {
        console.log(`left ${x},${y}`);
    };
    let onRightStickMove = function(x, y) {
        console.log(`right ${x},${y}`);
    };
    let onButtonPressed = function(which) {
        console.log(`button ${which}`);
    };
    this.widgetControls = new MobileWidgetControls(
        element, onLeftStickMove, onRightStickMove, onButtonPressed
    );
};

MobileWidgetCameraControls.prototype.animate = function()
{
    this.widgetControls.animate();
};

/**
 * Mobile Widget Controller
 * @param element HTMLElement used to get touch events and to draw the widget.
 * @param onLeftStickMove function(X, Y) from the stick center.
 * @param onRightStickMove function(X, Y) from the stick center.
 * @param onButtonPress function(whichButton) for additional buttons.
 * @constructor
 */
let MobileWidgetControls = function(
    element,
    onLeftStickMove,
    onRightStickMove,
    onButtonPress,
    controllerType)
{
    if (!(element instanceof HTMLElement))
        throw Error('[MobileWidgetControls] Expected element to be an HTMLElement.');

    let w = window.innerWidth;
    let h = window.innerHeight;
    let dpr = window.devicePixelRatio;

    // Overflow causes an ugly y shift (the size of the bar).
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'hidden';

    // Main objects.
    this.element = element;
    this.leftStickMoveCallback = onLeftStickMove;
    this.rightStickMoveCallback = onRightStickMove;
    this.buttonPressCallback = onButtonPress;
    this.controllerType = controllerType ? controllerType : 'playstation';

    this.currentDPR = dpr;
    this.CANVAS_ID = 'widget-drawing-canvas';
    this.TIME_MS_TO_GET_TO_ORIGINAL_POSITION = 60; // 400ms to relax
    this.buttons = [];

    this.OFFSET_CENTER = 150;
    this.leftStick = {};
    this.rightStick = {};
    this.lastTimeStamp = 0;

    // Graphics.
    let c = document.getElementById(this.CANVAS_ID);
    if (!c) {
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('id', this.CANVAS_ID);
        this.canvas.setAttribute('width', `${w}`);
        this.canvas.setAttribute('height', `${h}`);
        this.canvas.setAttribute('style', 'position: absolute; width: 100%; bottom: 0; z-index: 999;');
        this.element.appendChild(this.canvas);
    } else {
        this.canvas = c;
    }

    // Listeners.
    // TODO touch
    this.element.addEventListener('mousemove', e => this.updateMove(e));
    this.element.addEventListener('mousedown', e => this.updateDown(e));
    this.element.addEventListener('mouseup', e => this.updateUp(e));
    window.addEventListener('resize', () => this.resize());

    let touchListener = k => e => {
        let touches = e.touches;
        console.log(`${k}`);
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            let x = touch.clientX;
            let y = touch.clientY;
            console.log(`${x},${y},${k}`);
            // let el = document.elementFromPoint(x, y);
            // if (!el) continue;
            // switch (el.id) {
            //     default: break;
            // }
        }
    };

    window.addEventListener('touchstart', touchListener('start'));
    window.addEventListener('touchmove', touchListener('move'));
    window.addEventListener('touchend', touchListener('end'));
    window.addEventListener('touchcancel', touchListener('cancel')); // TODO see

    // Util.
    this._resizeRequest = null;

    // Model init.
    this.init();
};

MobileWidgetControls.prototype.getTimeInMilliseconds = function() {
    return performance.now();
};

MobileWidgetControls.prototype.init = function()
{
    let h = window.innerHeight;
    let w = window.innerWidth;

    // Resize canvas style.
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;

    // Resize model for css.
    let dpr = window.devicePixelRatio;
    if (dpr !== this.currentDPR) { // Update (because of zoom)
        console.log('[MobileWidgetControls] Zoom triggered: updating DPR.');
        this.currentDPR = dpr;
    }
    let dw = dpr * w;
    let dh = dpr * h;
    this.canvas.width = dw;
    this.canvas.height = dh;

    // No need to resize the model of whatever is gonna be drawn inside the canvas.
    // Event X and Y are going to be rescaled.
    // .

    let controllerType = this.controllerType;
    this.initButtons(controllerType, dw, dh);
    this.initSticks(controllerType, dw, dh);

    // Refresh graphics.
    this.draw();
};

/* BUTTONS */

// https://www.w3.org/TR/gamepad/
MobileWidgetControls.PlaystationControllerButtons = [
    {name: 'cross' },
    {name: 'circle' },
    {name: 'square' },
    {name: 'triangle' },
    {name: 'L1' },
    {name: 'R1' },
    {name: 'L2' },
    {name: 'R2' },
    {name: 'back' },        // select
    {name: 'forward' },     // start
    {name: 'stickLB' },
    {name: 'stickRB' },
    {name: 'dpadUp' },
    {name: 'dpadDown' },
    {name: 'dpadLeft' },
    {name: 'dpadRight' },
    {name: 'home' },
];

MobileWidgetControls.XBoxControllerButtons = [
    {name: 'A'},
    {name: 'B' },
    {name: 'X' },
    {name: 'Y' },
    {name: 'LB' },
    {name: 'RB' },
    {name: 'LT' },
    {name: 'RT' },
    {name: 'back' },        // select
    {name: 'forward' },     // start
    {name: 'stickLB' },
    {name: 'stickRB' },
    {name: 'dpadUp' },
    {name: 'dpadDown' },
    {name: 'dpadLeft' },
    {name: 'dpadRight' },
    {name: 'home'},
];

MobileWidgetControls.prototype.initButtons = function(controllerType, dw, dh)
{
    let buttons;
    switch (controllerType) {
        case 'playstation':
            buttons = MobileWidgetControls.PlaystationControllerButtons;
            break;
        case 'xbox':
            buttons = MobileWidgetControls.XBoxControllerButtons;
            break;
        default: return;
    }

    for (let bid in buttons) {
        if (!buttons.hasOwnProperty(bid)) continue;
        let button = buttons[bid];
        // button.modelOriginX = button.offsetX;
        // button.modelOriginY = dh - button.offsetY;
        // TODO from left and from right
    }
};

/* STICKS */

MobileWidgetControls.PlaystationSticks = [
    {
        name: 'left',
        from: 'l', x: 150, y: 150,
        head: 30, base: 60, grab: 150, reach: 45
    },
    {
        name: 'right',
        from: 'r', x: 150, y: 150,
        head: 20, base: 50, grab: 150, reach: 40
    },
];

MobileWidgetControls.XBoxSticks = [
    {
        name: 'left',
        from: 'l', x: 150, y: 150,
        head: 20, base: 50, grab: 150, reach: 40
    },
    {
        name: 'right',
        from: 'r', x: 150, y: 150,
        head: 20, base: 50, grab: 150, reach: 40
    },
];

MobileWidgetControls.prototype.initStick = function(dw, dh, stick, reference)
{
    stick.x = stick.y = stick.lastHeldX = stick.lastHeldY = stick.timeStampReleased = 0;
    stick.modelOriginX = reference.from === 'l' ? reference.x : dw - reference.x;
    stick.modelOriginY = dh - reference.y;
    stick.held = !1;
    stick.needsUpdate = !0;

    stick.STICK_HEAD_DIAMETER = reference.head;
    stick.STICK_BASE_DIAMETER = reference.base;
    stick.STICK_GRAB_DISTANCE = reference.grab;
    stick.STICK_REACH_DISTANCE = reference.reach;
};

MobileWidgetControls.prototype.initSticks = function(controllerType, dw, dh)
{
    let sticksReference = controllerType === 'playstation' ?
        MobileWidgetControls.PlaystationSticks :
        MobileWidgetControls.XBoxControllerButtons;

    this.initStick(dw, dh, this.leftStick, sticksReference[0]);
    this.initStick(dw, dh, this.rightStick, sticksReference[1]);

    this.lastTimeStamp = this.getTimeInMilliseconds();
};

MobileWidgetControls.prototype.distanceToStickCenter = function(cx, cy, stick)
{
    return Math.sqrt(
        Math.pow(cx - stick.modelOriginX, 2) +
        Math.pow(cy - stick.modelOriginY, 2)
    );
};

MobileWidgetControls.prototype.updateStickModelFromMove = function(cx, cy, d, stick)
{
    let vx = cx - stick.modelOriginX;
    let vy = cy - stick.modelOriginY;
    if (d > stick.STICK_REACH_DISTANCE) {
        vx *= stick.STICK_REACH_DISTANCE / d;
        vy *= stick.STICK_REACH_DISTANCE / d;
    }
    stick.x = vx;
    stick.y = vy;
    stick.lastHeldX = vx;
    stick.lastHeldY = vy;
    // console.log(`center ${stick.originX},${stick.originY}  --  mouse ${cx},${cy}  --  delta ${vx},${vy}`);
};

MobileWidgetControls.prototype.updateModelMove = function(cx, cy, stick)
{
    let d = this.distanceToStickCenter(cx, cy, stick);
    if (d < stick.STICK_GRAB_DISTANCE) {
        stick.needsUpdate = true;
        if (stick.held) this.updateStickModelFromMove(cx, cy, d, stick);
    } else if (stick.held) {
        stick.held = false;
        stick.needsUpdate = true;
        this.updateStickModelFromMove(cx, cy, d, stick);
        stick.timeStampReleased = this.getTimeInMilliseconds();
    }
};

MobileWidgetControls.prototype.updateModelHold = function(cx, cy, stick, isHolding)
{
    let d = this.distanceToStickCenter(cx, cy, stick);
    if (d < stick.STICK_GRAB_DISTANCE) {
        let wasHolding = stick.held;
        stick.held = isHolding;
        if (wasHolding && !isHolding)
            stick.timeStampReleased = this.getTimeInMilliseconds();
        stick.needsUpdate = true;
    }
};

MobileWidgetControls.prototype.updateMove = function(event)
{
    let dpr = this.currentDPR;
    let cx = event.clientX * dpr;
    let cy = event.clientY * dpr;
    this.updateModelMove(cx, cy, this.leftStick);
    this.updateModelMove(cx, cy, this.rightStick);
};

MobileWidgetControls.prototype.updateDown = function(event)
{
    let dpr = this.currentDPR;
    let cx = event.clientX * dpr;
    let cy = event.clientY * dpr;
    this.updateModelHold(cx, cy, this.leftStick, true);
    this.updateModelHold(cx, cy, this.rightStick, true);
    this.updateModelMove(cx, cy, this.leftStick);
    this.updateModelMove(cx, cy, this.rightStick);
};

MobileWidgetControls.prototype.updateUp = function(event)
{
    let cx = event.clientX; let cy = event.clientY;
    let dpr = this.currentDPR;
    this.updateModelHold(cx * dpr, cy * dpr, this.leftStick, false);
    this.updateModelHold(cx * dpr, cy * dpr, this.rightStick, false);
};

MobileWidgetControls.prototype.drawStick = function(ctx, stick)
{
    ctx.beginPath();
    ctx.globalAlpha = 0.1;
    let originXLeft = stick.modelOriginX;
    let originYLeft = stick.modelOriginY;
    ctx.arc(
        originXLeft, originYLeft,
        stick.STICK_BASE_DIAMETER, 0, 2 * Math.PI
    );
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.closePath();

    ctx.beginPath();
    ctx.globalAlpha = 0.1;
    let stickXLeft = stick.x;
    let stickYLeft = stick.y;
    ctx.arc(
        originXLeft + stickXLeft, originYLeft + stickYLeft,
        stick.STICK_HEAD_DIAMETER, 0, 2 * Math.PI
    );
    ctx.fillStyle = 'black';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'white';
    ctx.stroke();
};

MobileWidgetControls.prototype.draw = function()
{
    let canvas = this.canvas;
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawStick(ctx, this.leftStick);
    this.drawStick(ctx, this.rightStick);
};

MobileWidgetControls.prototype.interpolateStick = function(stick, newTime)
{
    let deltaT = newTime - stick.timeStampReleased;
    let maxDeltaT = this.TIME_MS_TO_GET_TO_ORIGINAL_POSITION;
    let t = this.smootherstep(0, maxDeltaT, deltaT);
    let ox = stick.modelOriginX; let oy = stick.modelOriginY;
    let newX = (ox + stick.lastHeldX) * (1 - t) + ox * t - ox;
    let newY = (oy + stick.lastHeldY) * (1 - t) + oy * t - oy;
    if (stick.x === stick.y && stick.x === stick.y)
        stick.needsUpdate = false;
    stick.x = newX;
    stick.y = newY;
};

MobileWidgetControls.prototype.animate = function()
{
    let newTime = this.getTimeInMilliseconds();
    // let deltaTime = this.lastTimeStamp - newTime;

    let leftStick = this.leftStick;
    if (!leftStick.held && leftStick.needsUpdate)
        this.interpolateStick(leftStick, newTime);
    let rightStick = this.rightStick;
    if (!rightStick.held && rightStick.needsUpdate)
        this.interpolateStick(rightStick, newTime);

    this.lastTimeStamp = newTime;
    this.draw();
};

MobileWidgetControls.prototype.resize = function()
{
    if (this._resizeRequest) clearTimeout(this._resizeRequest);
    this._resizeRequest = setTimeout(() => {
        this.init();
    }, 100);
};

/* UTIL */

MobileWidgetControls.prototype.clamp = function(t, low, high)
{
    return Math.min(high, Math.max(low, t));
};

MobileWidgetControls.prototype.smoothstep = function(end1, end2, t)
{
    let x = this.clamp((t - end1) / (end2 - end1), 0.0, 1.0);
    return x * x * (3 - 2 * x);
};

MobileWidgetControls.prototype.smootherstep = function(end1, end2, t)
{
    let x = this.clamp((t - end1) / (end2 - end1), 0.0, 1.0);
    return x * x * x * (x * (x * 6 - 15) + 10);
};

export { MobileWidgetControls, MobileWidgetCameraControls };
