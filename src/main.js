
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
    if (isTouch)
        console.log('[main] Touch device detected.');
    else
        console.log('[main] This is not a touch device.');

    let container = document.getElementById('container');
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    container.appendChild(renderer.domElement);

    scene = new Scene();

    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);

    light = new HemisphereLight(0xffffff, 0xffffff, 1);
    light.position.set(0, 5, 0);
    scene.add(light);

    let g = new TorusKnotBufferGeometry(10, 3, 100, 16);
    let m = new MeshPhongMaterial({ color: 0x2194CE });
    cube = new Mesh(g, m);
    scene.add(cube);

    // Resize renderer.
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);

    // HERE.
    let widget = document.getElementById('widget');
    controls = new MobileWidgetCameraControls(widget, camera, 'quaternion', 'playstation');
    // controls = new MobileWidgetCameraControls(widget, camera, 'spherical', 'default');
}

function render()
{
    renderer.render(scene, camera);
}

function animate()
{
    requestAnimationFrame(animate);

    // Update camera rotation and position
    controls.animate();

    // Render
    render();
}
