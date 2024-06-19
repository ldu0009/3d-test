import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Box3, Color, PerspectiveCamera, PointLight, Raycaster, SRGBColorSpace, Scene, Sphere, Vector3, WebGLRenderer } from 'three/src/Three.js';
import { MyCameraControls } from './common/camera-controls';
import { MyLoader } from './common/threed-loader';
import { DragAndDropDirective } from './directive/drag-and-drop.directive';

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
  protected controls: MyCameraControls | undefined;
  protected raycaster: Raycaster | undefined;
  protected renderer: WebGLRenderer | undefined;
  protected scene: Scene | undefined;

  private animationFrameId: number | undefined;

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
      this.scene.add(data.scene);
      this.setMaterial(data.scene);

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
  }

  /**
   *  Create the renderer 
   */
  private createRenderer(): void {
    if (!this.canvas) return;

    this.renderer = new WebGLRenderer({
      canvas: this.canvas.nativeElement,
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

    const light = new PointLight(0xffffff, 200, 100)
    light.position.set(0, 0, 20)

    this.scene.add(light)

    const light2 = new PointLight(0xffffff, 200, 100)
    light2.position.set(0, 0, -20)

    this.scene.add(light2)

    const light3 = new PointLight(0xffffff, 200, 100)
    light3.position.set(0, 20, 0)

    this.scene.add(light3)

    const light4 = new PointLight(0xffffff, 200, 100)
    light4.position.set(0, -20, 0)

    this.scene.add(light4)

    const light5 = new PointLight(0xffffff, 200, 100)
    light5.position.set(20, 0, 0)

    this.scene.add(light5)

    const light6 = new PointLight(0xffffff, 200, 100)
    light6.position.set(-20, 0, 0)

    this.scene.add(light6)
  }

  private setMaterial(scene: any): void {
    scene.traverse((node: any) => {
      node.renderOrder = 1000;
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

  private resizeRendererToDisplaySize() {
    if (!this.renderer || !this.canvasDom) return;

    const canvas = this.renderer.domElement;
    const width = this.canvasDom.nativeElement.clientWidth;
    const height = this.canvasDom.nativeElement.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      this.renderer.setSize(width, height, false);
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



}
