import { useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

type ViewMode = 'EXTERIOR' | 'WIREFRAME';
export type ModelType = 'Gandon' | 'Fence' | 'Paul';

const MODEL_URLS: Record<ModelType, string> = {
  Gandon: 'https://pub-3cc2a6109ca24afa9b31ee99cf5b8028.r2.dev/NrlbA7xa-FXX5PCMqT-WP_model.glb',         // mecha-gandon.glb
  Fence:  'https://pub-3cc2a6109ca24afa9b31ee99cf5b8028.r2.dev/fqhOFDdzzsFWKgxuW3cIa_model%20(1).glb',   // decorative-fence.glb
  Paul:   'https://pub-3cc2a6109ca24afa9b31ee99cf5b8028.r2.dev/pofiksil-compressed%20(1).glb',             // paul.glb
};

// Preload models as soon as the module is evaluated to optimize website performance
if (typeof window !== 'undefined') {
  Object.values(MODEL_URLS).forEach(url => {
    fetch(url, { mode: 'cors' }).catch(() => {});
  });
}

interface OriginalMaterial {
  mesh: THREE.Mesh;
  mat: THREE.Material | THREE.Material[];
}

function fitObject(
  object: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  fillFraction = 0.9,
  referenceZ = 6
): { scaledHeight: number } {
  // Ensure world matrices are up-to-date (important when rotation is pre-applied)
  object.updateWorldMatrix(true, true);

  // Bbox from mesh geometry only — ignores empty nodes, cameras, lights, and
  // any misplaced pivot nodes that would push the center far from actual geometry.
  const box = new THREE.Box3();
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      mesh.geometry.computeBoundingBox();
      if (mesh.geometry.boundingBox) {
        const geoBbox = mesh.geometry.boundingBox.clone();
        geoBbox.applyMatrix4(mesh.matrixWorld);
        box.union(geoBbox);
      }
    }
  });
  if (box.isEmpty()) box.setFromObject(object);

  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim === 0) return { scaledHeight: 0 };

  const fovRad       = (camera.fov * Math.PI) / 180;
  const visibleHeight = 2 * Math.tan(fovRad / 2) * referenceZ;
  const scale        = (visibleHeight * fillFraction) / maxDim;

  // Apply scale first, THEN position so the scaled geometry center lands at world origin.
  // Correct formula: world_center = position + center_local * scale = 0
  //                  => position  = -center_local * scale
  // (The old order — sub(center) then setScalar — was wrong because scale shifted the center.)
  object.scale.setScalar(scale);
  object.position.copy(center).multiplyScalar(-scale);

  return { scaledHeight: size.y * scale };
}

function Scene({
  modeRef,
  mouseRef,
  isExperienceStarted,
  activeModel,
  onLoaded,
  onProgress,
}: {
  modeRef: React.RefObject<ViewMode>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  isExperienceStarted: boolean;
  activeModel: ModelType;
  onLoaded?: () => void;
  onProgress?: (p: number) => void;
}) {
  const { scene, camera, gl } = useThree();

  const innerSceneRef   = useRef<THREE.Object3D | null>(null);
  const mixerRef        = useRef<THREE.AnimationMixer | null>(null);
  const originalsRef    = useRef<OriginalMaterial[]>([]);
  const currentModeRef  = useRef<ViewMode>('EXTERIOR');
  const groupRef        = useRef<THREE.Group | null>(null);

  // Smooth emergence after load (0 → 1)
  const emergeRef    = useRef(0);
  const isLoadedRef  = useRef(false);

  // Rotation state
  const autoRotateRef   = useRef(0);
  const parallaxYaw     = useRef(0);
  const parallaxPitch   = useRef(0);
  const floatPhase      = useRef(0);
  const isDragging      = useRef(false);
  const pointerPos      = useRef({ x: 0, y: 0 });
  const manualPitchRef  = useRef(0);

  const wireframeMat = useRef(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(0x6688cc),
      wireframe: true,
      transparent: true,
      opacity: 0.65,
    })
  );

  useEffect(() => {
    gl.setClearColor(0x000000, 0);

    const cam = camera as THREE.PerspectiveCamera;
    cam.position.set(0, 0.95, 3.0);
    cam.fov = 42;
    cam.updateProjectionMatrix();

    const ambient = new THREE.AmbientLight(0xd0d8f8, 1.3);
    const key     = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(3, 6, 5);
    const fill = new THREE.DirectionalLight(0xb8c8f0, 0.7);
    fill.position.set(-5, 1, 2);
    const rim  = new THREE.DirectionalLight(0x8899cc, 0.5);
    rim.position.set(0, -4, -5);
    scene.add(ambient, key, fill, rim);

    const group = new THREE.Group();
    group.scale.setScalar(0.85); // start slightly small for emergence
    scene.add(group);
    groupRef.current = group;

    return () => {
      scene.remove(ambient, key, fill, rim, group);
      wireframeMat.current.dispose();
    };
  }, [scene, camera, gl]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    let cancelled = false;
    const loader = new GLTFLoader();
    // Use anonymous crossOrigin to avoid some strict CORS issues
    loader.setCrossOrigin('anonymous');

    if (innerSceneRef.current) {
      group.remove(innerSceneRef.current);
      innerSceneRef.current = null;
    }
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    originalsRef.current = [];
    isLoadedRef.current = false;
    emergeRef.current = 0;

    const loadModel = (url: string, retries = 2) => {
      loader.load(
        url,
        (gltf) => {
          if (cancelled) return;

          const modelScene = gltf.scene;
          const cam = camera as THREE.PerspectiveCamera;
          
          let fillFraction = 0.75;
          const isMobile = window.innerWidth < 768;
          if (isMobile && activeModel === 'Fence') {
            fillFraction = 0.28; // Fence size on mobile
          }
          
          // Apply facing rotation BEFORE fitObject so the bbox is computed on
          // the final orientation — rotation after centering would orbit the model.
          modelScene.rotation.y = -Math.PI / 2;

          const { scaledHeight } = fitObject(modelScene, cam, fillFraction, 6);

          // Adjust the vertical position based on the active model
          if (activeModel === 'Fence') {
            if (isMobile) {
              modelScene.position.y += scaledHeight * 0.08;
            } else {
              modelScene.position.y += scaledHeight * 0.05;
            }
          } else if (activeModel === 'Paul') {
            modelScene.position.y += 0; // Paul is already centered
          } else {
            modelScene.position.y += scaledHeight * 0.12;
          }

          group.add(modelScene);
          innerSceneRef.current = modelScene;

          // Collect originals — DO NOT touch materials, keep textures intact
          const originals: OriginalMaterial[] = [];
          modelScene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh;
              originals.push({ mesh, mat: mesh.material });
              if (currentModeRef.current === 'WIREFRAME') {
                mesh.material = wireframeMat.current;
              }
            }
          });
          originalsRef.current = originals;

          if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(modelScene);
            mixer.clipAction(gltf.animations[0]).play();
            mixerRef.current = mixer;
          }

          isLoadedRef.current = true;
          setTimeout(() => onLoaded?.(), 100);
        },
        (evt) => {
          if (onProgress && evt.total > 0) onProgress(evt.loaded / evt.total);
        },
        (err) => {
          if (cancelled) return;
          console.warn(`GLTF load error (${url}):`, err);
          if (retries > 0) {
            console.log(`Retrying... (${retries} attempts left)`);
            setTimeout(() => loadModel(url, retries - 1), 1000);
          }
        }
      );
    };

    loadModel(MODEL_URLS[activeModel]);

    return () => {
      cancelled = true;
    };
  }, [activeModel, camera, onLoaded, onProgress]);

  // Pointer drag
  useEffect(() => {
    const canvas = gl.domElement;

    const onDown = (e: PointerEvent) => {
      if (!isExperienceStarted) return;
      isDragging.current = true;
      pointerPos.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };
    const onMove = (e: PointerEvent) => {
      if (!isDragging.current || !isExperienceStarted) return;
      const dx = e.clientX - pointerPos.current.x;
      const dy = e.clientY - pointerPos.current.y;
      pointerPos.current = { x: e.clientX, y: e.clientY };
      autoRotateRef.current  += dx * 0.01;
      manualPitchRef.current += dy * 0.01;
      manualPitchRef.current  = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, manualPitchRef.current));
    };
    const onUp = () => {
      isDragging.current = false;
      canvas.style.cursor = isExperienceStarted ? 'grab' : 'default';
      document.body.style.userSelect = 'auto';
    };

    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    canvas.style.cursor = isExperienceStarted ? 'grab' : 'default';

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl, isExperienceStarted]);

  useFrame((state, delta) => {
    mixerRef.current?.update(delta);

    const group = groupRef.current;
    if (!group) return;

    // Material mode toggle
    const targetMode = modeRef.current ?? 'EXTERIOR';
    if (targetMode !== currentModeRef.current) {
      currentModeRef.current = targetMode;
      originalsRef.current.forEach(({ mesh, mat }) => {
        mesh.material = targetMode === 'WIREFRAME' ? wireframeMat.current : mat;
      });
    }

    // Camera zoom transition
    const targetZ = isExperienceStarted ? 6.0 : 3.0;
    const targetY = isExperienceStarted ? 0.2 : 0.95;
    state.camera.position.z += (targetZ - state.camera.position.z) * delta * 2.0;
    state.camera.position.y += (targetY - state.camera.position.y) * delta * 2.0;

    // Auto-rotate
    if (isExperienceStarted && !isDragging.current) {
      autoRotateRef.current += delta * 0.25;
    } else if (!isExperienceStarted) {
      const nearest = Math.round(autoRotateRef.current / (Math.PI * 2)) * (Math.PI * 2);
      autoRotateRef.current += (nearest - autoRotateRef.current) * delta * 3.0;
    }

    if (!isDragging.current) {
      manualPitchRef.current += (0 - manualPitchRef.current) * delta * 5.0;
    }

    const mx = mouseRef.current?.x ?? 0;
    const my = mouseRef.current?.y ?? 0;
    const spd = isDragging.current ? 0.01 : 0.05;
    parallaxYaw.current   += (mx * 0.14 - parallaxYaw.current)   * spd;
    parallaxPitch.current += (-my * 0.09 - parallaxPitch.current) * spd;

    group.rotation.y = autoRotateRef.current + parallaxYaw.current;
    group.rotation.x = parallaxPitch.current + manualPitchRef.current;

    floatPhase.current  += delta * 0.55;
    group.position.y     = -0.32 + Math.sin(floatPhase.current) * 0.055;

    // Smooth emergence: scale 0.85 → 1.0 over ~1.4s after load
    if (isLoadedRef.current && emergeRef.current < 1) {
      emergeRef.current = Math.min(1, emergeRef.current + delta * 0.72);
      const t    = emergeRef.current;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; // ease-in-out quad
      group.scale.setScalar(0.85 + ease * 0.15);
    }
  });

  return null;
}

export function HeroCanvas({
  modeRef,
  mouseRef,
  isExperienceStarted,
  activeModel,
  onLoaded,
  onProgress,
}: {
  modeRef: React.RefObject<ViewMode>;
  mouseRef: React.RefObject<{ x: number; y: number }>;
  isExperienceStarted: boolean;
  activeModel: ModelType;
  onLoaded?: () => void;
  onProgress?: (p: number) => void;
}) {
  return (
    <Canvas gl={{ alpha: true, antialias: true }} style={{ background: 'transparent' }}>
      <Scene
        modeRef={modeRef}
        mouseRef={mouseRef}
        isExperienceStarted={isExperienceStarted}
        activeModel={activeModel}
        onLoaded={onLoaded}
        onProgress={onProgress}
      />
    </Canvas>
  );
}
