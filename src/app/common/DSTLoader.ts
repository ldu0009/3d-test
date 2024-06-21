import * as THREE from "three";

export class DSTLoader {

    private quads = true;
    private threadThickness = 2;
    private jumpThreadThickness = 0;
    private palette = ["black", "white", "red", "gray", "yellow", "orange"];
    private pidx = 0;
    private v0 = new THREE.Vector3();

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    public load(url: string, resolve: any, opts: any): any {

        this.loadBinaryData(url).then((buffer: any) => {
            this.quads = true;
            this.threadThickness = 2;
            this.jumpThreadThickness = 0;
            this.palette = null;
            let generate = () => {
                if (opts.quads !== undefined) this.quads = opts.quads;
                if (opts.threadThickness !== undefined)
                    this.threadThickness = opts.threadThickness;
                if (opts.jumpThreadThickness !== undefined)
                    this.jumpThreadThickness = opts.jumpThreadThickness;
                if (opts.palette !== undefined) this.palette = opts.palette;

                opts.quads = this.quads;
                opts.threadThickness = this.threadThickness;
                opts.jumpThreadThickness = this.jumpThreadThickness;
                opts.palette = this.palette;
                const geometry = this.parseDST(buffer);
                opts.palette = this.palette;

                let lines = this.quads
                    ? new THREE.Mesh(
                        geometry,
                        new THREE.MeshStandardMaterial({
                            color: "white",
                            vertexColors: true,
                            side: THREE.DoubleSide,
                            depthTest: false,
                            depthWrite: false,
                            metalness: 0.0,
                            roughness: 1,
                            normalScale: new THREE.Vector2(1, -1),
                        })
                    )
                    : new THREE.Line(
                        geometry,
                        new THREE.LineBasicMaterial({
                            color: "white",
                            vertexColors: true,
                            side: THREE.DoubleSide,
                            depthTest: false,
                            depthWrite: false,
                        })
                    );

                lines.scale.set(0.0001, 0.0001, 0.0001);
                lines.updateMatrixWorld(true);
                return lines;
            };

            let mesh: any = generate();

            let params: any = {
                mesh,
                get quads() {
                    return opts.quads || false;
                },
                set quads(on) {
                    opts.quads = on == true;
                    params.meshNeedsUpdate = true;
                },
                get threadThickness() {
                    return opts.threadThickness;
                },
                set threadThickness(f) {
                    opts.threadThickness = parseFloat(f);
                    params.meshNeedsUpdate = true;
                },
                get jumpThreadThickness() {
                    return opts.jumpThreadThickness;
                },
                set jumpThreadThickness(f) {
                    opts.jumpThreadThickness = parseFloat(f);
                    params.meshNeedsUpdate = true;
                },
                get palette() {
                    return opts.palette;
                },
                set palette(arry) {
                    opts.palette = arry;
                    params.meshNeedsUpdate = true;
                },
                toTexture(renderer: any, scene: any, maxDim: any, padding = 10): any {
                    if (!opts.map) {
                        let bounds = new THREE.Box3();
                        bounds.setFromObject(params.mesh);
                        let bsz = bounds.getSize(new THREE.Vector3());

                        let aspect = bsz.x / bsz.y;

                        let pad = bsz.x / maxDim + (padding * 2) / maxDim;

                        let szx = (bsz.x + pad) / 2;
                        let szy = (bsz.y + pad / aspect) / 2;

                        const camera = new THREE.OrthographicCamera(
                            -szx,
                            szx,
                            szy,
                            -szy,
                            1,
                            1000
                        );
                        params.mesh.localToWorld(camera.position.set(0, 0, 0));
                        camera.position.z += 500; // adjust as needed
                        camera.lookAt(params.mesh.position);

                        if (bsz.x > bsz.y) {
                            bsz.y = maxDim * (bsz.y / bsz.x);
                            bsz.x = maxDim;
                        } else {
                            bsz.x = maxDim * (bsz.x / bsz.y);
                            bsz.y = maxDim;
                        }
                        const renderTarget = new THREE.WebGLRenderTarget(
                            bsz.x | 0,
                            bsz.y | 0,
                            {
                                generateMipmaps: true,
                                minFilter: THREE.LinearMipmapLinearFilter,
                                magFilter: THREE.LinearFilter,
                            }
                        );
                        renderer.setRenderTarget(renderTarget);
                        let sv = scene.background;
                        scene.background = null;
                        renderer.setClearAlpha(0);
                        renderer.render(scene, camera);

                        const width = renderTarget.width;
                        const height = renderTarget.height;
                        const size = width * height * 4; // 4 components (RGBA) per pixel
                        const buffer = new Uint8Array(size);
                        // Read the pixels
                        renderer.readRenderTargetPixels(
                            renderTarget,
                            0,
                            0,
                            width,
                            height,
                            buffer
                        );

                        // Create a canvas to transfer the pixel data
                        const canvas = document.createElement("canvas");
                        canvas.width = width;
                        canvas.height = height;
                        const context = canvas.getContext("2d");

                        // Create ImageData and put the render target pixels into it
                        const imageData = new ImageData(
                            new Uint8ClampedArray(buffer),
                            width,
                            height
                        );
                        context.putImageData(imageData, 0, 0);

                        params.canvas = canvas;

                        scene.background = sv;
                        renderer.setClearAlpha(1);
                        renderer.setRenderTarget(null);
                        return renderTarget.texture;
                    }
                }
            };
            let meshUpdateStarted = false;
            let updateStarted = false;
            mesh.onBeforeRender = function () {
                if (params.drawRange !== undefined) {
                    let dr = params.mesh.geometry.index
                        ? params.mesh.geometry.index.count
                        : params.mesh.geometry.attributes.position.count;
                    params.mesh.geometry.drawRange.count = (params.drawRange * dr) | 0;
                }
                if (params.meshNeedsUpdate) {
                    if (meshUpdateStarted) return;
                    meshUpdateStarted = true;
                    setTimeout(() => {
                        params.meshNeedsUpdate = false;
                        let newmesh: any = generate();
                        params.mesh.parent.add(newmesh);
                        params.mesh.geometry.dispose();
                        params.mesh.parent.remove(params.mesh);
                        newmesh.position.copy(params.mesh.position);
                        newmesh.scale.copy(params.mesh.scale);
                        newmesh.rotation.copy(params.mesh.rotation);
                        newmesh.material.map = mesh.material.map;
                        newmesh.material.normalMap = mesh.material.normalMap;
                        newmesh.onBeforeRender = params.mesh.onBeforeRender;
                        params.mesh = newmesh;
                        meshUpdateStarted = false;
                    }, 10);
                } else if (params.needsUpdate) {
                    if (updateStarted) return;
                    updateStarted = true;
                    setTimeout(() => {
                        params.needsUpdate = false;
                        params.mesh.geometry.dispose();
                        params.mesh.geometry = generate().geometry;
                        updateStarted = false;
                    }, 10);
                }
            };
            resolve(params);
        });
    }


    // -----------------------------------------------------------------------------------------------------
    // @ Private methods
    // -----------------------------------------------------------------------------------------------------

    private decodeCoordinate(byte1: number, byte2: number, byte3: number) {
        let cmd = byte1 | (byte2 << 8) | (byte3 << 16);
        let x = 0,
            y = 0,
            jump,
            cstop;
        let bit = (bit: number) => cmd & (1 << bit);

        if (bit(23)) y += 1;
        if (bit(22)) y -= 1;
        if (bit(21)) y += 9;
        if (bit(20)) y -= 9;
        if (bit(19)) x -= 9;
        if (bit(18)) x += 9;
        if (bit(17)) x -= 1;
        if (bit(16)) x += 1;

        if (bit(15)) y += 3;
        if (bit(14)) y -= 3;
        if (bit(13)) y += 27;
        if (bit(12)) y -= 27;
        if (bit(11)) x -= 27;
        if (bit(10)) x += 27;
        if (bit(9)) x -= 3;
        if (bit(8)) x += 3;

        if (bit(7)) jump = true;
        if (bit(6)) cstop = true;
        if (bit(5)) y += 81;
        if (bit(4)) y -= 81;
        if (bit(3)) x -= 81;
        if (bit(2)) x += 81;

        return { x, y, jump, cstop };
    }

    private async loadBinaryData(url: string): Promise<any> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const buffer = await response.arrayBuffer();
            return buffer;
        } catch (error) {
            console.error("Failed to load binary data:", error);
        }
    }

    private parseDST(buffer: any) {
        const dataView = new DataView(buffer);
        const start = 512; // Starting byte
        const indices = [];
        const vertices = [];
        const colors = [];
        const normals = [];
        const uvs = [];
        let cx = 0;
        let cy = 0;
        let cr = 1,
            cg = 1,
            cb = 1;

        let header = String.fromCharCode.apply(String, Array.from(new Uint8Array(buffer, 0, 512)));

        let coff = header.indexOf("CO:");
        let colorCount = 0;
        if (coff > 0) colorCount = parseInt(header.slice(coff + 3, coff + 7));

        let vcount = 0;
        let wasJumpOrStop = false;
        let pidx = 0;
        let cpalette;
        if (!this.palette) this.palette = [];
        while (this.palette.length < colorCount + 1) {
            cr = Math.random();
            cg = Math.random();
            cb = Math.random();
            this.v0.set(cr, cg, cb).normalize();
            this.palette.push("#" + new THREE.Color(this.v0.x, this.v0.y, this.v0.z).getHexString());
        }

        cpalette = [];
        for (let i = 0; i < this.palette.length; i++) {
            cpalette[i] = new THREE.Color(this.palette[i]);
            let p = cpalette[pidx % cpalette.length];
            cr = p.r;
            cg = p.g;
            cb = p.b;
        }
        for (let i = start; i < dataView.byteLength; i += 3) {
            if (i >= dataView.byteLength - 3) break;

            const byte1 = dataView.getUint8(i);
            const byte2 = dataView.getUint8(i + 1);
            const byte3 = dataView.getUint8(i + 2);

            // Check for end of file sequence
            if (byte1 === 0x00 && byte2 === 0x00 && byte3 === 0xf3) {
                break;
            }
            const { x, y, cstop, jump } = this.decodeCoordinate(byte3, byte2, byte1);
            let px = cx,
                py = cy;
            cx += x;
            cy += y;
            if (cstop) {
                if (cpalette) {
                    //Get next step color
                    pidx++;
                    let p = cpalette[pidx % cpalette.length];
                    cr = p.r;
                    cg = p.g;
                    cb = p.b;
                } else {
                    cr = Math.random();
                    cg = Math.random();
                    cb = Math.random();
                    this.v0.set(cr, cg, cb).normalize();
                    cr = this.v0.x;
                    cg = this.v0.y;
                    cb = this.v0.z;
                }
            }

            if (this.quads) {
                let dx = cx - px;
                let dy = cy - py;
                let dtx = -dy;
                let dty = dx;

                let llen = this.v0.set(dtx, dty, 0).length();
                if (llen) this.v0.multiplyScalar(1 / llen);
                let thickness = wasJumpOrStop ? this.jumpThreadThickness : this.threadThickness;
                dtx = this.v0.x * thickness;
                dty = this.v0.y * thickness;

                vertices.push(px + dtx, py + dty, 0);
                vertices.push(px - dtx, py - dty, 0);
                vertices.push(cx - dtx, cy - dty, 0);
                vertices.push(cx + dtx, cy + dty, 0);
                let vy = Math.random() * 0.5;
                uvs.push(0, 0 + vy, 1, 0 + vy, 1, llen / 80 + vy, 0, llen / 80 + vy);

                colors.push(cr, cg, cb);
                colors.push(cr, cg, cb);
                colors.push(cr, cg, cb);
                colors.push(cr, cg, cb);
                //normals.push(dtx, dty, .5, -dtx, -dty, .5, -dtx, -dty, .5, dtx, dty, .5);
                normals.push(0, 0, 1, -0, -0, 1, -0, -0, 1, 0, 0, 1);
                indices.push(
                    vcount,
                    vcount + 1,
                    vcount + 2,
                    vcount + 2,
                    vcount + 3,
                    vcount + 0
                );
                vcount += 4;
            } else {
                //lines
                vertices.push(cx, cy, 0); // Z-coordinate is 0 as embroidery designs are 2D
                colors.push(cr, cg, cb);
            }
            wasJumpOrStop = jump || cstop;
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(vertices, 3)
        );
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
        uvs.length &&
            geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        normals.length &&
            geometry.setAttribute(
                "normal",
                new THREE.Float32BufferAttribute(normals, 3)
            );
        indices.length && geometry.setIndex(indices);
        return geometry;
    }
}
