
import 'bootstrap/dist/css/bootstrap.min.css';

// scene size
import {
    Color,
    Mesh, MeshPhongMaterial,
    PerspectiveCamera, PointLight,
    Scene, TorusKnotBufferGeometry,
    WebGLRenderer
} from 'three';
import {
    MobileWidgetCameraControls,
} from './MobileWidgetCameraControls';

// screen size
let WIDTH = window.innerWidth;
let HEIGHT = window.innerHeight;

// camera
let VIEW_ANGLE = 90;
let ASPECT = WIDTH / HEIGHT;
let NEAR = 0.1; // precision
let FAR = 5000;

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

    // let container = document.getElementById('container');
    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(WIDTH, HEIGHT);
    document.body.appendChild(renderer.domElement);

    scene = new Scene();
    scene.background = new Color(0x444444);

    camera = new PerspectiveCamera(VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);
    camera.position.set(0, 0, 30);

    let lights = [];
    lights[0] = new PointLight(0xffffff, 1, 0);
    lights[1] = new PointLight(0xffffff, 1, 0);
    lights[2] = new PointLight(0xffffff, 1, 0);
    lights[0].position.set(0, 200, 0);
    lights[1].position.set(100, 200, 100);
    lights[2].position.set(-100, -200, -100);
    scene.add(lights[0]);
    scene.add(lights[1]);
    scene.add(lights[2]);

    let g = new TorusKnotBufferGeometry(10, 3, 100, 16);
    let m = new MeshPhongMaterial({ color: 0x2194CE, shininess: 1 });
    cube = new Mesh(g, m);
    scene.add(cube);

    // Resize renderer.
    let resizeCallback =  () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeCallback, false);
    window.addEventListener('orientationchange', resizeCallback, false);

    // HERE.
    let widget = document.getElementById('widget');
    // controls = new MobileWidgetCameraControls(widget, camera, 'quaternion', 'playstation');
    controls = new MobileWidgetCameraControls(widget, camera, 'spherical', 'playstation');
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
