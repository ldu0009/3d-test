import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { LoadingManager, REVISION } from 'three';

const MANAGER = new LoadingManager();
const THREE_PATH = `https://unpkg.com/three@0.${REVISION}.x`;
const KTX2_LOADER = new KTX2Loader(MANAGER);

KTX2_LOADER.setTranscoderPath(`${THREE_PATH}/examples/js/libs/basis/`);

export class MyLoader {

    protected dracoLoader: DRACOLoader
    protected gltfLoader: GLTFLoader | undefined;

    constructor() {
        this.dracoLoader = new DRACOLoader(MANAGER).setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.3/');
        this.gltfLoader = new GLTFLoader();
        this.gltfLoader.setCrossOrigin('anonymous');
        this.gltfLoader.setDRACOLoader(this.dracoLoader);
        this.gltfLoader.setKTX2Loader(KTX2_LOADER);
        this.gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    public load(file: File): Promise<any> {
        const path = file.name.split('.').pop();
        return new Promise((resolve, reject) => {
            if (path === 'glb' || path === 'gltf') {
                this.gltfLoader?.load(URL.createObjectURL(file), (gltf: GLTF) => {
                    resolve(gltf);
                }, undefined, (error) => {
                    reject(error);
                });
            }

            if (path === 'ktx2') {
                KTX2_LOADER.load(URL.createObjectURL(file), (texture) => {
                    resolve(texture);
                }, undefined, (error) => {
                    reject(error);
                });
            }

        });
    }
}