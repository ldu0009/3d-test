
import CameraControls from 'camera-controls';
import * as THREE from 'three';

CameraControls.install({ THREE: THREE });

export class MyCameraControls extends CameraControls {
    constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
        super(camera, canvas);
    }
}