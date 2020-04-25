/**
 * (c) madblade 2020
 * https://creativecommons.org/licenses/by/3.0/
 * -- please consider giving credit --
 */

import { Quaternion, Vector3 } from 'three';
import { MobileWidgetControls } from './MobileWidgetControls';

/**
 * THREE.JS mobile camera FPS control.
 * @param element
 *      HTML element used to draw the canvas.
 *      For example a
 *      <div id="widget"> just under the body tag.
 * @param camera
 *      Three.JS PerspectiveCamera or .
 * @param controlsType
 *      'quaternion' for unconstrained Quaternion.
 *      'spherical' for XZ-constrained Euler angles
 *          (better for games where the player stays up).
 *      Feel free to adapt to your needs.
 * @param controlsTheme
 *      Supported themes:
 *      'playstation', 'xbox', 'default'
 * @constructor
 */
let MobileWidgetCameraControls = function(
    element, camera,
    controlsType,
    controlsTheme
) {
    this.camera = camera;
    this.controlsType = controlsType;
    this.cameraMovementSpeed = 1 / 100;
    this.cameraRotationSpeed = 1 / 100;

    // Stick states
    this.leftX = 0;
    this.leftY = 0;
    this.rightX = 0;
    this.rightY = 0;

    // For Euler-type controls
    this.rx = 0;
    this.ry = 0;

    // Callbacks
    let onLeftStickMove = (x, y) => {
        this.leftX = x;
        this.leftY = y;
    };

    let onRightStickMove = (x, y) => {
        this.rightX = x;
        this.rightY = y;
    };

    let onButtonChange = (which, isHeld) => {
        console.log(`Button ${which} ${isHeld ? 'pressed' : 'released'}.`);
    };

    this.widgetControls = new MobileWidgetControls(
        element, onLeftStickMove, onRightStickMove, onButtonChange,
        controlsTheme || 'default'
    );

    // Prevent user from selecting text while moving fingers about.
    this.widgetControls.makeDocumentUnselectable();
};

/**
 * animation utility function
 * !!!To be called at every playable/gameplay-refresh frame!!!
 */
MobileWidgetCameraControls.prototype.animate = function()
{
    // 1. Camera rotation.
    let cameraRotationSpeed = this.cameraRotationSpeed;
    let deltaX = this.rightX * cameraRotationSpeed;
    let deltaZ = this.rightY * cameraRotationSpeed;
    switch (this.controlsType) {
        case 'quaternion':
            let q = new Quaternion();
            if (Math.abs(deltaZ) > 0) {
                q.set(-deltaZ, 0, 0, 1).normalize();
                this.camera.quaternion.multiply(q);
            }
            if (Math.abs(deltaX) > 0) {
                q.set(0, -deltaX, 0, 1).normalize();
                this.camera.quaternion.multiply(q);
            }

            break;
        case 'spherical':
            if (Math.abs(deltaZ) > 0) {
                this.rx -= deltaZ * 2;
                // More convenient rotation without lock
                // if (this.rx > 3 * Math.PI / 2) this.rx -= 2 * Math.PI;
                // if (this.rx < -3 * Math.PI / 2) this.rx += 2 * Math.PI;
                this.rx = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rx));
                this.updateQuaternionFromRotation();
            }
            if (Math.abs(deltaX) > 0) {
                if (this.rx < -Math.PI / 2 || this.rx > Math.PI / 2)
                    this.ry += deltaX * 2;
                else
                    this.ry -= deltaX * 2;
                this.updateQuaternionFromRotation();
            }
            break;
        default:
            break;
    }

    // 2. Camera movement.
    let cameraMovementSpeed = this.cameraMovementSpeed;
    let dx = this.leftX * cameraMovementSpeed;
    let dy = this.leftY * cameraMovementSpeed;
    let forwardVector = this.getForwardVector(dx, -dy);
    this.camera.position.x += forwardVector.x;
    this.camera.position.z += forwardVector.z;
    // Projection on the (xz) plane if not quaternion.
    if (this.controlsType === 'quaternion') {
        this.camera.position.y += forwardVector.y;
    }

    // 3. Update gamepad model.
    this.widgetControls.animate();
};

MobileWidgetCameraControls.prototype.updateQuaternionFromRotation = function()
{
    let q1 = new Quaternion();
    let q2 = new Quaternion();
    q1.setFromAxisAngle(new Vector3(1, 0, 0), this.rx);
    q2.setFromAxisAngle(new Vector3(0, 1, 0), this.ry);
    q2.multiply(q1);
    this.camera.quaternion.copy(q2);
};

MobileWidgetCameraControls.prototype.getForwardVector = function(x, y)
{
    let nv = new Vector3(x, 0, -y);
    nv.normalize();
    let camQ = new Quaternion();
    this.camera.getWorldQuaternion(camQ);
    nv.applyQuaternion(camQ);
    return nv;
};

export { MobileWidgetCameraControls };
