import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import confetti from 'canvas-confetti';
import { 
  ArrowLeft, 
  Coins, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  Plus, 
  Shield, 
  Sparkles, 
  Maximize2, 
  Minimize2
} from 'lucide-react';
import { sounds } from '../../utils/soundEffects';
import { disposeThreeScene, toggleFullscreen } from '../../utils/threeUtils';
import QuestionCard from '../QuestionCard';

const SUITS = [
  { symbol: '♠', name: 'spades', isRed: false },
  { symbol: '♥', name: 'hearts', isRed: true },
  { symbol: '♦', name: 'diamonds', isRed: true },
  { symbol: '♣', name: 'clubs', isRed: false }
];

const CARD_VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createShuffledDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const val of CARD_VALUES) {
      deck.push({
        value: val,
        suit: suit.symbol,
        isRed: suit.isRed,
        id: `${val}-${suit.symbol}-${Math.random().toString(36).substring(2, 7)}`
      });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateHandScore(cards) {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (['J', 'Q', 'K'].includes(card.value)) {
      score += 10;
    } else if (card.value === 'A') {
      aces += 1;
      score += 11;
    } else {
      score += parseInt(card.value, 10);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

/**
 * Creates a high-res canvas texture for the face of a playing card
 */
function createCardFrontTexture(value, suit, isRed) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 730;
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.roundRect(0, 0, 512, 730, 24);
  ctx.fill();

  // Subtle linen card grain
  ctx.fillStyle = 'rgba(240, 243, 246, 0.6)';
  ctx.fillRect(8, 8, 496, 714);

  // Border lines
  ctx.strokeStyle = isRed ? '#fca5a5' : '#cbd5e1';
  ctx.lineWidth = 6;
  ctx.roundRect(16, 16, 480, 698, 20);
  ctx.stroke();

  ctx.strokeStyle = isRed ? '#fee2e2' : '#f1f5f9';
  ctx.lineWidth = 2;
  ctx.roundRect(24, 24, 464, 682, 16);
  ctx.stroke();

  const textColor = isRed ? '#dc2626' : '#0f172a';
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Top-left rank & suit
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(value, 60, 68);
  ctx.font = '50px system-ui, sans-serif';
  ctx.fillText(suit, 60, 126);

  // Center large suit icon
  ctx.font = '160px system-ui, sans-serif';
  ctx.fillText(suit, 256, 365);

  // Bottom-right inverted rank & suit
  ctx.save();
  ctx.translate(452, 662);
  ctx.rotate(Math.PI);
  ctx.font = 'bold 54px system-ui, sans-serif';
  ctx.fillText(value, 0, 0);
  ctx.font = '50px system-ui, sans-serif';
  ctx.fillText(suit, 0, 58);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates an ornate casino card back texture
 */
function createCardBackTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 730;
  const ctx = canvas.getContext('2d');

  // Deep navy royal gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 730);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#0f172a');
  ctx.fillStyle = grad;
  ctx.roundRect(0, 0, 512, 730, 24);
  ctx.fill();

  // Golden outer border
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 8;
  ctx.roundRect(16, 16, 480, 698, 18);
  ctx.stroke();

  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.roundRect(24, 24, 464, 682, 14);
  ctx.stroke();

  // Diamond lattice pattern
  ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
  ctx.lineWidth = 2;
  const step = 28;
  for (let x = -730; x < 1200; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x + 500, 706);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, 706);
    ctx.lineTo(x + 500, 24);
    ctx.stroke();
  }

  // Center crest medallion
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(256, 365, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 365, 88, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 36px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CASINO', 256, 345);
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('ENGLISH', 256, 385);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates table felt texture with golden casino arc markings
 */
function createTableFeltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Emerald felt green background
  const bgGrad = ctx.createRadialGradient(512, 450, 50, 512, 450, 600);
  bgGrad.addColorStop(0, '#065f46');
  bgGrad.addColorStop(0.65, '#044e39');
  bgGrad.addColorStop(1, '#022c22');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Felt texture grain
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let i = 0; i < 8000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Golden betting curve
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(512, 280, 420, 0.2 * Math.PI, 0.8 * Math.PI, false);
  ctx.stroke();

  // Text on curve
  ctx.fillStyle = 'rgba(253, 230, 138, 0.85)';
  ctx.font = 'bold 28px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BLACKJACK PAYS 3 TO 2', 512, 570);

  ctx.font = 'italic 20px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(209, 250, 229, 0.75)';
  ctx.fillText('Dealer must draw to 16 and stand on all 17s', 512, 615);

  // Card placement boxes
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
  ctx.lineWidth = 2;
  // Player box
  ctx.strokeRect(412, 670, 200, 120);
  // Dealer box
  ctx.strokeRect(412, 180, 200, 120);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function BlackjackGame({
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

  // Deck & Hands state
  const [deck, setDeck] = useState(createShuffledDeck());
  const [bet, setBet] = useState(100);
  const [gameStage, setGameStage] = useState('betting'); // 'betting' | 'dealing' | 'playing' | 'dealerTurn' | 'roundEnd'
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [hideDealerHole, setHideDealerHole] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Outcome & English challenge
  const [roundOutcome, setRoundOutcome] = useState(null); // 'lucky_exonerated' | 'unlucky_challenge' | 'push' | null
  const [resultMessage, setResultMessage] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [turnQuestionOverride, setTurnQuestionOverride] = useState(null);
  const [isGeneratingIA, setIsGeneratingIA] = useState(false);

  // Three.js References
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const cardMeshesRef = useRef([]); // { id, mesh, targetPos, targetRot, isDealer, isHole }
  const chipStackGroupRef = useRef(null);
  const cardBackTextureRef = useRef(null);
  const reqIdRef = useRef(null);

  const questions = activity?.questions || [];
  const currentQuestion = turnQuestionOverride || questions[currentQuestionIndex % (questions.length || 1)];

  // ─── Three.js Scene Setup ───
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x070b14);

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.5, 100);
    camera.position.set(0, 11, 11.5);
    camera.lookAt(0, 0, 0.2);
    cameraRef.current = camera;

    // 2. High-performance WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x94a3b8, 0.7);
    scene.add(ambientLight);

    // Main casino table spotlight (with positive bias to prevent shadow acne)
    const tableSpot = new THREE.SpotLight(0xfffbeb, 4.0);
    tableSpot.position.set(0, 16, 2);
    tableSpot.target.position.set(0, 0, 0.5);
    tableSpot.angle = Math.PI / 3.2;
    tableSpot.penumbra = 0.55;
    tableSpot.castShadow = true;
    tableSpot.shadow.mapSize.width = 2048;
    tableSpot.shadow.mapSize.height = 2048;
    tableSpot.shadow.bias = 0.00005;
    tableSpot.shadow.normalBias = 0.02;
    scene.add(tableSpot);
    scene.add(tableSpot.target);

    // Warm rim light for cards and mahogany rail
    const warmRim = new THREE.DirectionalLight(0xf59e0b, 1.2);
    warmRim.position.set(-8, 12, 10);
    scene.add(warmRim);

    // Softened cool rim light to eliminate grazing edge glare
    const coolRim = new THREE.DirectionalLight(0x38bdf8, 0.35);
    coolRim.position.set(6, 8, -6);
    scene.add(coolRim);

    // 4. Casino Table (Felt & Wood Rim)
    const tableGroup = new THREE.Group();
    scene.add(tableGroup);

    // Base mesh under felt to eliminate light bleed
    const underFeltGeom = new THREE.PlaneGeometry(16, 12);
    const underFeltMat = new THREE.MeshBasicMaterial({ color: 0x050811 });
    const underFeltMesh = new THREE.Mesh(underFeltGeom, underFeltMat);
    underFeltMesh.rotation.x = -Math.PI / 2;
    underFeltMesh.position.set(0, -0.01, 0);
    tableGroup.add(underFeltMesh);

    // Mahogany outer table rim (openEnded: true to eliminate co-planar top cap Z-fighting)
    const tableRimGeom = new THREE.CylinderGeometry(14, 14.2, 0.8, 64, 1, true, 0, Math.PI);
    const tableRimMat = new THREE.MeshStandardMaterial({
      color: 0x1f0f08,
      roughness: 0.28,
      metalness: 0.15
    });
    const tableRim = new THREE.Mesh(tableRimGeom, tableRimMat);
    tableRim.rotation.y = -Math.PI / 2;
    tableRim.position.set(0, -0.45, 0);
    tableRim.receiveShadow = true;
    tableGroup.add(tableRim);

    // Green felt surface (elevated at y: 0.02 to ensure zero overlap with rim)
    const feltTexture = createTableFeltTexture();
    const feltGeom = new THREE.PlaneGeometry(16, 12);
    const feltMat = new THREE.MeshStandardMaterial({
      map: feltTexture,
      roughness: 0.88,
      metalness: 0.02
    });
    const feltMesh = new THREE.Mesh(feltGeom, feltMat);
    feltMesh.rotation.x = -Math.PI / 2;
    feltMesh.position.set(0, 0.02, 0);
    feltMesh.receiveShadow = true;
    tableGroup.add(feltMesh);

    // Leather armrest cushion at player side
    const armrestGeom = new THREE.TorusGeometry(8.5, 0.55, 16, 64, Math.PI * 0.7);
    const armrestMat = new THREE.MeshStandardMaterial({
      color: 0x110804,
      roughness: 0.45,
      metalness: 0.05
    });
    const armrest = new THREE.Mesh(armrestGeom, armrestMat);
    armrest.rotation.x = Math.PI / 2;
    armrest.rotation.z = Math.PI * 0.15;
    armrest.position.set(0, 0.25, 4.5);
    tableGroup.add(armrest);

    // 5. Card Shoe (Mazo físico en la esquina derecha)
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(6.2, 0.6, -3.8);
    shoeGroup.rotation.y = -Math.PI / 5;

    const shoeBodyGeom = new THREE.BoxGeometry(2.4, 1.4, 4.2);
    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x180d05,
      roughness: 0.35,
      metalness: 0.2
    });
    const shoeBody = new THREE.Mesh(shoeBodyGeom, shoeMat);
    shoeBody.castShadow = true;
    shoeBody.receiveShadow = true;
    shoeGroup.add(shoeBody);

    // Chrome roller bar on shoe
    const rollerGeom = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 16);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.1,
      metalness: 0.95
    });
    const roller = new THREE.Mesh(rollerGeom, chromeMat);
    roller.rotation.z = Math.PI / 2;
    roller.position.set(0, 0.72, -0.6);
    shoeGroup.add(roller);

    tableGroup.add(shoeGroup);

    // Pre-create shared card back texture
    cardBackTextureRef.current = createCardBackTexture();

    // 6. 3D Chips Stack Group
    const chipGroup = new THREE.Group();
    chipGroup.position.set(0, 0.05, 1.8);
    scene.add(chipGroup);
    chipStackGroupRef.current = chipGroup;

    // 7. Parallax mouse tracking with smooth clamping
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      const normX = (e.clientX / window.innerWidth - 0.5) * 0.6;
      const normY = (e.clientY / window.innerHeight - 0.5) * 0.4;
      mouseX = Math.max(-0.5, Math.min(0.5, normX));
      mouseY = Math.max(-0.35, Math.min(0.35, normY));
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // 8. Animation & Lerp Render Loop
    let lastTime = performance.now();
    const animate = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Subtle camera parallax
      if (cameraRef.current) {
        cameraRef.current.position.x += (mouseX * 1.5 - cameraRef.current.position.x) * dt * 2.5;
        cameraRef.current.position.y += ((11 - mouseY * 1.2) - cameraRef.current.position.y) * dt * 2.5;
        cameraRef.current.lookAt(0, 0, 0.2);
      }

      // Smoothly animate active card meshes to target pos & rot
      cardMeshesRef.current.forEach((cardItem) => {
        if (!cardItem.mesh) return;

        // Position Lerp
        cardItem.mesh.position.lerp(cardItem.targetPos, Math.min(dt * 9, 1));

        // Rotation Lerp
        cardItem.mesh.rotation.x += (cardItem.targetRot.x - cardItem.mesh.rotation.x) * Math.min(dt * 9, 1);
        cardItem.mesh.rotation.y += (cardItem.targetRot.y - cardItem.mesh.rotation.y) * Math.min(dt * 9, 1);
        cardItem.mesh.rotation.z += (cardItem.targetRot.z - cardItem.mesh.rotation.z) * Math.min(dt * 9, 1);
      });

      renderer.render(scene, cameraRef.current);
      reqIdRef.current = requestAnimationFrame(animate);
    };
    reqIdRef.current = requestAnimationFrame(animate);

    // 9. ResizeObserver
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
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);

      // Clean card meshes
      cardMeshesRef.current.forEach(c => {
        if (c.mesh && sceneRef.current) sceneRef.current.remove(c.mesh);
      });
      cardMeshesRef.current = [];

      disposeThreeScene(scene, renderer);
    };
  }, []);

  // ─── Update 3D Chip Stacks when Bet Changes ───
  useEffect(() => {
    const group = chipStackGroupRef.current;
    if (!group) return;

    // Clear old chips
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // Number of chips to render
    const count = bet === 50 ? 3 : bet === 100 ? 5 : 8;
    const chipGeom = new THREE.CylinderGeometry(0.7, 0.7, 0.12, 32);

    for (let i = 0; i < count; i++) {
      const color = bet === 50 ? 0x2563eb : bet === 100 ? 0xf59e0b : 0x7c3aed;
      const chipMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.35,
        metalness: 0.4
      });
      const chip = new THREE.Mesh(chipGeom, chipMat);
      chip.position.set(0, i * 0.13, 0);
      chip.castShadow = true;
      chip.receiveShadow = true;
      group.add(chip);
    }
  }, [bet]);

  // ─── Helper: Create 3D Physical Card Mesh ───
  const create3DCardMesh = useCallback((cardData, isDealer, isHole, targetX, targetZ, angleRad) => {
    const scene = sceneRef.current;
    if (!scene) return null;

    // Card geometry: width: 1.5, height: 2.15, thickness: 0.02
    const cardGeom = new THREE.BoxGeometry(1.5, 0.02, 2.15);

    const frontTexture = createCardFrontTexture(cardData.value, cardData.suit, cardData.isRed);
    const backTexture = cardBackTextureRef.current;

    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
    const frontMat = new THREE.MeshStandardMaterial({ map: frontTexture, roughness: 0.3 });
    const backMat = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.35 });

    // Box faces: [right, left, top(face), bottom(back), front_edge, back_edge]
    const materials = [
      edgeMat, // +X
      edgeMat, // -X
      frontMat, // +Y (Card Face)
      backMat,  // -Y (Card Back)
      edgeMat, // +Z
      edgeMat  // -Z
    ];

    const mesh = new THREE.Mesh(cardGeom, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Start position: At Card Shoe!
    mesh.position.set(5.8, 1.2, -3.5);
    mesh.rotation.set(0, -Math.PI / 4, 0);

    scene.add(mesh);

    // Target rotation:
    // If Hole card and face-down: rotate around Z so -Y (Back) points up
    const targetRotX = 0;
    const targetRotY = angleRad;
    const targetRotZ = (isHole && hideDealerHole) ? Math.PI : 0;

    return {
      id: cardData.id,
      mesh,
      targetPos: new THREE.Vector3(targetX, 0.08 + Math.random() * 0.02, targetZ),
      targetRot: new THREE.Vector3(targetRotX, targetRotY, targetRotZ),
      isDealer,
      isHole,
      cardData
    };
  }, [hideDealerHole]);

  // ─── Flip Dealer Hole Card in 3D ───
  const flipHoleCard3D = useCallback(() => {
    const holeItem = cardMeshesRef.current.find(c => c.isHole);
    if (holeItem) {
      holeItem.targetRot.z = 0; // Rotate face up
    }
  }, []);

  // ─── Clear 3D Cards from Table ───
  const clear3DCards = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    cardMeshesRef.current.forEach(item => {
      if (item.mesh) {
        scene.remove(item.mesh);
        if (item.mesh.geometry) item.mesh.geometry.dispose();
        if (Array.isArray(item.mesh.material)) {
          item.mesh.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      }
    });
    cardMeshesRef.current = [];
  }, []);

  // ─── START NEW DEAL (Repartir Mano) ───
  const startNewDeal = () => {
    if (chips < bet) {
      sounds.playWrong();
      alert('¡No hay suficientes fichas para esta apuesta!');
      return;
    }

    onUpdateChips(-bet);
    sounds.playChips();
    clear3DCards();

    let currentDeck = deck.length < 12 ? createShuffledDeck() : [...deck];
    const pCard1 = currentDeck.pop();
    const dCard1 = currentDeck.pop();
    const pCard2 = currentDeck.pop();
    const dCard2 = currentDeck.pop(); // Hole card

    setDeck(currentDeck);
    setGameStage('dealing');
    setRoundOutcome(null);
    setResultMessage('');
    setTurnQuestionOverride(null);
    setHideDealerHole(true);

    const initialPlayerCards = [pCard1, pCard2];
    const initialDealerCards = [dCard1, dCard2];

    setPlayerHand(initialPlayerCards);
    setDealerHand(initialDealerCards);

    // Staggered deal animations into 3D world
    setTimeout(() => {
      sounds.playCard();
      const m1 = create3DCardMesh(pCard1, false, false, -0.9, 2.6, -0.06);
      if (m1) cardMeshesRef.current.push(m1);
    }, 120);

    setTimeout(() => {
      sounds.playCard();
      const m2 = create3DCardMesh(dCard1, true, false, -0.9, -1.8, -0.03);
      if (m2) cardMeshesRef.current.push(m2);
    }, 380);

    setTimeout(() => {
      sounds.playCard();
      const m3 = create3DCardMesh(pCard2, false, false, 0.9, 2.6, 0.06);
      if (m3) cardMeshesRef.current.push(m3);
    }, 640);

    setTimeout(() => {
      sounds.playCard();
      const m4 = create3DCardMesh(dCard2, true, true, 0.9, -1.8, 0.03);
      if (m4) cardMeshesRef.current.push(m4);

      setGameStage('playing');

      // Natural 21 check
      const pScore = calculateHandScore(initialPlayerCards);
      if (pScore === 21) {
        finalizeRound(initialPlayerCards, initialDealerCards, currentDeck, true);
      }
    }, 900);
  };

  // ─── PLAYER HIT (Pedir Carta) ───
  const handleHit = () => {
    if (gameStage !== 'playing') return;

    let currentDeck = deck.length < 5 ? createShuffledDeck() : [...deck];
    const nextCard = currentDeck.pop();
    const updatedPlayerHand = [...playerHand, nextCard];

    setDeck(currentDeck);
    setPlayerHand(updatedPlayerHand);
    sounds.playCard();

    // Spawn new 3D card next to existing
    const idx = updatedPlayerHand.length - 1;
    const posX = -0.9 + idx * 1.6;
    const rotZ = (idx - 1) * 0.08;
    const newMeshItem = create3DCardMesh(nextCard, false, false, posX, 2.6, rotZ);
    if (newMeshItem) cardMeshesRef.current.push(newMeshItem);

    const score = calculateHandScore(updatedPlayerHand);
    if (score > 21) {
      finalizeRound(updatedPlayerHand, dealerHand, currentDeck, false);
    } else if (score === 21) {
      handleStand(updatedPlayerHand, currentDeck);
    }
  };

  // ─── PLAYER STAND (Plantarse) ───
  const handleStand = (customPlayerHand = null, customDeck = null) => {
    if (gameStage !== 'playing') return;

    setGameStage('dealerTurn');
    const finalPlayerHand = customPlayerHand || playerHand;
    let currentDeck = customDeck || (deck.length < 5 ? createShuffledDeck() : [...deck]);
    let currentDealerHand = [...dealerHand];

    setHideDealerHole(false);
    flipHoleCard3D();
    sounds.playCard();

    // Dealer draws to 17 with gentle delays
    const dealerStep = () => {
      if (calculateHandScore(currentDealerHand) < 17) {
        const card = currentDeck.pop();
        currentDealerHand.push(card);
        setDealerHand([...currentDealerHand]);
        sounds.playCard();

        const dIdx = currentDealerHand.length - 1;
        const posX = -0.9 + dIdx * 1.6;
        const rotZ = (dIdx - 1) * 0.06;
        const newDMesh = create3DCardMesh(card, true, false, posX, -1.8, rotZ);
        if (newDMesh) cardMeshesRef.current.push(newDMesh);

        setTimeout(dealerStep, 450);
      } else {
        setDeck(currentDeck);
        finalizeRound(finalPlayerHand, currentDealerHand, currentDeck, false);
      }
    };

    setTimeout(dealerStep, 400);
  };

  // ─── FINALIZE ROUND ───
  const finalizeRound = (pHand, dHand, currentDeck, isNaturalBlackjack = false) => {
    setHideDealerHole(false);
    flipHoleCard3D();
    setGameStage('roundEnd');

    const pScore = calculateHandScore(pHand);
    const dScore = calculateHandScore(dHand);

    if (pScore > 21) {
      // Bust -> Unlucky!
      triggerUnluckyLoss(`💥 ¡Te pasaste de 21 (${pScore} pts)! La casa gana la mano. ¡Supera el reto de inglés para defender tu turno!`);
    } else if (isNaturalBlackjack) {
      // Natural 21 -> Lucky exonerated with 3:2 payout
      const winPayout = Math.round(bet * 2.5);
      onUpdateChips(winPayout);
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, winPayout, true, false, {
          machine: 'blackjack',
          bet,
          outcome: 'exonerated_by_luck',
          question: null
        });
      }
      setRoundOutcome('lucky_exonerated');
      sounds.playJackpot();
      confetti({ particleCount: 140, spread: 85, origin: { y: 0.6 } });
      setResultMessage(`🔥 ¡BLACKJACK NATURAL (21)! ${activeStudent ? activeStudent.name : 'El estudiante'} derrota a la casa, queda exonerado y cobra +${winPayout} fichas.`);
    } else if (dScore > 21 || pScore > dScore) {
      // Player wins -> Lucky exonerated!
      const winPayout = Math.round(bet * 2);
      onUpdateChips(winPayout);
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, winPayout, true, false, {
          machine: 'blackjack',
          bet,
          outcome: 'exonerated_by_luck',
          question: null
        });
      }
      setRoundOutcome('lucky_exonerated');
      sounds.playJackpot();
      confetti({ particleCount: 110, spread: 70, origin: { y: 0.6 } });
      setResultMessage(`🎉 ¡VICTORIA EN EL 21! ${pScore} vs ${dScore > 21 ? 'Crupier se pasó' : `${dScore} del Crupier`}. ¡${activeStudent ? activeStudent.name : 'El estudiante'} queda exonerado y cobra +${winPayout} fichas!`);
    } else if (pScore === dScore) {
      // Push -> Bet returned
      onUpdateChips(bet);
      setRoundOutcome('push');
      sounds.playChips();
      setResultMessage(`🤝 ¡Empate (${pScore} a ${dScore})! La casa devuelve las ${bet} fichas.`);
    } else {
      // Dealer wins -> Unlucky!
      triggerUnluckyLoss(`⚠️ El Crupier ganó (${dScore} vs tus ${pScore}). ¡Debes responder el reto de inglés para salvar tu turno!`);
    }
  };

  const triggerUnluckyLoss = async (msg) => {
    setRoundOutcome('unlucky_challenge');
    sounds.playWrong();
    setResultMessage(msg);
    if (onGenerateTurnQuestion) {
      setIsGeneratingIA(true);
      try {
        const liveQ = await onGenerateTurnQuestion(activeStudent);
        if (liveQ) {
          setTurnQuestionOverride(liveQ);
        }
      } catch (err) {
        console.warn('Fallback to standard question list on loss:', err);
      } finally {
        setIsGeneratingIA(false);
      }
    }
  };

  const handleQuestionAnswer = (isCorrect, selected, q) => {
    if (isCorrect) {
      const reward = (q?.points || 200) + bet;
      onUpdateChips(reward);
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, reward, true, true, {
          machine: 'blackjack',
          bet,
          outcome: 'answered_correct',
          question: q?.question || 'Reto de blackjack'
        });
      }
      sounds.playCorrect();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setResultMessage(`🎯 ¡Reto superado! ${activeStudent ? activeStudent.name : 'Respuesta correcta'}. Salvaste tu turno y ganaste +${reward} fichas.`);
    } else {
      sounds.playWrong();
      if (onRecordStudentScore && activeStudent) {
        onRecordStudentScore(activeStudent.id, -bet, false, true, {
          machine: 'blackjack',
          bet,
          outcome: 'answered_wrong',
          question: q?.question || 'Reto de blackjack'
        });
      }
      setResultMessage('❌ Respuesta incorrecta. ¡Sigue practicando!');
    }

    // Do NOT increment question index here so the answered card remains stable on screen!
  };

  const handleRegenerateTurnQuestion = async () => {
    if (!onGenerateTurnQuestion) return;
    setIsGeneratingIA(true);
    sounds.playChips();
    try {
      const newQ = await onGenerateTurnQuestion(activeStudent);
      if (newQ) {
        setTurnQuestionOverride(newQ);
        sounds.playTick();
      }
    } catch (err) {
      alert(err.message || 'Error al generar pregunta con IA.');
    } finally {
      setIsGeneratingIA(false);
    }
  };

  const handleNextTurn = () => {
    setGameStage('betting');
    setRoundOutcome(null);
    setResultMessage('');
    setPlayerHand([]);
    setDealerHand([]);
    setTurnQuestionOverride(null);
    clear3DCards();
    // Advance to next question only when advancing turn
    setCurrentQuestionIndex(prev => (prev + 1) % (questions.length || 1));
    if (onAdvanceStudentTurn) {
      onAdvanceStudentTurn();
    }
  };

  const playerScore = calculateHandScore(playerHand);
  const dealerScore = hideDealerHole
    ? (dealerHand[0] ? calculateHandScore([dealerHand[0]]) : 0)
    : calculateHandScore(dealerHand);

  return (
    <div id="game-root" ref={containerRef} className="fixed inset-0 z-50 overflow-hidden bg-black select-none">
      {/* 3D WebGL Canvas Layer (z-index: 0, only receives 3D inputs) */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 z-0 w-full h-full block touch-none" 
      />

      {/* Floating 2D HUD / UI Layer (z-index: 10, pointer-events: none, buttons: pointer-events: auto) */}
      <div 
        id="ui-layer" 
        className="absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-5 pointer-events-none"
      >
        {/* Top Header Bar */}
        <header className="pointer-events-auto flex items-center justify-between gap-3 bg-slate-950/80 border border-emerald-500/40 px-4 py-2.5 rounded-2xl backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                sounds.playTick();
                onBackToLobby();
              }}
              className="px-3 py-1.5 rounded-xl bg-gray-900 border border-gray-700 hover:border-amber-500/50 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1.5 transition cursor-pointer"
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
                <span className="text-[10px] uppercase font-bold text-emerald-400 block leading-tight">Turno en 21:</span>
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

        {/* Central HUD: Live Scores & Result Banners */}
        <main className="pointer-events-none flex flex-col items-center justify-center my-auto w-full max-w-2xl mx-auto space-y-3">
          {/* 3D Score Displays */}
          {(playerHand.length > 0 || dealerHand.length > 0) && (
            <div className="pointer-events-auto flex items-center justify-between w-full px-6 py-2 bg-black/60 border border-emerald-500/30 rounded-2xl backdrop-blur-md shadow-xl text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-300 block">🤵 Crupier:</span>
                <span className="text-sm sm:text-base font-black text-white font-mono">
                  {hideDealerHole ? `Muestra ${dealerScore}` : `Total: ${dealerScore}`}
                </span>
              </div>

              <div className="text-xs font-black text-amber-400 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                MESA 3D • 21 CASINO
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-amber-300 block">👤 Tu Mano:</span>
                <span className={`text-sm sm:text-base font-black font-mono ${
                  playerScore === 21 ? 'text-yellow-300 drop-shadow-[0_0_8px_#facc15]' : 'text-white'
                }`}>
                  {playerScore} {playerScore === 21 ? '🌟 21!' : ''}
                </span>
              </div>
            </div>
          )}

          {/* Round Outcome Banner */}
          {resultMessage && (
            <div className={`pointer-events-auto w-full p-3.5 rounded-2xl border text-xs sm:text-sm font-bold backdrop-blur-md shadow-2xl flex items-center justify-center gap-2 animate-fadeIn ${
              roundOutcome === 'lucky_exonerated'
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 shadow-emerald-950/60'
                : roundOutcome === 'push'
                ? 'bg-blue-950/90 border-blue-400 text-blue-100'
                : 'bg-red-950/90 border-red-500 text-red-100 shadow-red-950/60'
            }`}>
              {roundOutcome === 'lucky_exonerated' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              )}
              <span>{resultMessage}</span>
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
                  <span>Reto de Inglés por Mano Perdida en Blackjack</span>
                </div>

                {onGenerateTurnQuestion && (
                  <button
                    onClick={handleRegenerateTurnQuestion}
                    disabled={isGeneratingIA}
                    className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>{isGeneratingIA ? 'Generando...' : 'Reto IA'}</span>
                  </button>
                )}
              </div>

              {isGeneratingIA ? (
                <div className="p-8 text-center bg-black/60 rounded-2xl border border-purple-500/40 space-y-3">
                  <Sparkles className="w-8 h-8 text-yellow-300 animate-spin mx-auto" />
                  <p className="text-sm font-bold text-purple-200">
                    ⚡ Generando reto de inglés con IA para {activeStudent?.name || 'el estudiante'}...
                  </p>
                  <p className="text-xs text-gray-400">Consultando los temas activos de la sesión</p>
                </div>
              ) : currentQuestion ? (
                <QuestionCard
                  key={currentQuestion.id || currentQuestionIndex}
                  question={currentQuestion}
                  onAnswer={handleQuestionAnswer}
                  activeStudent={activeStudent}
                />
              ) : null}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleNextTurn}
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
          {gameStage === 'betting' && (
            <div className="bg-slate-950/90 border border-emerald-500/40 p-4 rounded-3xl backdrop-blur-md shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-300">Apuesta:</span>
                {[50, 100, 200].map((amt) => (
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

              {/* DEAL BUTTON - Always responsive and directly clickable! */}
              <button
                onClick={startNewDeal}
                disabled={chips < bet}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 text-gray-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/30 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🃏 ¡REPARTIR MANO!</span>
              </button>
            </div>
          )}

          {gameStage === 'playing' && (
            <div className="flex items-center justify-center gap-3 w-full bg-slate-950/90 border border-emerald-500/40 p-3 rounded-3xl backdrop-blur-md shadow-2xl">
              <button
                onClick={handleHit}
                className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white font-black text-sm rounded-2xl shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>PEDIR CARTA (Hit)</span>
              </button>

              <button
                onClick={() => handleStand()}
                className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 text-black font-black text-sm rounded-2xl shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>PLANTARSE (Stand)</span>
              </button>
            </div>
          )}

          {gameStage === 'roundEnd' && roundOutcome !== 'unlucky_challenge' && (
            <div className="flex items-center justify-center gap-3 w-full bg-slate-950/90 border border-emerald-500/40 p-3 rounded-3xl backdrop-blur-md shadow-2xl">
              <button
                onClick={handleNextTurn}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 text-white font-black text-xs sm:text-sm rounded-2xl shadow-lg transition transform hover:scale-105 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Siguiente Alumno / Turno →</span>
              </button>

              <button
                onClick={() => {
                  setGameStage('betting');
                  setPlayerHand([]);
                  setDealerHand([]);
                  setRoundOutcome(null);
                  setResultMessage('');
                  setTurnQuestionOverride(null);
                  clear3DCards();
                }}
                className="px-5 py-3 bg-gray-800 hover:bg-gray-700 text-amber-300 font-bold text-xs sm:text-sm rounded-2xl border border-gray-700 transition cursor-pointer"
              >
                Jugar otra mano
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
