import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { ArrowLeft, Coins, Rocket, Sparkles, Trophy, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import { disposeThreeScene, toggleFullscreen } from '../../utils/threeUtils';
import QuestionCard from '../QuestionCard';

export default function CrashRocketGame({
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
  const [gameState, setGameState] = useState('idle'); // 'idle' | 'flying' | 'crashed' | 'cashed_out'
  const [multiplier, setMultiplier] = useState(1.00);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Outcome & Challenge states
  const [roundOutcome, setRoundOutcome] = useState(null); // 'lucky_exonerated' | 'unlucky_challenge' | null
  const [winMessage, setWinMessage] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnQuestionOverride, setTurnQuestionOverride] = useState(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  // Three.js and Animation refs
  const crashPointRef = useRef(2.0);
  const startTimeRef = useRef(0);
  const cashedOutMultiplierRef = useRef(null);
  const reqIdRef = useRef(null);

  // Stars ref properly declared and safeguarded!
  const starsRef = useRef(null);
  const planeGroupRef = useRef(null);
  const propellerRef = useRef(null);
  const jetFlamesRef = useRef([]);
  const cloudsGroupRef = useRef(null);
  const trailParticlesRef = useRef(null);
  const explosionGroupRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);

  const questions = activity?.questions || [];
  const currentQuestion = turnQuestionOverride || questions[currentQuestionIndex % (questions.length || 1)];

  // Initialize Three.js WebGL Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050b18);
    scene.fog = new THREE.FogExp2(0x050b18, 0.0035);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 2000);
    camera.position.set(0, 4, 16);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    // 2. Renderer with PBR tone mapping & soft shadows
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(25, 45, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.5);
    rimLight.position.set(-20, 10, -20);
    scene.add(rimLight);

    // 4. Build Procedural 3D Aerodynamic Aircraft
    const planeGroup = new THREE.Group();
    planeGroupRef.current = planeGroup;

    // Metallic PBR fuselage material
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.88,
      roughness: 0.18,
      envMapIntensity: 1.2
    });

    const darkAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Sky blue accent
      metalness: 0.6,
      roughness: 0.3
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.98,
      roughness: 0.08
    });

    // Fuselage Body
    const fuselageGeo = new THREE.CylinderGeometry(0.7, 1.1, 7.5, 32);
    fuselageGeo.rotateX(Math.PI / 2);
    const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
    fuselage.castShadow = true;
    planeGroup.add(fuselage);

    // Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.7, 2.0, 32);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, chromeMat);
    nose.position.z = 4.65;
    nose.castShadow = true;
    planeGroup.add(nose);

    // Glass Canopy (Cockpit)
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7,
      transmission: 0.75,
      roughness: 0.05,
      metalness: 0.1,
      transparent: true,
      opacity: 0.8
    });
    const canopyGeo = new THREE.SphereGeometry(0.75, 24, 16);
    canopyGeo.scale(0.85, 0.65, 2.0);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 0.72, 1.2);
    planeGroup.add(canopy);

    // Main Swept Wings
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(6.5, -2.4);
    wingShape.lineTo(6.0, -3.2);
    wingShape.lineTo(0, -1.8);
    wingShape.closePath();

    const extrudeSettings = { depth: 0.12, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.04, bevelThickness: 0.04 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();

    // Right wing
    const rightWing = new THREE.Mesh(wingGeo, fuselageMat);
    rightWing.position.set(3.5, -0.1, -0.2);
    rightWing.rotation.x = Math.PI / 2;
    rightWing.castShadow = true;
    planeGroup.add(rightWing);

    // Left wing
    const leftWing = new THREE.Mesh(wingGeo, fuselageMat);
    leftWing.position.set(-3.5, -0.1, -0.2);
    leftWing.rotation.x = Math.PI / 2;
    leftWing.rotation.y = Math.PI;
    leftWing.castShadow = true;
    planeGroup.add(leftWing);

    // Navigation lights on wingtips
    const redLightGeo = new THREE.SphereGeometry(0.12, 12, 8);
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const redLight = new THREE.Mesh(redLightGeo, redLightMat);
    redLight.position.set(-6.6, 0, -1.5);
    planeGroup.add(redLight);

    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const greenLight = new THREE.Mesh(redLightGeo, greenLightMat);
    greenLight.position.set(6.6, 0, -1.5);
    planeGroup.add(greenLight);

    // Tail Stabilizer (Vertical Fin)
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.3, 2.2);
    finShape.lineTo(-1.2, 1.9);
    finShape.lineTo(-1.6, 0);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, extrudeSettings);
    finGeo.center();
    const tailFin = new THREE.Mesh(finGeo, darkAccentMat);
    tailFin.position.set(0, 1.3, -3.4);
    tailFin.rotation.y = Math.PI / 2;
    tailFin.castShadow = true;
    planeGroup.add(tailFin);

    // Tail Horizontal Stabilizers
    const hTailGeo = new THREE.BoxGeometry(3.6, 0.08, 1.2);
    const hTail = new THREE.Mesh(hTailGeo, fuselageMat);
    hTail.position.set(0, 0.35, -3.4);
    hTail.castShadow = true;
    planeGroup.add(hTail);

    // Dual Jet Turbines
    const engineGeo = new THREE.CylinderGeometry(0.42, 0.45, 2.4, 24);
    engineGeo.rotateX(Math.PI / 2);
    const leftEngine = new THREE.Mesh(engineGeo, darkAccentMat);
    leftEngine.position.set(-1.8, -0.4, 0.2);
    leftEngine.castShadow = true;
    planeGroup.add(leftEngine);

    const rightEngine = new THREE.Mesh(engineGeo, darkAccentMat);
    rightEngine.position.set(1.8, -0.4, 0.2);
    rightEngine.castShadow = true;
    planeGroup.add(rightEngine);

    // Jet Afterburner Flames (Dual Pulsing Cones)
    const flameGeo = new THREE.ConeGeometry(0.35, 2.8, 16);
    flameGeo.rotateX(-Math.PI / 2);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9
    });

    const leftFlame = new THREE.Mesh(flameGeo, flameMat);
    leftFlame.position.set(-1.8, -0.4, -2.4);
    planeGroup.add(leftFlame);

    const rightFlame = new THREE.Mesh(flameGeo, flameMat.clone());
    rightFlame.position.set(1.8, -0.4, -2.4);
    planeGroup.add(rightFlame);
    jetFlamesRef.current = [leftFlame, rightFlame];

    // Nose Propeller / Spinner
    const propGeo = new THREE.BoxGeometry(0.12, 2.4, 0.06);
    const propMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const propeller = new THREE.Mesh(propGeo, propMat);
    propeller.position.z = 5.7;
    planeGroup.add(propeller);
    propellerRef.current = propeller;

    planeGroup.position.set(0, 0, 0);
    scene.add(planeGroup);

    // 5. 3D Stars Points System (Properly referencing starsRef!)
    const starsCount = 1400;
    const starsPositions = new Float32Array(starsCount * 3);
    const starsColors = new Float32Array(starsCount * 3);

    for (let i = 0; i < starsCount; i++) {
      const i3 = i * 3;
      starsPositions[i3] = (Math.random() - 0.5) * 600;
      starsPositions[i3 + 1] = Math.random() * 400 - 50;
      starsPositions[i3 + 2] = (Math.random() - 0.5) * 600;

      const shade = 0.7 + Math.random() * 0.3;
      starsColors[i3] = shade;
      starsColors[i3 + 1] = shade * 0.95;
      starsColors[i3 + 2] = shade;
    }

    const starsGeo = new THREE.BufferGeometry();
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
    starsGeo.setAttribute('color', new THREE.BufferAttribute(starsColors, 3));

    const starsMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.15 // Fades in as multiplier climbs!
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);
    starsRef.current = stars;

    // 6. Volumetric Parallax Clouds Group
    const cloudsGroup = new THREE.Group();
    cloudsGroupRef.current = cloudsGroup;
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      transparent: true,
      opacity: 0.35
    });

    for (let c = 0; c < 24; c++) {
      const cloudWedge = new THREE.Group();
      const puffCount = 4 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        const puffGeo = new THREE.DodecahedronGeometry(1.5 + Math.random() * 2.2, 1);
        const puff = new THREE.Mesh(puffGeo, cloudMat);
        puff.position.set(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 4
        );
        cloudWedge.add(puff);
      }
      cloudWedge.position.set(
        (Math.random() - 0.5) * 160,
        -10 - Math.random() * 20,
        -120 + Math.random() * 240
      );
      cloudsGroup.add(cloudWedge);
    }
    scene.add(cloudsGroup);

    // 7. Dynamic Contrail Particles (Dual Ribbon Particles)
    const trailCount = 180;
    const trailPositions = new Float32Array(trailCount * 3);
    for (let t = 0; t < trailCount; t++) {
      trailPositions[t * 3] = (t % 2 === 0 ? -1.8 : 1.8);
      trailPositions[t * 3 + 1] = -0.4;
      trailPositions[t * 3 + 2] = -2.5 - t * 0.4;
    }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.8,
      transparent: true,
      opacity: 0.6
    });
    const trailParticles = new THREE.Points(trailGeo, trailMat);
    scene.add(trailParticles);
    trailParticlesRef.current = trailParticles;

    // 8. Explosion Particles Group (Initialized hidden)
    const explosionGroup = new THREE.Group();
    explosionGroupRef.current = explosionGroup;
    explosionGroup.visible = false;
    scene.add(explosionGroup);

    // Resize Handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    };
    window.addEventListener('resize', handleResize);

    // Render Animation Loop
    let clock = new THREE.Clock();
    const animateLoop = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Spin Propeller rapidly
      if (propellerRef.current) {
        propellerRef.current.rotation.z += 45 * delta;
      }

      // Pulse Jet Flames
      if (jetFlamesRef.current.length > 0) {
        const flamePulse = 0.85 + Math.sin(elapsed * 28) * 0.25;
        jetFlamesRef.current.forEach((flame) => {
          flame.scale.set(1, 1, flamePulse);
        });
      }

      // Drift Clouds backward for speed parallax
      if (cloudsGroupRef.current) {
        cloudsGroupRef.current.children.forEach((cloud) => {
          cloud.position.z += 35 * delta;
          if (cloud.position.z > 60) {
            cloud.position.z = -140;
            cloud.position.x = (Math.random() - 0.5) * 160;
          }
        });
      }

      renderer.render(scene, camera);
      reqIdRef.current = requestAnimationFrame(animateLoop);
    };

    reqIdRef.current = requestAnimationFrame(animateLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (reqIdRef.current) cancelAnimationFrame(reqIdRef.current);
      disposeThreeScene(scene, renderer);
    };
  }, []);

  // Handle Rocket / Plane Launch
  const handleLaunchRocket = () => {
    if (gameState === 'flying' || roundOutcome === 'unlucky_challenge') return;
    if (chips < bet) {
      sounds.playWrong();
      alert('No tienes suficientes fichas para esta apuesta.');
      return;
    }

    onUpdateChips(-bet);
    sounds.playLever();

    setGameState('flying');
    setRoundOutcome(null);
    setWinMessage(null);
    setTurnQuestionOverride(null);
    cashedOutMultiplierRef.current = null;

    // Determine crash threshold (1.20x to 8.50x)
    const rand = Math.random();
    let crashMult = 1.18 + (1 / (1 - rand * 0.88) - 1) * 0.75;
    crashMult = Math.min(10.0, Math.max(1.25, crashMult));
    crashPointRef.current = parseFloat(crashMult.toFixed(2));

    startTimeRef.current = performance.now();

    const plane = planeGroupRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    const stars = starsRef.current;

    // Reset explosion if any
    if (explosionGroupRef.current) {
      explosionGroupRef.current.visible = false;
    }

    if (plane) {
      plane.visible = true;
      plane.position.set(0, 0, 0);
      plane.rotation.set(0, 0, 0);
    }

    const flightTick = (now) => {
      const elapsedSeconds = (now - startTimeRef.current) / 1000;
      const currentMult = 1.00 + Math.pow(elapsedSeconds * 0.88, 1.78);
      setMultiplier(currentMult);

      // Smooth Banking & Climb Animation
      if (plane) {
        const bankAngle = Math.sin(elapsedSeconds * 1.8) * 0.12;
        const pitchAngle = Math.min(0.35, 0.05 + elapsedSeconds * 0.04);
        plane.rotation.z = -bankAngle;
        plane.rotation.x = -pitchAngle;

        // Leve turbulencia de empuje
        plane.position.y = Math.sin(elapsedSeconds * 6) * 0.25;
        plane.position.x = Math.sin(elapsedSeconds * 2.2) * 0.45;
      }

      // Dynamic Sky Transition from Dawn to Stratosphere
      if (scene && stars) {
        const altitudeProgress = Math.min(1, (currentMult - 1.0) / 5.0);
        const skyR = THREE.MathUtils.lerp(0.04, 0.01, altitudeProgress);
        const skyG = THREE.MathUtils.lerp(0.12, 0.02, altitudeProgress);
        const skyB = THREE.MathUtils.lerp(0.32, 0.08, altitudeProgress);
        scene.background.setRGB(skyR, skyG, skyB);
        scene.fog.color.setRGB(skyR, skyG, skyB);

        // Stars become brighter as plane enters upper atmosphere
        stars.material.opacity = THREE.MathUtils.lerp(0.15, 0.95, altitudeProgress);
      }

      // Camera FOV dynamically zooms out with speed
      if (camera) {
        camera.fov = 60 + Math.min(22, elapsedSeconds * 3.5);
        camera.updateProjectionMatrix();
      }

      // Check if Player Cashed Out
      if (cashedOutMultiplierRef.current !== null) {
        // Safe Victory Ascend
        if (plane) {
          plane.position.z += 80 * 0.016;
          plane.rotation.x = -0.5;
        }
        return;
      }

      // Check Crash Hit
      if (currentMult >= crashPointRef.current) {
        handleCrashEvent(crashPointRef.current);
      } else {
        requestAnimationFrame(flightTick);
      }
    };

    requestAnimationFrame(flightTick);
  };

  // Cash Out Safely
  const handleCashOut = () => {
    if (gameState !== 'flying' || cashedOutMultiplierRef.current !== null) return;

    const wonMult = Math.max(1.02, multiplier);
    cashedOutMultiplierRef.current = wonMult;
    setGameState('cashed_out');

    const payout = Math.round(bet * wonMult);
    onUpdateChips(payout);

    if (onRecordStudentScore && activeStudent) {
      onRecordStudentScore(activeStudent.id, payout, true, false, {
        machine: 'crash',
        bet,
        outcome: 'exonerated_by_luck',
        question: null
      });
    }

    setRoundOutcome('lucky_exonerated');
    sounds.playJackpot();
    confetti({ particleCount: 160, spread: 90, origin: { y: 0.6 } });
    setWinMessage(
      `🎉 ¡EXONERADO POR SUERTE EN AVIATOR 3D! Te retiraste a tiempo en ${wonMult.toFixed(2)}x. ¡${activeStudent ? activeStudent.name : 'El estudiante'} se salva del reto y cobra +${payout} fichas!`
    );
  };

  // Trigger Realistic 3D Crash Explosion
  const handleCrashEvent = (finalMult) => {
    sounds.playExplosion();
    setGameState('crashed');

    const plane = planeGroupRef.current;
    const scene = sceneRef.current;

    if (plane) {
      plane.visible = false; // Hide plane body on impact
    }

    // Spawn 3D Explosion Spall
    if (scene && explosionGroupRef.current) {
      const expGroup = explosionGroupRef.current;
      while (expGroup.children.length > 0) {
        expGroup.remove(expGroup.children[0]);
      }
      expGroup.visible = true;

      const flashLight = new THREE.PointLight(0xf97316, 12, 40);
      flashLight.position.set(0, 0, 0);
      expGroup.add(flashLight);

      const debrisGeo = new THREE.DodecahedronGeometry(0.35, 1);
      const debrisMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      for (let i = 0; i < 45; i++) {
        const debris = new THREE.Mesh(debrisGeo, debrisMat);
        debris.position.set(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        );
        debris.userData = {
          vx: (Math.random() - 0.5) * 25,
          vy: (Math.random() - 0.5) * 25,
          vz: (Math.random() - 0.5) * 25
        };
        expGroup.add(debris);
      }
    }

    setRoundOutcome('unlucky_challenge');
    sounds.playWrong();
    setWinMessage(
      `💥 ¡CRASH @ ${finalMult.toFixed(2)}x! El avión se perdió en la estratosfera antes de cobrar. ¡Debes responder el reto de inglés para defender tu puntuación!`
    );

    // Auto-generate pedagogical turn question on crash based on active session topics
    if (onGenerateTurnQuestion) {
      setIsGeneratingIA(true);
      onGenerateTurnQuestion(activeStudent)
        .then(newQ => {
          if (newQ) setTurnQuestionOverride(newQ);
        })
        .catch(err => console.error('Error auto-generating loss question in Aviator:', err))
        .finally(() => setIsGeneratingIA(false));
    }
  };

  const handleQuestionAnswer = (isCorrect, selected, q) => {
    if (isCorrect) {
      const reward = (q?.points || 200) + bet;
      onUpdateChips(reward);
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, reward, true, true, {
          machine: 'crash',
          bet,
          outcome: 'answered_correct',
          question: q?.question || 'Reto de Aviator'
        });
      }
      sounds.playCorrect();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setWinMessage(`🎯 ¡Excelente! ${activeStudent ? activeStudent.name : 'Respuesta correcta'}. Salvaste tu turno y ganaste +${reward} fichas.`);
    } else {
      sounds.playWrong();
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, -bet, false, true, {
          machine: 'crash',
          bet,
          outcome: 'answered_wrong',
          question: q?.question || 'Reto de Aviator'
        });
      }
      setWinMessage('❌ Respuesta incorrecta. ¡La casa retiene las fichas este vuelo!');
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
    setGameState('idle');
    setMultiplier(1.00);
    setRoundOutcome(null);
    setWinMessage(null);
    setTurnQuestionOverride(null);
    setCurrentQuestionIndex(prev => (prev + 1) % (questions.length || 1));
    cashedOutMultiplierRef.current = null;

    if (planeGroupRef.current) {
      planeGroupRef.current.visible = true;
      planeGroupRef.current.position.set(0, 0, 0);
      planeGroupRef.current.rotation.set(0, 0, 0);
    }
    if (cameraRef.current) {
      cameraRef.current.fov = 60;
      cameraRef.current.updateProjectionMatrix();
    }
    if (sceneRef.current) {
      sceneRef.current.background.setHex(0x050b18);
    }

    if (onAdvanceStudentTurn) {
      onAdvanceStudentTurn();
    }
  };

  return (
    <div
      ref={containerRef}
      id="game-root"
      className="fixed inset-0 w-screen h-screen overflow-hidden bg-slate-950 select-none z-40"
    >
      {/* CAPA 0: WebGL Three.js Real 3D Fullscreen Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block z-0 cursor-default"
      />

      {/* CAPA 1: UI Overlay Layer (pointer-events: none, controles en auto) */}
      <div
        id="ui-layer"
        className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-5"
      >
        {/* Top Navigation & Pilot Status Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playTick();
                onBackToLobby();
              }}
              className="flex items-center gap-2 bg-slate-900/85 hover:bg-slate-800 text-gray-200 hover:text-white border border-sky-500/40 px-3.5 py-2 rounded-2xl backdrop-blur-md shadow-xl text-xs font-bold cursor-pointer transition active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 text-sky-400" />
              <span>Lobby</span>
            </button>

            <button
              onClick={() => {
                toggleFullscreen(containerRef.current || document.documentElement);
                setIsFullscreen(prev => !prev);
              }}
              className="bg-slate-900/85 hover:bg-slate-800 text-gray-300 hover:text-white border border-gray-700 px-3 py-2 rounded-2xl backdrop-blur-md shadow-xl text-xs font-bold cursor-pointer transition"
              title="Pantalla Completa"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {activeStudent && (
            <div className="flex items-center gap-2.5 bg-sky-950/80 border border-sky-400/50 px-4 py-1.5 rounded-2xl backdrop-blur-md shadow-lg shadow-sky-950/40">
              <span className="text-xl">{activeStudent.avatar || '✈️'}</span>
              <div className="text-left">
                <span className="text-[10px] uppercase font-bold text-sky-300 block leading-tight">Piloto en Vuelo:</span>
                <span className="text-xs font-black text-white">{activeStudent.name}</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 bg-black/75 border border-amber-500/40 px-4 py-1.5 rounded-2xl backdrop-blur-md shadow-lg">
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-xs sm:text-sm font-black text-amber-300 font-mono">
              {chips.toLocaleString()} Fichas
            </span>
          </div>
        </header>

        {/* Central HUD: Floating Multiplier Status */}
        <main className="flex-1 flex flex-col items-center justify-center pointer-events-none relative">
          <div className="text-center select-none">
            {gameState === 'crashed' && (
              <div className="text-red-500 font-black text-5xl sm:text-7xl tracking-tighter drop-shadow-[0_0_35px_rgba(239,68,68,0.9)] animate-pulse">
                💥 {multiplier.toFixed(2)}x
                <p className="text-sm font-bold uppercase tracking-widest text-red-300 mt-2">
                  ¡CRASH! EL AVIÓN SE PERDIÓ
                </p>
              </div>
            )}

            {gameState === 'cashed_out' && (
              <div className="text-emerald-400 font-black text-5xl sm:text-7xl tracking-tighter drop-shadow-[0_0_35px_rgba(52,211,153,0.9)] animate-bounce">
                💰 {multiplier.toFixed(2)}x
                <p className="text-sm font-bold uppercase tracking-widest text-emerald-200 mt-2">
                  ¡RETIRADO A TIEMPO CON ÉXITO!
                </p>
              </div>
            )}

            {gameState === 'flying' && (
              <div className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-400 to-sky-300 font-black text-6xl sm:text-8xl tracking-tighter drop-shadow-[0_0_30px_rgba(250,204,21,0.8)]">
                {multiplier.toFixed(2)}x
                <p className="text-xs font-mono font-bold uppercase tracking-widest text-sky-300 mt-1">
                  ALTITUD Y VELOCIDAD ASCENDIENDO
                </p>
              </div>
            )}

            {gameState === 'idle' && (
              <div className="text-gray-400/80 font-black text-5xl sm:text-7xl tracking-tighter">
                1.00x
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mt-1">
                  PISTA DE DESPEGUE LISTA
                </p>
              </div>
            )}
          </div>

          {/* Win / Feedback message */}
          {winMessage && (
            <div className={`mt-4 max-w-lg mx-auto p-3.5 rounded-2xl border text-xs md:text-sm font-bold backdrop-blur-md shadow-2xl pointer-events-auto ${
              roundOutcome === 'lucky_exonerated'
                ? 'bg-emerald-950/85 border-emerald-400 text-emerald-100 shadow-emerald-950/60'
                : 'bg-red-950/85 border-red-500 text-red-100 shadow-red-950/60'
            }`}>
              {winMessage}
            </div>
          )}

          {/* Unlucky English Challenge Modal */}
          {roundOutcome === 'unlucky_challenge' && (
            <div className="w-full max-w-xl mx-auto mt-3 bg-gray-950/95 border-2 border-red-500/80 rounded-3xl p-5 shadow-2xl pointer-events-auto backdrop-blur-md animate-fadeIn space-y-3">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-red-600/30 text-red-400 border border-red-500/40">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-red-200">
                    {isGeneratingIA ? 'Generando reto de inglés con IA...' : 'Desafío de Inglés por Crash en Aviator'}
                  </span>
                </div>

                {onGenerateTurnQuestion && (
                  <button
                    onClick={handleGenerateLiveQuestion}
                    disabled={isGeneratingIA}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Sparkles className={`w-3 h-3 text-yellow-300 ${isGeneratingIA ? 'animate-spin' : ''}`} />
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

        {/* Bottom Control Deck */}
        <footer className="pointer-events-auto max-w-xl w-full mx-auto pb-2">
          {gameState === 'idle' && (
            <div className="bg-slate-900/90 border border-sky-500/40 p-4 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
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
                        ? 'bg-amber-500 text-black shadow-md font-black'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <button
                onClick={handleLaunchRocket}
                disabled={chips < bet}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-600 hover:from-sky-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-sky-950/80 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5 text-yellow-300" />
                <span>DESPEGAR ({bet} Fichas)</span>
              </button>
            </div>
          )}

          {gameState === 'flying' && (
            <button
              onClick={handleCashOut}
              className="w-full py-4 sm:py-5 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 hover:from-emerald-400 text-black font-black text-lg sm:text-xl rounded-3xl shadow-2xl shadow-emerald-950/90 animate-pulse transition transform hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-3 border-2 border-emerald-300"
            >
              <Coins className="w-7 h-7 text-black" />
              <span>COBRAR {Math.round(bet * multiplier)} FICHAS ({multiplier.toFixed(2)}x)</span>
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
