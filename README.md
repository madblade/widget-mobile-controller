# Mobile Widget Controls

First-person controls for mobile devices.

![Default](https://raw.githubusercontent.com/madblade/widget-mobile-controller/master/img/default.jpg)


## Usage

Requires 'import', available in an ES6-compatible environment. See [Babel.js](https://babeljs.io/).

#### With a Three.js PerspectiveCamera

```javascript
import { MobileWidgetCameraControls } from 'MobileWidgetCameraControls.js';
// ...
var element = document.getElementById('widget-div');
var camera = new PerspectiveCamera(...options);
// ...
var controls = new MobileWidgetControls(element, camera, 'spherical', 'default');
// ...
function animate() {
    requestAnimationFrame(animate);

    // Update camera rotation and position
    controls.animate();

    render();
}
 ```

#### In a custom application

Same setup with custon listeners.
```javascript
import { MobileWidgetControls } from 'MobileWidgetControls.js';
// ...
var element = document.getElementById('widget-div');
// ...
var onLeftStickMove = function(x, y) {
    // (x, y) a vector in the unit disk, representing the stick.
};
var onRightStickMove = function(x, y) { };
var onButtonChange = function(buttonName, isHolding) {
    // 'buttonName' changed state, as tells the boolean 'isHolding'.
};
var widgetControls = new MobileWidgetControls(
    element, onLeftStickMove, onRightStickMove, onButtonChange,
    'default'
);
// ...
function animate() {
    requestAnimationFrame(animate);

    // Update camera rotation and position
    controls.animate();

    render();
}
```


## Options

#### MobileWidgetCameraControls

| Option | Description |
| --- | --- |
| `element` | HTML element used to draw the canvas. For example a <div id="widget"> just under the body tag. |
| `camera` | Three.js PerspectiveCamera |
| `controlsType` | 'quaternion' for unconstrained Quaternion. |
| | 'spherical' for XZ-constrained Euler angles (best when player stays up) |
| `controlsTheme` | Supported themes: 'playstation', 'xbox', 'default' |

Note: The file can be modified to handle button events.
The list of buttons (and ids through button.id) is available through the variable controls.widgetControls.buttons.

Settings `controls.cameraMovementSpeed` and `controls.cameraRotationSpeed` can be modified after the object declaration.

#### MobileWidgetControls

| Option | Description |
| --- | --- |
| `element`  | HTMLElement used to get touch events and to draw the widget |
| `onLeftStickMove` | function(X, Y) in the unit disk from the left stick center |
| `onRightStickMove` | function(X, Y) in the unit disk from the left stick center |
| `onButtonPress` | function(whichButton, isHolding) for additional buttons behavior |
| `controllerType` | 'playstation,' 'xbox,' 'default' |

Note: The list of buttons is available through the variable controls.buttons.


## Themes

| Theme | Description |
| --- | --- |
| `default` |  Two basic sticks |
| `playstation` | Two white sticks + DualShock 4 buttons |
| `xbox` |  Two black sticks + XBox One buttons |


## Examples

![Playstation](https://raw.githubusercontent.com/madblade/widget-mobile-controller/master/img/playstation.jpg)

![XBox](https://raw.githubusercontent.com/madblade/widget-mobile-controller/master/img/xbox.jpg)

![Default](https://raw.githubusercontent.com/madblade/widget-mobile-controller/master/img/default.jpg)
