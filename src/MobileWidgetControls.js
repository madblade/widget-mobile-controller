
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
        console.log(window.devicePixelRatio);
    };
    this.widgetControls = new MobileWidgetControls(
        element, onLeftStickMove, onRightStickMove, onButtonPressed,
        'xbox'
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
    this.controllerType = controllerType ? controllerType : 'default';

    // Device pixel ratio trick to correctly initialize the model on mobile
    // (where zooming is disabled)
    // and to keep the model the right size when zooming on desktop.
    this.currentDPR = dpr;
    this.initialDPR = dpr;

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
    // this.element.addEventListener('mousemove', e => this.updateMove(e));
    // this.element.addEventListener('mousedown', e => this.updateDown(e));
    // this.element.addEventListener('mouseup', e => this.updateUp(e));
    window.addEventListener('resize', () => this.resize());

    // TODO touch events
    let touchListener = k => e => {
        let touches = e.touches;
        console.log(`${k}`);
        console.log(e);
        console.log(touches);
        this.fingers = [];
        for (let i = 0; i < touches.length; ++i) {
            let touch = touches[i];
            let x = touch.clientX;
            let y = touch.clientY;
            this.fingers.push({x, y});
            console.log(`${x},${y},${k}`);
            // let el = document.elementFromPoint(x, y);
            // if (!el) continue;
            // switch (el.id) {
            //     default: break;
            // }
        }

        let changedTouches = e.changedTouches;
        for (let i = 0; i < changedTouches.length; ++i) {
            let touch = changedTouches[i];
            if (k === 'end') this.updateUp(touch);
            else if (k === 'move') this.updateMove(touch);
            else if (k === 'start') this.updateDown(touch);
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
        from: 'r', x: 85, y: 75,
        label: String.fromCharCode(10761),
        labelSize: 30, diameter: 30, labelOffset: 2,
        theme: 'gradient'
    },
    {name: 'circle',
        from: 'r', x: 40, y: 120,
        labelSize: 23, diameter: 30,
        label: String.fromCharCode(9711), labelOffset: 2,
        theme: 'gradient'
    },
    {name: 'square',
        from: 'r', x: 130, y: 120,
        labelSize: 36, diameter: 30,
        label: String.fromCharCode(9723), labelOffset: 2,
        theme: 'gradient'
    },
    {name: 'triangle',
        from: 'r', x: 85, y: 165,
        labelSize: 35, diameter: 30,
        label: String.fromCharCode(9651), labelOffset: 0,
        theme: 'gradient'
    },
    {name: 'L1',
        from: 'l', x: 110, y: 260,
        labelSize: 30, diameter: 30,
        label: 'L1', labelOffset: 3,
        theme: 'gradient'
    },
    {name: 'R1',
        from: 'r', x: 110, y: 260,
        labelSize: 30, diameter: 30,
        label: 'R1', labelOffset: 3,
        theme: 'gradient'
    },
    {name: 'L2',
        from: 'l', x: 50, y: 280,
        labelSize: 30, diameter: 30,
        label: 'L2', labelOffset: 3,
        theme: 'gradient'
    },
    {name: 'R2',
        from: 'r', x: 50, y: 280,
        labelSize: 30, diameter: 30,
        label: 'R2', labelOffset: 3,
        theme: 'gradient'
    },
    {name: 'back' },        // select
    {name: 'forward' },     // start
    {name: 'stickLB' },     // click on stick
    {name: 'stickRB' },     // click on stick
    {name: 'dpadUp',
        from: 'l', x: 65, y: 205,
        label: String.fromCharCode(8593),
        labelSize: 20, diameter: 23,
        labelOffset: 0,
        theme: 'gradient'
    },
    {name: 'dpadDown',
        from: 'l', x: 65, y: 135,
        label: String.fromCharCode(8595),
        labelSize: 20, diameter: 23,
        labelOffset: 0,
        theme: 'gradient'
    },
    {name: 'dpadLeft',
        from: 'l', x: 30, y: 170,
        label: String.fromCharCode(8592),
        labelSize: 20, diameter: 23,
        labelOffset: 0,
        theme: 'gradient'
    },
    {name: 'dpadRight',
        from: 'l', x: 100, y: 170,
        label: String.fromCharCode(8594),
        labelSize: 20, diameter: 23,
        labelOffset: 0,
        theme: 'gradient'
    },
    {name: 'home',
        // from: 'l', x: 300, y: 150,
        // label: 'PS',
        // labelSize: 10, diameter: 20,
        // labelOffset: 2,
        // theme: 'gradient'
    },
];

// https://patents.google.com/patent/US8641525B2/en
MobileWidgetControls.XBoxControllerButtons = [
    {name: 'A',
        from: 'r', diameter: 25,
        x: 80, y: 35,
        label: 'A', labelSize: 20, labelOffset: 2,
    },
    {name: 'B',
        from: 'r', diameter: 25,
        x: 45, y: 75,
        label: 'B', labelSize: 20, labelOffset: 2,
    },
    {name: 'X',
        from: 'r', diameter: 25,
        x: 115, y: 75,
        label: 'X', labelSize: 20, labelOffset: 2,
    },
    {name: 'Y',
        from: 'r', diameter: 25,
        x: 80, y: 115,
        label: 'Y', labelSize: 20, labelOffset: 2,
    },
    {name: 'LB',
        from: 'l', diameter: 35,
        x: 135, y: 205,
        label: 'LB', labelSize: 20, labelOffset: 2,
    },
    {name: 'RB',
        from: 'r', diameter: 35,
        x: 130, y: 180,
        label: 'RB', labelSize: 20, labelOffset: 2,
    },
    {name: 'LT',
        from: 'l', diameter: 35,
        x: 45, y: 210,
        label: 'LT', labelSize: 20, labelOffset: 2,
    },
    {name: 'RT',
        from: 'r', diameter: 35,
        x: 45, y: 200,
        label: 'RT', labelSize: 20, labelOffset: 2,
    },
    {name: 'back',
    },        // select
    {name: 'forward',
    },     // start
    {name: 'stickLB',
    },
    {name: 'stickRB',
    },
    {name: 'dpadUp',
        from: 'l', diameter: 15,
        x: 220, y: 73,
        label: String.fromCharCode(8593), labelSize: 20, labelOffset: 0,
    },
    {name: 'dpadDown',
        from: 'l', diameter: 15,
        x: 220, y: 27,
        label: String.fromCharCode(8595), labelSize: 20, labelOffset: 0,
    },
    {name: 'dpadLeft',
        from: 'l', diameter: 15,
        x: 197, y: 50,
        label: String.fromCharCode(8592), labelSize: 20, labelOffset: 0,
    },
    {name: 'dpadRight',
        x: 243, y: 50,
        from: 'l', diameter: 15,
        label: String.fromCharCode(8594), labelSize: 20, labelOffset: 0,
    },
    {name: 'home',
    },
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
        default:
            // No buttons.
            return;
    }

    let dpr = this.initialDPR;
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
        button.modelOriginX = reference.from === 'l' ? dpr * reference.x : dw - dpr * reference.x;
        button.modelOriginY = dh - dpr * reference.y;
        button.BUTTON_DIAMETER = dpr * reference.diameter;
        button.style = reference.theme;

        // optional
        button.BUTTON_LABEL = reference.label;
        button.BUTTON_LABEL_SIZE = dpr * reference.labelSize;
        button.BUTTON_LABEL_OFFSET = dpr * reference.labelOffset;

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

        if (!b.held) continue; // b wasn’t held.

        let d = this.distanceToObjectCenter(cx, cy, b);
        if (d < b.BUTTON_DIAMETER) continue; // b wasn’t under finger.

        // Test b against every finger.
        let isUnderAnotherFinger = false;
        let fs = this.fingers;
        let dpr = this.currentDPR;
        for (let j = 0; j < fs.length; ++j) {
            let f = fs[j];
            let d2 = this.distanceToObjectCenter(dpr * f.x, dpr * f.y, b);
            if (d2 < b.BUTTON_DIAMETER) {
                isUnderAnotherFinger = true;
                break;
            }
        }
        if (isUnderAnotherFinger) continue; // b is under finger, but another one.

        hasReleasedButton = true;
        // console.log(`Button ${b.id} released.`);
        b.held = false;

        // Propagate.
        this.notifyButtonChanged(b, false);
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

    // ctx.fillStyle = button.held ? '#222222' : 'black';

    if (button.style === 'gradient') {
        let gradient = ctx.createRadialGradient(
            originXLeft, originYLeft, 2, // inner
            originXLeft, originYLeft, button.BUTTON_DIAMETER // outer
        );
        gradient.addColorStop(0, button.held ? 'silver' : 'black');
        gradient.addColorStop(0.7, button.held ? 'silver' : 'black');
        gradient.addColorStop(0.9, 'silver');
        gradient.addColorStop(1, 'silver');
        ctx.fillStyle = gradient;
    } else {
        ctx.fillStyle = button.held ? '#222222' : 'black';
    }
    ctx.fill();
    if (button.style !== 'gradient') {
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'white';
        ctx.stroke();
    }
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

MobileWidgetControls.DefaultSticks = [
    {
        name: 'left',
        from: 'l', x: 80, y: 80,
        head: 25, base: 70, grab: 150, reach: 55,
        label: String.fromCharCode(10021), // multi-directional cross
        labelSize: 30,
        labelOffset: 2, // offset i.e. for caps letters
        theme: 'gradient'
    },
    {
        name: 'right',
        from: 'r', x: 80, y: 80,
        head: 25, base: 70, grab: 150, reach: 55,
        label: String.fromCharCode(10021), // multi-directional cross
        labelSize: 30,
        labelOffset: 2, // offset i.e. for caps letters
        theme: 'gradient'
    },
];

MobileWidgetControls.PlaystationSticks = [
    {
        name: 'left',
        from: 'l', x: 155, y: 80,
        head: 25, base: 70, grab: 150, reach: 55,
        theme: 'gradient'
    },
    {
        name: 'right',
        from: 'r', x: 240, y: 100,
        head: 25, base: 70, grab: 150, reach: 55,
        // label: String.fromCharCode(10021), // multi-directional cross
        // labelSize: 30,
        // labelOffset: 2, // offset i.e. for caps letters
        theme: 'gradient'
    },
];

MobileWidgetControls.XBoxSticks = [
    {
        name: 'left',
        from: 'l', x: 90, y: 90,
        head: 35, base: 80, grab: 150, reach: 65,
        theme: 'dark'
    },
    {
        name: 'right',
        from: 'r', x: 240, y: 80,
        head: 30, base: 70, grab: 130, reach: 55,
        theme: 'dark'
    },
];

MobileWidgetControls.prototype.initStick = function(dw, dh, stick, reference)
{
    let dpr = this.initialDPR;
    stick.x = stick.y = stick.lastHeldX = stick.lastHeldY = stick.timeStampReleased = 0;
    stick.modelOriginX = reference.from === 'l' ? dpr * reference.x : dw - dpr * reference.x;
    stick.modelOriginY = dh - dpr * reference.y;
    stick.held = !1;
    stick.needsUpdate = !0;

    // graphics constants
    stick.STICK_HEAD_DIAMETER = dpr * reference.head;
    stick.STICK_BASE_DIAMETER = dpr * reference.base;
    stick.STICK_GRAB_DISTANCE = dpr * reference.grab;
    stick.STICK_REACH_DISTANCE = dpr * reference.reach;

    // optional
    stick.STICK_LABEL = reference.label;
    stick.STICK_LABEL_SIZE = dpr * reference.labelSize;
    stick.STICK_LABEL_OFFSET = dpr * reference.labelOffset;
    stick.style = reference.theme;
};

MobileWidgetControls.prototype.initSticks = function(controllerType, dw, dh)
{
    let sticksReference;
    switch (controllerType) {
        case 'playstation':
            sticksReference = MobileWidgetControls.PlaystationSticks;
            break;
        case 'xbox':
            sticksReference = MobileWidgetControls.XBoxSticks;
            break;
        default:
            sticksReference = MobileWidgetControls.DefaultSticks;
            break;
    }

    this.initStick(dw, dh, this.leftStick, sticksReference[0]);
    this.initStick(dw, dh, this.rightStick, sticksReference[1]);
};

MobileWidgetControls.prototype.notifyStickMoved = function(vx, vy, stick)
{
    let normX = vx / stick.STICK_REACH_DISTANCE;
    let normY = vy / stick.STICK_REACH_DISTANCE;
    if (stick === this.leftStick) {
        if (this.leftStickMoveCallback) this.leftStickMoveCallback(normX, normY);
    } else if (stick === this.rightStick) {
        if (this.rightStickMoveCallback) this.rightStickMoveCallback(normX, normY);
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
    let dpr = this.currentDPR;
    let cx = dpr * event.clientX;
    let cy = dpr * event.clientY;

    this.updateButtonModelHold(cx, cy, this.buttons, false);

    this.updateStickModelHold(cx, cy, this.leftStick, false);
    this.updateStickModelHold(cx, cy, this.rightStick, false);
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

// MobileWidgetControls.prototype.smoothstep = function(end1, end2, t)
// {
//     let x = this.clamp((t - end1) / (end2 - end1), 0.0, 1.0);
//     return x * x * (3 - 2 * x);
// };

MobileWidgetControls.prototype.smootherstep = function(end1, end2, t)
{
    let x = this.clamp((t - end1) / (end2 - end1), 0.0, 1.0);
    return x * x * x * (x * (x * 6 - 15) + 10);
};

export { MobileWidgetControls, MobileWidgetCameraControls };
