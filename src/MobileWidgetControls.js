
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
    let onButtonPressed = function(which, isHeld) {
        console.log(`button ${which} ${isHeld ? 'pressed' : 'released'}.`);
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

    // Model
    this.leftStick = {};
    this.rightStick = {};
    this.buttons = [];
    this.fingers = [];

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
    this.element.addEventListener('mousemove', e => this.updateMove(e));
    this.element.addEventListener('mousedown', e => this.updateDown(e));
    this.element.addEventListener('mouseup', e => this.updateUp(e));
    window.addEventListener('resize', () => this.resize());

    // TODO touch events
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
    window.addEventListener('touchcancel', touchListener('cancel'));
    // TODO see touchcancel

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

// button order: see https://www.w3.org/TR/gamepad/

// https://patents.google.com/patent/US20130215024A1/en
MobileWidgetControls.PlaystationControllerButtons = [
    {name: 'cross',
        from: 'r', x: 150, y: 300,
        label: String.fromCharCode(10761),
        labelSize: 30, diameter: 30,
        labelOffset: 2
    },
    {name: 'circle',
        from: 'r', x: 100, y: 350,
        labelSize: 23, diameter: 30,
        label: String.fromCharCode(9711),
        labelOffset: 2
    },
    {name: 'square',
        from: 'r', x: 200, y: 350,
        labelSize: 36, diameter: 30,
        label: String.fromCharCode(9723),
        labelOffset: 2
    },
    {name: 'triangle',
        from: 'r', x: 150, y: 400,
        labelSize: 35, diameter: 30,
        label: String.fromCharCode(9651),
        labelOffset: 0
    },
    {name: 'L1',
        from: 'l', x: 150, y: 450,
        labelSize: 30, diameter: 30,
        label: 'L1', labelOffset: 0
    },
    {name: 'R1',
        from: 'r', x: 150, y: 450,
        labelSize: 30, diameter: 30,
        label: 'R1', labelOffset: 0
    },
    {name: 'L2',
        from: 'l', x: 200, y: 450,
        labelSize: 30, diameter: 30,
        label: 'L2', labelOffset: 0
    },
    {name: 'R2',
        from: 'r', x: 200, y: 450,
        labelSize: 30, diameter: 30,
        label: 'R2', labelOffset: 0
    },
    {name: 'back' },        // select
    {name: 'forward' },     // start
    {name: 'stickLB' },     // click on stick
    {name: 'stickRB' },     // click on stick
    {name: 'dpadUp',
        from: 'l', x: 150, y: 400,
        label: String.fromCharCode(8593),
        labelSize: 30, diameter: 30,
        labelOffset: 2
    },
    {name: 'dpadDown',
        from: 'l', x: 150, y: 300,
        label: String.fromCharCode(8595),
        labelSize: 30, diameter: 30,
        labelOffset: 2
    },
    {name: 'dpadLeft',
        from: 'l', x: 100, y: 350,
        label: String.fromCharCode(8592),
        labelSize: 30, diameter: 30,
        labelOffset: 2
    },
    {name: 'dpadRight',
        from: 'l', x: 200, y: 350,
        label: String.fromCharCode(8594),
        labelSize: 30, diameter: 30,
        labelOffset: 2
    },
    {name: 'home',
        from: 'l', x: 300, y: 150,
        label: 'PS',
        labelSize: 30, diameter: 30,
        labelOffset: 2
    },
];

// https://patents.google.com/patent/US8641525B2/en
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

    let modelButtons = [];
    for (let bid in buttons) {
        if (!buttons.hasOwnProperty(bid)) continue;
        let reference = buttons[bid];
        if (!reference.x || !reference.y || !reference.diameter) continue;
        if (!reference.name) {
            console.error('[MobileWidgetControls] A button must have a name property.');
        }

        let button = {};

        // model
        button.held = false;
        button.id = reference.name;

        // mandatory graphics
        button.modelOriginX = reference.from === 'l' ? reference.x : dw - reference.x;
        button.modelOriginY = dh - reference.y;
        button.BUTTON_DIAMETER = reference.diameter;

        // optional
        button.BUTTON_LABEL = reference.label;
        button.BUTTON_LABEL_SIZE = reference.labelSize;
        button.BUTTON_LABEL_OFFSET = reference.labelOffset;

        modelButtons.push(button);
    }
    this.buttons = modelButtons;
};

MobileWidgetControls.prototype.notifyButtonChanged = function(button, isHolding)
{
    if (this.buttonPressCallback) this.buttonPressCallback(button.id, isHolding);
};

MobileWidgetControls.prototype.updateButtonModelHold = function(cx, cy, buttons, isHolding)
{
    let hasHitButton = false;

    for (let i = 0, n = buttons.length; i < n; ++i)
    {
        // Get first hit button.
        let b = buttons[i];
        let d = this.distanceToObjectCenter(cx, cy, b);
        if (d > b.BUTTON_DIAMETER) continue;

        // Button hit.
        hasHitButton = true;
        if (b.held !== isHolding) {
            // console.log(`Button ${b.id} ${isHolding ? 'touched' : 'released'}.`);
            b.held = isHolding;

            // Propagate event.
            this.notifyButtonChanged(b, isHolding);
        }
        break;
    }

    return hasHitButton;
};

MobileWidgetControls.prototype.updateButtonModelMove = function(cx, cy, buttons)
{
    let hasReleasedButton = false;

    for (let i = 0, n = buttons.length; i < n; ++i)
    {
        // Get all buttons that are not touched.
        let b = buttons[i];
        let d = this.distanceToObjectCenter(cx, cy, b);
        if (d < b.BUTTON_DIAMETER) continue;

        // Button released.
        if (b.held) {
            hasReleasedButton = true;
            // console.log(`Button ${b.id} released.`);
            b.held = false;

            // Propagate.
            this.notifyButtonChanged(b, false);
        }
    }

    return hasReleasedButton;
};

MobileWidgetControls.prototype.drawButton = function(ctx, button)
{
    // Background
    ctx.beginPath();
    ctx.globalAlpha = 0.3;
    let originXLeft = button.modelOriginX;
    let originYLeft = button.modelOriginY;
    ctx.arc(
        originXLeft, originYLeft,
        button.BUTTON_DIAMETER, 0, 2 * Math.PI
    );
    ctx.fillStyle = button.held ? '#222222' : 'black';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.closePath();

    // Label
    ctx.beginPath();
    ctx.font = `${button.BUTTON_LABEL_SIZE}px Arial`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.4;
    ctx.fillText(button.BUTTON_LABEL,
        originXLeft, originYLeft + (button.BUTTON_LABEL_OFFSET || 0)
    );
    // ctx.fill();
    // ctx.lineWidth = 2;
    // ctx.strokeStyle = 'white';
    // ctx.stroke();
    ctx.closePath();
};

/* STICKS */

MobileWidgetControls.PlaystationSticks = [
    {
        name: 'left',
        from: 'l', x: 150, y: 150,
        head: 30, base: 60, grab: 150, reach: 45,
        theme: 'gradient'
    },
    {
        name: 'right',
        from: 'r', x: 150, y: 150,
        head: 20, base: 50, grab: 150, reach: 40,
        // label: String.fromCharCode(10021), // multi-directional cross
        // labelSize: 30,
        // labelOffset: 2, // offset i.e. for caps letters
        theme: 'gradient'
    },
];

MobileWidgetControls.XBoxSticks = [
    {
        name: 'left',
        from: 'l', x: 150, y: 150,
        head: 20, base: 50, grab: 150, reach: 40,
        theme: 'dark'
    },
    {
        name: 'right',
        from: 'r', x: 150, y: 150,
        head: 20, base: 50, grab: 150, reach: 40,
        theme: 'dark'
    },
];

MobileWidgetControls.prototype.initStick = function(dw, dh, stick, reference)
{
    stick.x = stick.y = stick.lastHeldX = stick.lastHeldY = stick.timeStampReleased = 0;
    stick.modelOriginX = reference.from === 'l' ? reference.x : dw - reference.x;
    stick.modelOriginY = dh - reference.y;
    stick.held = !1;
    stick.needsUpdate = !0;

    // graphics constants
    stick.STICK_HEAD_DIAMETER = reference.head;
    stick.STICK_BASE_DIAMETER = reference.base;
    stick.STICK_GRAB_DISTANCE = reference.grab;
    stick.STICK_REACH_DISTANCE = reference.reach;

    // optional
    stick.STICK_LABEL = reference.label;
    stick.STICK_LABEL_SIZE = reference.labelSize;
    stick.STICK_LABEL_OFFSET = reference.labelOffset;
    stick.style = reference.theme;
};

MobileWidgetControls.prototype.initSticks = function(controllerType, dw, dh)
{
    let sticksReference = controllerType === 'playstation' ?
        MobileWidgetControls.PlaystationSticks :
        MobileWidgetControls.XBoxControllerButtons;

    this.initStick(dw, dh, this.leftStick, sticksReference[0]);
    this.initStick(dw, dh, this.rightStick, sticksReference[1]);
};

MobileWidgetControls.prototype.notifyStickMoved = function(vx, vy, stick)
{
    if (stick === this.leftStick) {
        if (this.leftStickMoveCallback) this.leftStickMoveCallback(vx, vy);
    } else if (stick === this.rightStick) {
        if (this.rightStickMoveCallback) this.rightStickMoveCallback(vx, vy);
    }
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

    this.notifyStickMoved(vx, vy, stick);
};

MobileWidgetControls.prototype.updateStickModelMove = function(cx, cy, stick)
{
    let d = this.distanceToObjectCenter(cx, cy, stick);
    if (d < stick.STICK_GRAB_DISTANCE) { // stick grab
        stick.needsUpdate = true;
        if (stick.held) this.updateStickModelFromMove(cx, cy, d, stick);
    } else if (stick.held) { // stick release
        stick.held = false;
        stick.needsUpdate = true;
        this.updateStickModelFromMove(cx, cy, d, stick);
        stick.timeStampReleased = this.getTimeInMilliseconds();
    }
};

MobileWidgetControls.prototype.updateStickModelHold = function(cx, cy, stick, isHolding)
{
    let d = this.distanceToObjectCenter(cx, cy, stick);
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
    this.updateButtonModelMove(cx, cy, this.buttons);

    this.updateStickModelMove(cx, cy, this.leftStick);
    this.updateStickModelMove(cx, cy, this.rightStick);
};

MobileWidgetControls.prototype.updateDown = function(event)
{
    let dpr = this.currentDPR;
    let cx = event.clientX * dpr;
    let cy = event.clientY * dpr;
    let hasHitButton = this.updateButtonModelHold(cx, cy, this.buttons, true);
    if (hasHitButton) return;

    this.updateStickModelHold(cx, cy, this.leftStick, true);
    this.updateStickModelHold(cx, cy, this.rightStick, true);
    this.updateStickModelMove(cx, cy, this.leftStick);
    this.updateStickModelMove(cx, cy, this.rightStick);
};

MobileWidgetControls.prototype.updateUp = function(event)
{
    let cx = event.clientX; let cy = event.clientY;
    let dpr = this.currentDPR;
    this.updateButtonModelHold(cx, cy, this.buttons, false);

    this.updateStickModelHold(cx * dpr, cy * dpr, this.leftStick, false);
    this.updateStickModelHold(cx * dpr, cy * dpr, this.rightStick, false);
};

MobileWidgetControls.prototype.drawStick = function(ctx, stick)
{
    let originXLeft = stick.modelOriginX;
    let originYLeft = stick.modelOriginY;

    // Base
    ctx.beginPath();
    ctx.globalAlpha = 0.1;
    ctx.arc(
        originXLeft, originYLeft,
        stick.STICK_BASE_DIAMETER, 0, 2 * Math.PI
    );
    if (stick.style === 'gradient') {
        let gradient = ctx.createRadialGradient(
            originXLeft, originYLeft, 2, // inner
            originXLeft, originYLeft, stick.STICK_BASE_DIAMETER // outer
        );
        gradient.addColorStop(0, 'gray');
        gradient.addColorStop(0.7, 'gray');
        gradient.addColorStop(0.9, 'silver');
        gradient.addColorStop(1, 'white');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = 'black';
    }
    ctx.fill();
    if (stick.style !== 'gradient') {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }
    ctx.closePath();

    // Head
    let stickXLeft = stick.x;
    let stickYLeft = stick.y;
    ctx.beginPath();
    ctx.globalAlpha = 0.1;
    ctx.arc(
        originXLeft + stickXLeft, originYLeft + stickYLeft,
        stick.STICK_HEAD_DIAMETER, 0, 2 * Math.PI
    );
    if (stick.style === 'gradient') {
        ctx.globalAlpha = 0.15;
        let gradient = ctx.createRadialGradient(
            originXLeft + stickXLeft, originYLeft + stickYLeft, 2, // inner
            originXLeft + stickXLeft, originYLeft + stickYLeft, stick.STICK_HEAD_DIAMETER // outer
        );
        gradient.addColorStop(0, 'darkgray');
        gradient.addColorStop(0.7, 'darkgray');
        gradient.addColorStop(0.9, 'whitesmoke');
        gradient.addColorStop(1, 'white');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = 'black';
    }
    ctx.fill();
    if (stick.style !== 'gradient') {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }
    ctx.closePath();

    // Optional label
    if (stick.STICK_LABEL && stick.STICK_LABEL_SIZE) {
        ctx.beginPath();
        ctx.font = `${stick.STICK_LABEL_SIZE}px Arial`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.1;
        ctx.fillText(stick.STICK_LABEL,
            originXLeft + stickXLeft,
            originYLeft + stickYLeft + (stick.STICK_LABEL_OFFSET || 0)
        );
        ctx.closePath();
    }
};

MobileWidgetControls.prototype.draw = function()
{
    let canvas = this.canvas;
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawStick(ctx, this.leftStick);
    this.drawStick(ctx, this.rightStick);
    let buttons = this.buttons;
    for (let i = 0, n = buttons.length; i < n; ++i) {
        this.drawButton(ctx, buttons[i]);
    }
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

    // Propagate event.
    if (stick.needsUpdate)
        this.notifyStickMoved(newX, newY, stick);
};

MobileWidgetControls.prototype.animate = function()
{
    let newTime = this.getTimeInMilliseconds();

    let leftStick = this.leftStick;
    if (!leftStick.held && leftStick.needsUpdate)
        this.interpolateStick(leftStick, newTime);
    let rightStick = this.rightStick;
    if (!rightStick.held && rightStick.needsUpdate)
        this.interpolateStick(rightStick, newTime);

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

MobileWidgetControls.prototype.distanceToObjectCenter = function(cx, cy, object)
{
    return Math.sqrt(
        Math.pow(cx - object.modelOriginX, 2) +
        Math.pow(cy - object.modelOriginY, 2)
    );
};

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
