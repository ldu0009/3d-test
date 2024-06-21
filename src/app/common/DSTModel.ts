import { Mesh, MeshBasicMaterial, Scene, SphereGeometry, Texture } from "three";
import { DSTLoader } from "./DSTLoader";

export class DSTModel {

    private dstLoader: DSTLoader = new DSTLoader();

    constructor(private scene: Scene, private texture: Texture, private normalMap: Texture) { }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    public loadDST(url: string, cbfn: Function, options: any): void {
        this.dstLoader.load(url, (lines: any) => {
            cbfn(lines);
        }, options)
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------
}