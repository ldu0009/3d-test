import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Box3, BufferGeometry, Color, Float32BufferAttribute, Group, Line, LineBasicMaterial, LinearSRGBColorSpace, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PlaneGeometry, PointLight, Raycaster, RepeatWrapping, SRGBColorSpace, Scene, Sphere, SphereGeometry, TextureLoader, Vector3, WebGLRenderer } from 'three/src/Three.js';
import { MyCameraControls } from './common/camera-controls';
import { MyLoader } from './common/threed-loader';
import { DragAndDropDirective } from './directive/drag-and-drop.directive';
import { DSTModel } from './common/DSTModel';
import { Caster } from './common/caster';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree, getTriangleHitPointInfo } from 'three-mesh-bvh'

Mesh.prototype.raycast = acceleratedRaycast;
BufferGeometry.prototype['computeBoundsTree'] = computeBoundsTree;
BufferGeometry.prototype['disposeBoundsTree'] = disposeBoundsTree;
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, DragAndDropDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasDom') canvasDom: ElementRef<HTMLDivElement> | undefined;
  @ViewChild('canvas') canvas: ElementRef<HTMLCanvasElement> | undefined;

  protected camera: PerspectiveCamera | undefined;
  protected caster: Caster | undefined;
  protected controls: MyCameraControls | undefined;
  protected raycaster: Raycaster | undefined;
  protected renderer: WebGLRenderer | undefined;
  protected scene: Scene | undefined;
  protected sticker: any

  protected dstModel: DSTModel | undefined;
  protected group: Group | undefined;


  private animationFrameId: number | undefined;
  private textureLoader: TextureLoader = new TextureLoader();
  private loader: MyLoader = new MyLoader();

  constructor(private cd: ChangeDetectorRef) { }

  // -----------------------------------------------------------------------------------------------------
  //  @ Lifecycle Hooks
  // -----------------------------------------------------------------------------------------------------

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {
    this.createScene();
    this.createRenderer();
    this.createCamera();
    this.createCameraControls();
    this.createLight()

    this.renderScene();
    this.onResize();
  }

  ngOnDestroy(): void {
    this.cancelAnimationFrame();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  public inputFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.item(0);

    if (!file) return;

    this.loader.load(file).then((data: any) => {
      console.log(data)
    })
  }

  public onFileChange(files: any): void {
    if (!files) return;

    const file = files.item(0);

    if (!file) return;

    this.loader.load(file).then((data: any) => {

      if (!this.scene || !data.scene) return;
      this.group.add(data.scene);

      if (!this.camera) return;
      this.camera.lookAt(data.scene.position)

      if (!this.controls) return;

      const box = new Box3().setFromObject(data.scene);
      const size = box.getSize(new Vector3());
      const center = new Vector3();
      const maxDim = Math.max(size.x, size.y, size.z);
      box.getCenter(center);

      this.controls.setTarget(center.x, center.y, center.z, true);
      this.controls.setPosition(0, 0, maxDim * 10).then(() => {
        if (!this.controls) return;
        this.controls.fitToBox(data.scene, true, { paddingTop: maxDim / 5, paddingBottom: maxDim / 5, paddingLeft: maxDim / 5, paddingRight: maxDim / 5 });
      })

    })
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Private methods
  // -----------------------------------------------------------------------------------------------------
  /**
   * Create the scene
   */
  private createScene(): void {
    this.scene = new Scene();
    this.group = new Group();
    this.sticker = new Group();

    this.scene.add(this.group);
    this.scene.add(this.sticker);
  }

  /**
   *  Create the renderer 
   */
  private createRenderer(): void {
    if (!this.canvas) return;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas.nativeElement,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      depth: true,
    });

    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.autoClear = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);

    if (!this.canvasDom) return;
    this.renderer.setSize(this.canvasDom.nativeElement.clientWidth, this.canvasDom.nativeElement.clientHeight);

    this.renderer.setClearColor(0xffffff, 1);
  }

  private createCamera(): void {
    if (!this.canvasDom) return;

    this.camera = new PerspectiveCamera(15, this.canvasDom.nativeElement.clientWidth / this.canvasDom.nativeElement.clientHeight, 0.1, 1000)
    this.camera.position.set(0, 0, 1)

    if (!this.scene) return;

    this.caster = new Caster();
    this.scene.add(this.camera)
  }

  private createCameraControls(): void {
    if (!this.camera || !this.renderer) return;

    this.controls = new MyCameraControls(this.camera, this.renderer.domElement)
    this.controls.minPolarAngle = 0
    this.controls.maxPolarAngle = Math.PI * 4
  }

  private createLight(): void {
    if (!this.scene) return;

    const light = new PointLight(0xffffff, 1000, 100)
    light.position.set(0, 0, 20)

    this.scene.add(light)

    const light2 = new PointLight(0xffffff, 1000, 100)
    light2.position.set(0, 0, -20)

    this.scene.add(light2)

    const light3 = new PointLight(0xffffff, 1000, 100)
    light3.position.set(0, 20, 0)

    this.scene.add(light3)

    const light4 = new PointLight(0xffffff, 1000, 100)
    light4.position.set(0, -20, 0)

    this.scene.add(light4)

    const light5 = new PointLight(0xffffff, 1000, 100)
    light5.position.set(20, 0, 0)

    this.scene.add(light5)

    const light6 = new PointLight(0xffffff, 1000, 100)
    light6.position.set(-20, 0, 0)

    this.scene.add(light6)
  }

  private setMaterial(scene: any): void {
    scene.traverse((node: any) => {
      node.renderOrder = 1;
      node.frustumCulled = false;

      let mesh: any = node;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const material = mesh.material

      if (material) {
        material.encoding = SRGBColorSpace;
        material.envMapIntensity = 1;

        if ((material as any).isMeshBasicMaterial === true) material.toneMapped = false;

        const color = material.color.getHex();


        material.originData = {
          color: new Color(color),
          map: material.map,
          normalMap: material.normalMap?.clone(),
          normalScale: material.normalScale,
          roughness: material.roughness,
          metalness: material.metalness,
          opacity: material.opacity,
        }

        material.needsUpdate = true;

      }

    });
  }

  private renderScene() {
    this.animationFrameId = requestAnimationFrame(this.render);
  }

  private render = () => {

    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);

    if (!this.controls) return;
    this.controls.update(10);

    this.cd.markForCheck();

    this.renderScene();
  };

  private cancelAnimationFrame() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private resizeRendererToDisplaySize(): any {
    if (!this.renderer || !this.canvasDom) return;

    const canvas = this.renderer.domElement;
    const width = this.canvasDom.nativeElement.clientWidth;
    const height = this.canvasDom.nativeElement.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      this.renderer.setSize(width, height, false);
      this.caster.setSize(width, height)
    }
    return needResize;
  }

  @HostListener('window:resize') onResize() {
    if (!this.renderer || !this.camera) return;

    if (this.resizeRendererToDisplaySize()) {
      const canvas = this.renderer.domElement;
      this.camera.aspect = canvas.clientWidth / canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  @HostListener('mousemove', ['$event']) onMouseMove(e: MouseEvent) {
    this.caster.setMouse(e)
    this.caster.setFromCamera(this.camera)
    this.caster.check(this.group)

    if (this.caster.isIntersect && this.sticker.children.length > 0) {
      this.sticker.position.copy(this.caster.point)
      this.sticker.lookAt(this.caster.normal);
    }
  }

  @HostListener('mousedown', ['$event']) onMouseDown(e: MouseEvent) {
    this.caster.setMouse(e)
    this.caster.setFromCamera(this.camera)
    this.caster.check(this.group)

    if (this.caster.intersects.length > 0) {

      const geometry = new PlaneGeometry(0.4, 0.4, 20, 20);
      const material = new MeshStandardMaterial({ color: 0x00ff00, side: 2 });
      const mesh = new Mesh(geometry, material);
      mesh.position.copy(this.caster.point)
      mesh.lookAt(this.caster.normal)
      const bvh = new MeshBVH(this.caster.intersects[0].object['geometry']);

      console.log(geometry.attributes)

      for (let i = 0; i < geometry.attributes['position'].array.length; i += 3) {
        const vector = new Vector3(geometry.attributes['position'].array[i], geometry.attributes['position'].array[i + 1], geometry.attributes['position'].array[i + 2]);
        vector.applyMatrix4(mesh.matrixWorld);
        const data1 = bvh.closestPointToPoint(vector, { point: new Vector3(), faceIndex: 0, distance: 0 })

        const g = new SphereGeometry(0.01, 20, 20);
        const m = new MeshBasicMaterial({ color: 0xff0000 });
        const s = new Mesh(g, m);

        s.position.copy(vector)

        const data2 = getTriangleHitPointInfo(vector, this.caster.intersects[0].object['geometry'], data1.faceIndex)
        console.log(data2)
        geometry.attributes['position'].array[i] = data1.point.x
        geometry.attributes['position'].array[i + 1] = data1.point.y
        geometry.attributes['position'].array[i + 2] = data1.point.z
      }


      this.scene?.add(mesh)
    }
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Test
  // -----------------------------------------------------------------------------------------------------

  public createDSTModel(): void {
    this.textureLoader.load("./assets/threadNormal.png", (normalMap) => {
      const textureLoader = new TextureLoader();
      textureLoader.load("./assets/threadTexture.jpg", (texture) => {
        texture.colorSpace = SRGBColorSpace;
        texture.wrapS = texture.wrapT = RepeatWrapping;
        normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
        normalMap.colorSpace = LinearSRGBColorSpace;

        this.dstModel = new DSTModel(this.sticker, texture, normalMap);

        // this.dstModel.loadDST("./assets/Sample5/WOLFHD7.dst",
        //   (lines: any) => {
        //     lines.mesh.position.x -= 6;
        //   },
        //   {
        //     threadThickness: 2.7,
        //     jumpThreadThickness: 0,
        //     palette: ["white", "lightgray", "darkgray", "black", "white"],
        //   }
        // )

        this.dstModel.loadDST(
          "./assets/Sample2/CAT2.dst",
          (lines: any) => {
            this.sticker.add(lines.mesh);
            lines.mesh.material.map = texture;
            lines.mesh.material.normalMap = normalMap;
          },
          {
            threadThickness: 2.7,
            jumpThreadThickness: 0,
            palette: ["orange", "white", "pink", "white", "black"],
          }
        );

        // this.dstModel.loadDST(
        //   "./assets/Sample3/ELECTRNCSJK14.dst",
        //   (lines: any) => { },
        //   {
        //     threadThickness: 2.7,
        //     jumpThreadThickness: 0,
        //     palette: [
        //       "white",
        //       "white",
        //       "white",
        //       "gray",
        //       "brown",
        //       "white",
        //       "blue",
        //       "pink",
        //       "brown",
        //       "teal",
        //       "white",
        //       "black",
        //       "white",
        //     ],
        //     //palette:[],
        //   })
      })
    })
  }

}
