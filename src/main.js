
import 'bootstrap/dist/css/bootstrap.min.css';

// scene size
import {
    HemisphereLight, Mesh, MeshPhongMaterial,
    PerspectiveCamera,
    Scene, TorusKnotBufferGeometry,
    WebGLRenderer
} from 'three';
import {
    MobileWidgetCameraControls,
    MobileWidgetControls
} from './MobileWidgetControls';

// scene size
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

// camera
let VIEW_ANGLE = 90;
let ASPECT = WIDTH / HEIGHT;
let NEAR = 0.1; // precision
let FAR = 5000;

let light;
let cube;
let camera;
let scene;
let renderer;
let controls;

init();
animate();

function init()
{
    const isTouch = 'ontouchstart' in window || navigator.msMaxTouchPoints > 0;
    if (isTouch) {
        // TODO
    } else {
        // TODO
    }

    let container = document.getElementById('container');
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH - 50, HEIGHT - 50);
    container.appendChild(renderer.domElement);

    scene = new Scene();

    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);

    light = new HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(light);

    let g = new TorusKnotBufferGeometry();
    let m = new MeshPhongMaterial({ color: 0x2194CE });
    cube = new Mesh(g, m);
    scene.add(cube);

    //
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        // renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    // Here.
    let widget = document.getElementById('widget');
    controls = new MobileWidgetCameraControls(widget, camera);
    console.log('open');
}

function render()
{
    renderer.render(scene, camera);
}

function animate() {
    requestAnimationFrame(animate);

    // Update controls
    // if (state.touchLeft) eventContainer.push([0.006, 0]);
    // if (state.touchRight) eventContainer.push([-0.006, 0]);
    // if (state.touchUp) eventContainer.push([0, 0.006]);
    // if (state.touchDown) eventContainer.push([0, -0.006]);
    // for (let i = 0; i < eventContainer.length; ++i) {
    //     let e = eventContainer[i];
    //     if (e[0]) cameraWrapper.rotateZ(e[0]);
    //     if (e[1]) cameraWrapper.rotateX(e[1]);
    // }
    // eventContainer.length = 0;

    // Update camera position
    // updatePlayerPosition();
    controls.animate();

    // Render
    render();
}
