import { BoxGeometry, Euler, Intersection, Mesh, MeshNormalMaterial, Object3D, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3 } from "three";
import { acceleratedRaycast } from 'three-mesh-bvh';

Mesh.prototype.raycast = acceleratedRaycast;

export class Caster {
    public width: number = 0
    public height: number = 0
    public mouse: Vector2
    public mouseMoveDistance: number = 0
    public mouseHelper: Mesh
    public intersects: Array<Intersection>
    public isIntersect: boolean
    public point: Vector3
    public normal: Vector3
    public object: any
    public stickerPoint: Vector3
    public stickerNormal: Vector3
    public stickerRotation: Euler
    public stickerObject: any
    public ray: Raycaster

    constructor() {
        this.mouse = new Vector2(0, 0)
        this.mouseHelper = new Mesh(new BoxGeometry(0.02, 0.02, 0.1), new MeshNormalMaterial());
        this.mouseHelper.visible = true
        this.mouseHelper.matrixWorldNeedsUpdate = true;
        this.ray = new Raycaster()
        this.ray['firstHitOnly'] = true;
        this.point = new Vector3()
        this.normal = new Vector3()
        this.stickerPoint = new Vector3()
        this.stickerNormal = new Vector3()
        this.stickerRotation = new Euler()
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    public createMouseHelper(scene: Scene): void {
        this.mouseHelper = new Mesh(new BoxGeometry(0.01, 0.01, 0.1), new MeshNormalMaterial());
        this.mouseHelper.visible = true;
        this.mouseHelper.matrixWorldNeedsUpdate = true;
        scene.add(this.mouseHelper);
    }

    public setSize(width: number, height: number): void {
        this.width = width
        this.height = height
    }

    public setMouse(event: MouseEvent): void {
        this.mouse.x = ((event.clientX - (event.clientX - event.offsetX)) / this.width) * 2 - 1;
        this.mouse.y = -((event.clientY - (event.clientY - event.offsetY)) / this.height) * 2 + 1;
    }

    public setTouch(event: TouchEvent): void {
        this.mouse.x = ((event.touches[0].clientX - (event.touches[0].clientX - event.touches[0].pageX)) / this.width) * 2 - 1;
        this.mouse.y = -((event.touches[0].clientY - (event.touches[0].clientY - event.touches[0].pageY)) / this.height) * 2 + 1;
    }

    public setFromCamera(camera: PerspectiveCamera): void {
        this.ray.setFromCamera(this.mouse, camera)
    }

    public check(object: Object3D): void {
        this.intersects = this.ray.intersectObjects([object])
        this.isIntersect = this.intersects?.length > 0

        if (!this.isIntersect) return;
        const p = this.intersects[0].point;
        this.mouseHelper.position.copy(p);
        this.point.copy(p);
        this.object = this.intersects[0].object;
        const n = this.intersects[0].face.normal.clone();
        n.transformDirection(object.matrixWorld);
        n.add(this.intersects[0].point);
        this.normal.copy(this.intersects[0].face.normal);
        this.mouseHelper.lookAt(n);
    }

    public destroy(): void {
        this.mouseHelper.geometry.dispose()
    }
}