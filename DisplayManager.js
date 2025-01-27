import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import Stats from 'three/addons/libs/stats.module.js';
import { WebGPUStereoRenderer } from './WebGPUStereoRenderer.js';

import { GUI } from 'three/addons/libs/lil-gui.module.min.js'; 


export class DisplayManager {
	#scene;
	#camera;
	#renderer;
	#displayQuadL;
	#displayQuadR;
	#webGPUStereoCanvas;
	#webGPUStereoTexture;
	#controler;
	#stats;
	activeStereo = true;

	constructor() {
		this.#stats = new Stats()
		document.body.appendChild( this.#stats.dom );

		console.log("new DisplayManager")
		this.#renderer = new THREE.WebGLRenderer({antialias: true});
		this.#renderer.autoClear = false;
		this.#renderer.setPixelRatio( window.devicePixelRatio );
		this.#renderer.setSize( window.innerWidth, window.innerHeight );
		this.#renderer.xr.enabled = true;
		this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.#renderer.toneMappingExposure = 1;

		const canvas = this.#renderer.domElement
		document.body.appendChild(canvas);

		this.#scene = new THREE.Scene();
		this.#scene.background = new THREE.Color(0x555555);

		this.#camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
		this.#camera.position.set( 1, 1, 3 );
		this.#camera.layers.enable(1);
		this.stereoCamera = new THREE.StereoCamera();

		this.#webGPUStereoCanvas = document.getElementById('webgpuCanvas');
		this.#controler = new OrbitControls(this.#camera, this.#webGPUStereoCanvas);
		this.#controler.update()
		this.initGui()
	}

	initGui() {
		// this.uniformParams = {
		// 	min_dist: 0.1,
		// 	max_dist: 20.0,
		// 	max_steps: 50,
		// 	max_steps_2nd: 16,
		// }

		this.gui = new GUI();
		console.log(this)
		// this.guiUniforms = this.gui.addFolder("uniforms");
		console.log(this.gui.add(this, "activeStereo"));
		// this.guiUniforms.add(this.uniformParams, 'min_dist').name("min dist").min(0.05).max(1.0).step(0.05);
		// this.guiUniforms.add(this.uniformParams, 'max_dist').name("max dist").min(1.05).max(40.0).step(0.05);
		// this.guiUniforms.add(this.uniformParams, 'max_steps').name("max steps").min(10).max(200).step(1);
		// this.guiUniforms.add(this.uniformParams, 'max_steps_2nd').name("max steps 2nd").min(5).max(100).step(1);

	}

	#initializeViewQuad() {
		const geometry0 = new THREE.PlaneGeometry(2, 2);
		const uvs0 = geometry0.attributes.uv.array;
		uvs0[2] = 0.5;
		uvs0[6] = 0.5;

		const geometry1 = new THREE.PlaneGeometry(2, 2);
		const uvs1 = geometry1.attributes.uv.array;
		uvs1[0] = 0.5;
		uvs1[4] = 0.5;

		const material = new THREE.ShaderMaterial({
			uniforms: {
			  u_texture: { value: this.#webGPUStereoTexture },
			},
			vertexShader: `
				varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform sampler2D u_texture;
				varying vec2 vUv;
				void main() {
					vec4 texColor = texture2D(u_texture, vUv);
					gl_FragColor = texColor;
			 	}
			`,
		});

		this.#displayQuadL = new THREE.Mesh(geometry0, material);
		this.#displayQuadL.layers.disable(0);
		this.#displayQuadL.layers.enable(1);

		this.#displayQuadR = new THREE.Mesh(geometry1, material);
		this.#displayQuadR.layers.disable(0);
		this.#displayQuadR.layers.enable(2);

	}

	async initializeWebGPURenderers() {
		this.#webGPUStereoCanvas.width = window.innerWidth;
		this.#webGPUStereoCanvas.height = window.innerHeight;
		this.webGPUStereoRenderer = await WebGPUStereoRenderer.create(this.#webGPUStereoCanvas);
	}

	model = new THREE.Matrix4();
	mvp = new THREE.Matrix4();
	cameraMVP= {
		L: new Float32Array(16),
		R: new Float32Array(16),
	}

	left = true;

	#animationLoop(t) {
		this.model.makeRotationAxis(new THREE.Vector3(0, 0, 1).normalize(), t /2000);
		this.stereoCamera.update(this.#camera);
		
		// if(!this.activeStereo) {
		// 	const cameraL = this.stereoCamera.cameraL;
		// 	// const camera = this.#camera;
		// 	this.mvp.copy(cameraL.projectionMatrix).multiply(cameraL.matrixWorld.clone().invert()).multiply(this.model);
		// 	this.mvp.toArray(this.cameraMVP.L);
		// 	this.mvp.toArray(this.cameraMVP.R);
			
		// }

		// else {
			// const cameras = this.#renderer.xr.getCamera().cameras
			const cameraL = this.stereoCamera.cameraL;
			this.mvp.copy(cameraL.projectionMatrix).multiply(cameraL.matrixWorld.clone().invert()).multiply(this.model);
			this.mvp.toArray(this.cameraMVP.L);
			const cameraR = this.stereoCamera.cameraR;
			this.mvp.copy(cameraR.projectionMatrix).multiply(cameraR.matrixWorld.clone().invert()).multiply(this.model);
			// this.mvp.copy(cameras[0].projectionMatrix).multiply(cameras[0].matrixWorldInverse).multiply(this.model);
			// this.mvp.copy(cameras[1].projectionMatrix).multiply(cameras[1].matrixWorldInverse).multiply(this.model);
			this.mvp.toArray(this.cameraMVP.R);
		// }

		this.webGPUStereoRenderer.render(this.cameraMVP.L, this.cameraMVP.R, this.left);

		if(this.activeStereo) {
			this.left = !this.left;
		}

		this.#stats.update();
	}

	start() {
		this.#renderer.setAnimationLoop(this.#animationLoop.bind(this));
	}
}