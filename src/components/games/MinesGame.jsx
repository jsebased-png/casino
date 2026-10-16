import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Coins, 
  Gem, 
  Sparkles, 
  Trophy, 
  AlertCircle, 
  Play, 
  ShieldCheck, 
  Maximize2, 
  Minimize2 
} from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import { disposeThreeScene, toggleFullscreen } from '../../utils/threeUtils';
import QuestionCard from '../QuestionCard';

const GRID_SIZE = 25; // 5x5
const MINES_COUNT = 3;

const MULTIPLIERS = [
  1.0,  // 0 gems
  1.15, // 1 gem
  1.42, // 2 gems (min to exonerate)
  1.80, // 3 gems
  2.35, // 4 gems
  3.15, // 5 gems
  4.30, // 6 gems
  6.00  // 7+ gems
];

/**
 * Creates high-res canvas texture for unrevealed titanium vault tile
 */
function createVaultTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Brushed dark titanium gradient
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  // Bevel border
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 244);

  // Corner security rivets
  ctx.fillStyle = '#64748b';
  [
    [24, 24], [232, 24], [24, 232], [232, 232]
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Central cyber question symbol
  ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.font = 'bold 96px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function MinesGame({
  activity,
  chips,
  onUpdateChips,
  onBackToLobby,
  activeStudent,
  onRecordStudentScore,
  onAdvanceStudentTurn,
  onGenerateTurnQuestion
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  // Core gameplay states
  const [bet, setBet] = useState(50);
  const [isPlaying, setIsPlaying] = useState(false);
  const [minePositions, setMinePositions] = useState([]);
  const [revealedTiles, setRevealedTiles] = useState({}); // { [idx]: 'gem' | 'mine' }
  const [gemsFound, setGemsFound] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Outcome & Challenge states
  const [roundOutcome, setRoundOutcome] = useState(null); // 'lucky_exonerated' | 'unlucky_challenge' | null
  const [winMessage, setWinMessage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnQuestionOverride, setTurnQuestionOverride] = useState(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const tilesMeshesRef = useRef([]); // array of { idx, mesh, initialY, targetY, isRevealed, gemMesh, mineMesh }
  const explosionParticlesRef = useRef([]);
  const cameraShakeRef = useRef(0);
  const reqIdRef = useRef(null);

  const questions = activity?.questions || [];
  const currentQuestion = turnQuestionOverride || questions[currentQuestionIndex % (questions.length || 1)];
  const currentMultiplier = MULTIPLIERS[Math.min(gemsFound, MULTIPLIERS.length - 1)];

  // ─── Initialize Three.js WebGL Scene ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.025);

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
    camera.position.set(0, 11, 9.5);
    camera.lookAt(0, -0.4, 0);
    cameraRef.current = camera;

    // 2. High-performance Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.6);
    scene.add(ambientLight);

    const spotLight = new THREE.SpotLight(0xffffff, 3.8);
    spotLight.position.set(0, 15, 6);
    spotLight.angle = Math.PI / 3.5;
    spotLight.penumbra = 0.5;
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    // Neon Accent Lights
    const cyanLight = new THREE.PointLight(0x06b6d4, 1.8, 15);
    cyanLight.position.set(-6, 4, 3);
    scene.add(cyanLight);

    const emeraldLight = new THREE.PointLight(0x10b981, 1.8, 15);
    emeraldLight.position.set(6, 4, 3);
    scene.add(emeraldLight);

    // 4. Cyber Table Pedestal
    const pedestalGeom = new THREE.BoxGeometry(9.6, 0.6, 9.6);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.25,
      metalness: 0.85
    });
    const pedestal = new THREE.Mesh(pedestalGeom, pedestalMat);
    pedestal.position.set(0, -0.35, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    // Glowing Pedestal Border Trim
    const trimGeom = new THREE.BoxGeometry(9.8, 0.08, 9.8);
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.5,
      roughness: 0.1
    });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.set(0, -0.05, 0);
    scene.add(trim);

    // 5. Build 5x5 Metallic Vault Tiles
    const tileTexture = createVaultTileTexture();
    const tileGeom = new THREE.BoxGeometry(1.4, 0.32, 1.4);
    const tileMat = new THREE.MeshStandardMaterial({
      map: tileTexture,
      roughness: 0.3,
      metalness: 0.7
    });

    const tiles = [];
    const spacing = 1.62;
    const offset = -2 * spacing; // Centered 5x5: -2, -1, 0, 1, 2

    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const idx = r * 5 + c;
        const mesh = new THREE.Mesh(tileGeom, tileMat);
        const posX = offset + c * spacing;
        const posZ = offset + r * spacing;

        mesh.position.set(posX, 0.16, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { tileIndex: idx };
        scene.add(mesh);

        tiles.push({
          idx,
          mesh,
          baseY: 0.16,
          targetY: 0.16,
          isRevealed: false,
          gemMesh: null,
          mineMesh: null
        });
      }
    }
    tilesMeshesRef.current = tiles;

    // 6. Raycasting Setup for Tile Hover & Clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-100, -100);
    let hoveredTile = null;

    const onPointerMove = (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(tilesMeshesRef.current.map(t => t.mesh));

      // Reset previous hover
      if (hoveredTile && (!intersects.length || intersects[0].object !== hoveredTile.mesh)) {
        if (!hoveredTile.isRevealed) {
          hoveredTile.targetY = hoveredTile.baseY;
        }
        hoveredTile = null;
      }

      // Set new hover
      if (intersects.length > 0) {
        const hitTile = tilesMeshesRef.current.find(t => t.mesh === intersects[0].object);
        if (hitTile && !hitTile.isRevealed) {
          hitTile.targetY = hitTile.baseY + 0.18; // Lift tile on hover
          hoveredTile = hitTile;
        }
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });

    // 7. Animation Loop with Camera Shake & Particle Updates
    let lastTime = performance.now();
    const animate = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Camera Shake from Mine Detonation
      if (cameraShakeRef.current > 0) {
        cameraShakeRef.current -= dt * 2.5;
        const shakeMag = cameraShakeRef.current * 0.35;
        camera.position.x = (Math.random() - 0.5) * shakeMag;
        camera.position.y = 11 + (Math.random() - 0.5) * shakeMag;
      } else {
        camera.position.x = 0;
        camera.position.y = 11;
      }
      camera.lookAt(0, -0.4, 0);

      // Lerp tile positions & spin active gems
      tilesMeshesRef.current.forEach((t) => {
        t.mesh.position.y += (t.targetY - t.mesh.position.y) * Math.min(dt * 12, 1);

        if (t.gemMesh) {
          t.gemMesh.rotation.y += dt * 1.5;
          t.gemMesh.position.y = 0.55 + Math.sin(time * 0.003 + t.idx) * 0.08;
        }
      });

      // Update explosion particles
      for (let i = explosionParticlesRef.current.length - 1; i >= 0; i--) {
        const p = explosionParticlesRef.current[i];
        p.position.addScaledVector(p.userData.velocity, dt);
        p.userData.life -= dt * 1.8;
        p.scale.setScalar(Math.max(p.userData.life, 0.01));
        if (p.userData.life <= 0) {
          scene.remove(p);
          if (p.geometry) p.geometry.dispose();
          if (p.material) p.material.dispose();
          explosionParticlesRef.current.splice(i, 1);
        }
      }

      renderer.render(scene, camera);
      reqIdRef.current = requestAnimationFrame(animate);
    };
    reqIdRef.current = requestAnimationFrame(animate);

    // 8. Resize Listener
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = w / h;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(w, h);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', handleResize);

      // Clean tile meshes
      tilesMeshesRef.current.forEach(t => {
        if (t.gemMesh) scene.remove(t.gemMesh);
        if (t.mineMesh) scene.remove(t.mineMesh);
        scene.remove(t.mesh);
      });
      tilesMeshesRef.current = [];

      disposeThreeScene(scene, renderer);
    };
  }, []);

  // ─── 3D Gem Mesh Factory ───
  const create3DGem = (posX, posZ) => {
    const scene = sceneRef.current;
    if (!scene) return null;

    const gemGeom = new THREE.OctahedronGeometry(0.55, 0);
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.95
    });
    const gemMesh = new THREE.Mesh(gemGeom, gemMat);
    gemMesh.position.set(posX, 0.55, posZ);
    gemMesh.castShadow = true;
    scene.add(gemMesh);
    return gemMesh;
  };

  // ─── 3D Mine Mesh Factory ───
  const create3DMine = (posX, posZ) => {
    const scene = sceneRef.current;
    if (!scene) return null;

    const mineGroup = new THREE.Group();
    mineGroup.position.set(posX, 0.45, posZ);

    // Dark core sphere
    const coreGeom = new THREE.SphereGeometry(0.38, 16, 16);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.4,
      metalness: 0.85
    });
    const core = new THREE.Mesh(coreGeom, coreMat);
    core.castShadow = true;
    mineGroup.add(core);

    // Spikes
    const spikeGeom = new THREE.ConeGeometry(0.08, 0.28, 8);
    const spikeMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xef4444,
      emissiveIntensity: 0.8,
      roughness: 0.2
    });

    const spikeOffsets = [
      [0, 0.38, 0, 0, 0, 0],
      [0, -0.38, 0, Math.PI, 0, 0],
      [0.38, 0, 0, 0, 0, -Math.PI / 2],
      [-0.38, 0, 0, 0, 0, Math.PI / 2],
      [0, 0, 0.38, Math.PI / 2, 0, 0],
      [0, 0, -0.38, -Math.PI / 2, 0, 0]
    ];

    spikeOffsets.forEach(([x, y, z, rx, ry, rz]) => {
      const spike = new THREE.Mesh(spikeGeom, spikeMat);
      spike.position.set(x, y, z);
      spike.rotation.set(rx, ry, rz);
      mineGroup.add(spike);
    });

    scene.add(mineGroup);
    return mineGroup;
  };

  // ─── Trigger Explosion Shockwave ───
  const triggerExplosionFX = (posX, posZ) => {
    const scene = sceneRef.current;
    if (!scene) return;

    cameraShakeRef.current = 1.0;

    const sparkGeom = new THREE.SphereGeometry(0.08, 6, 6);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    for (let i = 0; i < 35; i++) {
      const spark = new THREE.Mesh(sparkGeom, sparkMat);
      spark.position.set(posX, 0.5, posZ);
      spark.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 5 + 1.5,
          (Math.random() - 0.5) * 6
        ),
        life: 1.0
      };
      scene.add(spark);
      explosionParticlesRef.current.push(spark);
    }
  };

  // ─── Start New Game Session ───
  const handleStartGame = () => {
    if (isPlaying || roundOutcome === 'unlucky_challenge') return;
    if (chips < bet) {
      sounds.playWrong();
      alert('No tienes suficientes fichas para esta apuesta.');
      return;
    }

    onUpdateChips(-bet);
    sounds.playChips();

    // Reset 3D visual tiles
    const scene = sceneRef.current;
    tilesMeshesRef.current.forEach((t) => {
      t.isRevealed = false;
      t.targetY = t.baseY;
      if (t.gemMesh && scene) {
        scene.remove(t.gemMesh);
        t.gemMesh.geometry.dispose();
        t.gemMesh.material.dispose();
        t.gemMesh = null;
      }
      if (t.mineMesh && scene) {
        scene.remove(t.mineMesh);
        t.mineMesh = null;
      }
    });

    // Place 3 random mines
    const positions = new Set();
    while (positions.size < MINES_COUNT) {
      positions.add(Math.floor(Math.random() * GRID_SIZE));
    }

    setMinePositions(Array.from(positions));
    setRevealedTiles({});
    setGemsFound(0);
    setIsPlaying(true);
    setRoundOutcome(null);
    setWinMessage(null);
    setTurnQuestionOverride(null);
  };

  // ─── Reveal Tile (from 3D Click or Grid) ───
  const handleTileClick = (idx) => {
    if (!isPlaying || revealedTiles[idx] !== undefined) return;

    const isMine = minePositions.includes(idx);
    const tileItem = tilesMeshesRef.current[idx];

    if (tileItem) {
      tileItem.isRevealed = true;
      tileItem.targetY = tileItem.baseY - 0.12; // Depress tile

      if (isMine) {
        // Mine Detonation!
        sounds.playExplosion();
        tileItem.mineMesh = create3DMine(tileItem.mesh.position.x, tileItem.mesh.position.z);
        triggerExplosionFX(tileItem.mesh.position.x, tileItem.mesh.position.z);

        const newRevealed = { ...revealedTiles, [idx]: 'mine' };
        // Reveal all other mines in 3D
        minePositions.forEach((mIdx) => {
          newRevealed[mIdx] = 'mine';
          const otherTile = tilesMeshesRef.current[mIdx];
          if (otherTile && !otherTile.mineMesh) {
            otherTile.isRevealed = true;
            otherTile.targetY = otherTile.baseY - 0.12;
            otherTile.mineMesh = create3DMine(otherTile.mesh.position.x, otherTile.mesh.position.z);
          }
        });

        setRevealedTiles(newRevealed);
        setIsPlaying(false);
        setRoundOutcome('unlucky_challenge');
        sounds.playWrong();
        setWinMessage('💥 ¡BOOM! Pisaste una mina oculta. ¡Mala suerte! Responde el reto de inglés para defender tu turno.');

        // Auto-generate pedagogical turn question on loss based on session topics
        if (onGenerateTurnQuestion) {
          setIsGeneratingIA(true);
          onGenerateTurnQuestion(activeStudent)
            .then(newQ => {
              if (newQ) setTurnQuestionOverride(newQ);
            })
            .catch(err => console.error('Error auto-generating loss question in Mines:', err))
            .finally(() => setIsGeneratingIA(false));
        }
      } else {
        // Gem Found!
        sounds.playCoin();
        tileItem.gemMesh = create3DGem(tileItem.mesh.position.x, tileItem.mesh.position.z);
        const nextGems = gemsFound + 1;
        setGemsFound(nextGems);
        setRevealedTiles(prev => ({ ...prev, [idx]: 'gem' }));
      }
    }
  };

  // ─── Canvas Pointer Click Raycasting ───
  const handleCanvasClick = (e) => {
    if (!isPlaying) return;

    const camera = cameraRef.current;
    if (!camera) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const intersects = raycaster.intersectObjects(tilesMeshesRef.current.map(t => t.mesh));
    if (intersects.length > 0) {
      const clickedMesh = intersects[0].object;
      const tileIdx = clickedMesh.userData?.tileIndex;
      if (tileIdx !== undefined) {
        handleTileClick(tileIdx);
      }
    }
  };

  // ─── Cash Out and Exonerate ───
  const handleCashOut = () => {
    if (!isPlaying || gemsFound < 2) return;

    setIsPlaying(false);
    const payout = Math.round(bet * currentMultiplier);
    onUpdateChips(payout);

    // Reveal rest of mines in 3D
    const fullReveal = { ...revealedTiles };
    minePositions.forEach((mIdx) => {
      if (!fullReveal[mIdx]) {
        fullReveal[mIdx] = 'mine';
        const t = tilesMeshesRef.current[mIdx];
        if (t && !t.mineMesh) {
          t.isRevealed = true;
          t.targetY = t.baseY - 0.12;
          t.mineMesh = create3DMine(t.mesh.position.x, t.mesh.position.z);
        }
      }
    });
    setRevealedTiles(fullReveal);

    if (onRecordStudentScore && activeStudent) {
      onRecordStudentScore(activeStudent.id, payout, true, false, {
        machine: 'mines',
        bet,
        outcome: 'exonerated_by_luck',
        question: null
      });
    }

    setRoundOutcome('lucky_exonerated');
    sounds.playJackpot();
    confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
    setWinMessage(
      `🎉 ¡EXONERADO POR SUERTE EN CASINO MINES! Descubriste ${gemsFound} diamantes (${currentMultiplier.toFixed(2)}x). ¡${activeStudent ? activeStudent.name : 'El estudiante'} se salva de la pregunta y cobra +${payout} fichas!`
    );
  };

  const handleQuestionAnswer = (isCorrect, selected, q) => {
    if (isCorrect) {
      const reward = (q?.points || 200) + bet;
      onUpdateChips(reward);
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, reward, true, true, {
          machine: 'mines',
          bet,
          outcome: 'answered_correct',
          question: q?.question || 'Reto de Mines'
        });
      }
      sounds.playCorrect();
      confetti({ particleCount: 90, spread: 60, origin: { y: 0.6 } });
      setWinMessage(`🎯 ¡Excelente! ${activeStudent ? activeStudent.name : 'Respuesta correcta'}. Salvaste tu turno y ganaste +${reward} fichas.`);
    } else {
      sounds.playWrong();
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, -bet, false, true, {
          machine: 'mines',
          bet,
          outcome: 'answered_wrong',
          question: q?.question || 'Reto de Mines'
        });
      }
      setWinMessage('❌ Respuesta incorrecta. ¡La casa retiene las fichas este turno!');
    }
  };

  const handleGenerateLiveQuestion = async () => {
    if (!onGenerateTurnQuestion) return;
    setIsGeneratingIA(true);
    sounds.playChips();
    try {
      const liveQ = await onGenerateTurnQuestion(activeStudent);
      if (liveQ) {
        setTurnQuestionOverride(liveQ);
        sounds.playCorrect();
      }
    } catch (err) {
      console.error('Error generating AI question:', err);
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleResetForNextRound = () => {
    setIsPlaying(false);
    setRevealedTiles({});
    setGemsFound(0);
    setRoundOutcome(null);
    setWinMessage(null);
    setTurnQuestionOverride(null);
    setCurrentQuestionIndex(prev => (prev + 1) % (questions.length || 1));

    // Reset 3D board
    const scene = sceneRef.current;
    tilesMeshesRef.current.forEach((t) => {
      t.isRevealed = false;
      t.targetY = t.baseY;
      if (t.gemMesh && scene) {
        scene.remove(t.gemMesh);
        t.gemMesh = null;
      }
      if (t.mineMesh && scene) {
        scene.remove(t.mineMesh);
        t.mineMesh = null;
      }
    });

    if (onAdvanceStudentTurn) {
      onAdvanceStudentTurn();
    }
  };

  return (
    <div id="game-root" ref={containerRef} className="fixed inset-0 z-50 overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Layer (z-index: 0, only receives 3D inputs) */}
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="absolute inset-0 z-0 w-full h-full block cursor-pointer" 
      />

      {/* Floating 2D HUD / UI Layer (z-index: 10, pointer-events: none, buttons: pointer-events: auto) */}
      <div 
        id="ui-layer" 
        className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 pointer-events-none"
      >
        {/* Top Header Bar */}
        <header className="pointer-events-auto flex items-center justify-between gap-3 bg-slate-950/85 border border-emerald-500/40 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playTick();
                onBackToLobby();
              }}
              className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-emerald-500/50 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Sala Principal</span>
            </button>

            <button
              onClick={() => {
                toggleFullscreen(containerRef.current || document.documentElement);
                setIsFullscreen(!isFullscreen);
              }}
              className="p-1.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white transition cursor-pointer"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Student Turn Badge */}
          {activeStudent && (
            <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-950/80 to-slate-900/80 border border-emerald-500/50 px-3 py-1 rounded-xl">
              <span className="text-xl">{activeStudent.avatar || '🎩'}</span>
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block leading-tight">Turno en Mines:</span>
                <span className="text-xs font-black text-white">{activeStudent.name}</span>
              </div>
            </div>
          )}

          {/* Chips Pool */}
          <div className="flex items-center gap-2 bg-black/60 border border-amber-500/40 px-3.5 py-1.5 rounded-xl">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">
              {chips.toLocaleString()} Fichas
            </span>
          </div>
        </header>

        {/* Central HUD: Live Multiplier & Messages */}
        <main className="pointer-events-none flex flex-col items-center justify-center my-auto w-full max-w-xl mx-auto space-y-3">
          {/* Live Progress Bar in-game */}
          {isPlaying && (
            <div className="pointer-events-auto flex items-center justify-between w-full px-5 py-2.5 bg-black/75 border border-emerald-500/40 rounded-2xl backdrop-blur-md shadow-2xl">
              <div className="flex items-center gap-2">
                <Gem className="w-5 h-5 text-emerald-400 animate-pulse" />
                <span className="text-xs sm:text-sm font-black text-white">
                  💎 {gemsFound} Diamantes Encontrados
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-bold text-gray-400">Multiplicador:</span>
                <span className="text-base sm:text-lg font-black text-amber-400 font-mono">
                  {currentMultiplier.toFixed(2)}x
                </span>
              </div>
            </div>
          )}

          {/* Result Banner */}
          {winMessage && (
            <div className={`pointer-events-auto w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-bold backdrop-blur-md shadow-2xl flex items-center justify-center gap-2 animate-fadeIn ${
              roundOutcome === 'lucky_exonerated'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-emerald-950/60'
                : 'bg-red-950/90 border-red-500 text-red-100 shadow-red-950/60'
            }`}>
              <span>{winMessage}</span>
            </div>
          )}

          {/* Unlucky English Challenge */}
          {roundOutcome === 'unlucky_challenge' && (
            <div className="pointer-events-auto w-full bg-gray-950/95 border-2 border-red-500/70 rounded-3xl p-4 shadow-2xl backdrop-blur-md animate-fadeIn space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-red-200">
                  <span className="p-1 rounded-lg bg-red-600/30 text-red-400 border border-red-500/30">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <span>{isGeneratingIA ? 'Generando reto de inglés con IA...' : 'Reto de Inglés por Detonación de Mina'}</span>
                </div>

                {onGenerateTurnQuestion && (
                  <button
                    onClick={handleGenerateLiveQuestion}
                    disabled={isGeneratingIA}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Sparkles className={`w-3.5 h-3.5 text-yellow-300 ${isGeneratingIA ? 'animate-spin' : ''}`} />
                    <span>{isGeneratingIA ? 'Generando...' : 'Reto IA'}</span>
                  </button>
                )}
              </div>

              {isGeneratingIA && !turnQuestionOverride ? (
                <div className="p-8 text-center bg-purple-950/30 border border-purple-500/30 rounded-2xl animate-pulse space-y-2">
                  <Sparkles className="w-8 h-8 text-yellow-400 mx-auto animate-spin" />
                  <p className="text-sm font-bold text-purple-200">Generando reto pedagógico para {activeStudent ? activeStudent.name : 'el estudiante'}...</p>
                  <p className="text-xs text-purple-400">Creando pregunta adaptada a los temas activos de la sesión</p>
                </div>
              ) : currentQuestion ? (
                <QuestionCard
                  key={currentQuestion.id || currentQuestionIndex}
                  question={currentQuestion}
                  onAnswer={handleQuestionAnswer}
                  activeStudent={activeStudent}
                />
              ) : (
                <div className="text-center py-4 text-gray-400 text-xs">
                  No hay preguntas configuradas para esta actividad.
                </div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleResetForNextRound}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Continuar Turno ⏭️
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Bottom Control Deck (Pure pointer-events-auto, NO CSS 3D Transforms) */}
        <footer className="pointer-events-auto max-w-xl w-full mx-auto pb-2">
          {!isPlaying && !roundOutcome && (
            <div className="bg-slate-950/90 border border-emerald-500/40 p-4 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-300">Apuesta:</span>
                {[25, 50, 100, 250, 500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      sounds.playChips();
                      setBet(amt);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      bet === amt
                        ? 'bg-amber-500 text-black shadow-md font-black scale-105'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              {/* INICIAR TABLERO BUTTON - Always responsive and directly clickable! */}
              <button
                onClick={handleStartGame}
                disabled={chips < bet}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/80 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 text-yellow-300" />
                <span>INICIAR TABLERO ({bet} Fichas)</span>
              </button>
            </div>
          )}

          {isPlaying && (
            <button
              onClick={handleCashOut}
              disabled={gemsFound < 2}
              className={`w-full py-4 font-black text-sm sm:text-base rounded-2xl shadow-xl transition transform cursor-pointer flex items-center justify-center gap-2 border ${
                gemsFound >= 2
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 text-black border-emerald-300 animate-pulse hover:scale-[1.02]'
                  : 'bg-gray-850 border-gray-700 text-gray-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>
                {gemsFound >= 2
                  ? `PLANTARSE Y EXONERARSE (${Math.round(bet * currentMultiplier)} FICHAS)`
                  : `ENCUENTRA ${2 - gemsFound} GEMA(S) MÁS PARA EXONERARTE`}
              </span>
            </button>
          )}

          {roundOutcome === 'lucky_exonerated' && (
            <button
              onClick={handleResetForNextRound}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white font-black text-sm rounded-2xl shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 text-yellow-300" />
              <span>Siguiente Turno / Continuar</span>
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
