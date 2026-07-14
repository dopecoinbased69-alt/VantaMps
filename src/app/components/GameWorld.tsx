import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { 
  Car, 
  Compass, 
  Gamepad2, 
  Layers, 
  MapPin, 
  ShieldAlert, 
  Waves, 
  ArrowUp, 
  RotateCcw, 
  Eye, 
  Volume2, 
  VolumeX, 
  CheckCircle,
  Dribbble,
  Crosshair
} from "lucide-react";

// ─── TYPES & INTERFACES ──────────────────────────────────────────────────────

interface GameStats {
  health: number;
  armor: number;
  ammo: number;
  reserve: number;
  kills: number;
  speed: number;
  gear: string;
  rpm: number;
  isDriving: boolean;
  carFuel: number;
  activeWeapon: string;
  score: number;
  playerX?: number;
  playerZ?: number;
  carX?: number;
  carZ?: number;
}

interface GameWorldProps {
  stats: GameStats;
  onUpdateStats: (updater: (prev: GameStats) => GameStats) => void;
  onGameOver: () => void;
  soundEnabled: boolean;
  environment?: "cyber" | "desert" | "volcano" | "arctic";
  invertJoystickX?: boolean;
}

// ─── PROCEDURAL GENERATION HELPERS ───────────────────────────────────────────

// Fast pseudo-noise height generator for realistic mountains and ocean bed
function getTerrainHeight(x: number, z: number, environment: "cyber" | "desert" | "volcano" | "arctic" = "cyber"): number {
  // Central base platform around (0,0) - perfect for testing grounds and buildings
  const distFromCenter = Math.sqrt(x * x + z * z);
  
  if (distFromCenter < 25) {
    // Flat flat ground for buildings
    return 0;
  }

  // Smooth transition from flat to mountains
  const mountainWeight = Math.min(1.0, (distFromCenter - 25) / 100.0);
  
  if (environment === "desert") {
    // Neon Desert: broad sloping sand dunes, flat dry salt beds, and sharp canyon cliffs
    const octave1 = Math.sin(x * 0.015) * Math.cos(z * 0.015) * 12; // dunes
    const octave2 = Math.cos(x * 0.08) * Math.sin(z * 0.08) * 4; // sharp steps
    const octave3 = Math.sin(x * 0.2) * Math.sin(z * 0.2) * 1.5; // ripples
    
    // Terraced canyon steps
    let peaks = octave1 + octave2 + octave3;
    if (peaks > 4) {
      // Create step canyon shelves
      peaks = 4 + Math.floor(peaks - 4) * 2 + ((peaks - 4) % 1) * 0.2;
    }
    
    // Deep oasis pool canyon on the West
    let oasisSlope = 0;
    if (x < -20) {
      oasisSlope = (x + 20) * 0.12;
    }
    
    let height = peaks * mountainWeight + oasisSlope;
    if (height < -12) height = -12;
    return height;
    
  } else if (environment === "volcano") {
    // Volcanic Wasteland: violent craggy ridges, caldera slopes, deep lava rifts
    const octave1 = Math.abs(Math.sin(x * 0.025) * Math.cos(z * 0.025)) * 32; // jagged peaks
    const octave2 = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 6;
    const octave3 = (Math.cos(x * 0.18) + Math.sin(z * 0.18)) * 1.5;
    
    let peaks = octave1 + octave2 + octave3;
    // Lava trenches / cracks
    const trenchPattern = Math.sin(x * 0.04) * Math.cos(z * 0.04);
    if (trenchPattern < -0.3) {
      peaks -= 15; // sudden deep crack
    }
    
    let volcanicSlope = 0;
    if (x < -25) {
      volcanicSlope = (x + 25) * 0.22; // steep drop into lava sea
    }
    
    let height = peaks * mountainWeight + volcanicSlope;
    if (height < -20) height = -20;
    return height;

  } else if (environment === "arctic") {
    // Arctic Tundra: smooth rounded icy sheets, giant glacier icebergs, frozen crevices
    const octave1 = Math.sin(x * 0.012) * Math.sin(z * 0.012) * 18;
    const octave2 = Math.cos(x * 0.04) * Math.cos(z * 0.04) * 5;
    const octave3 = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
    
    // Rounded domes/hummocks
    const dome = Math.sin(octave1 * 0.1) * 10;
    let peaks = dome + octave2 + octave3;
    
    let arcticSlope = 0;
    if (x < -20) {
      arcticSlope = (x + 20) * 0.1; // slope to frozen bay
    }
    
    let height = peaks * mountainWeight + arcticSlope;
    if (height < -15) height = -15;
    return height;

  } else {
    // Default cyber mountains
    const octave1 = Math.sin(x * 0.02) * Math.cos(z * 0.02) * 20;
    const octave2 = Math.cos(x * 0.05 + 1.0) * Math.sin(z * 0.06) * 8;
    const octave3 = Math.sin(x * 0.15) * Math.sin(z * 0.12) * 2;
    const peaks = Math.max(0, octave1 + octave2 + octave3);
    
    let oceanSlope = 0;
    if (x < -20) {
      oceanSlope = (x + 20) * 0.15;
    }

    let height = peaks * mountainWeight + oceanSlope;
    if (height < -25) height = -25;
    return height;
  }
}

// Helper to calculate wave displacement for water physics
function getWaterDisplacement(x: number, z: number, time: number): number {
  // Waves at ocean height (default Y = -2)
  const wave1 = Math.sin(x * 0.2 + time * 1.5) * 0.3;
  const wave2 = Math.cos(z * 0.15 + time * 2.0) * 0.2;
  const wave3 = Math.sin((x + z) * 0.1 + time * 1.0) * 0.15;
  return -2.0 + wave1 + wave2 + wave3; // Ocean height is centered around Y = -2
}

const ENV_CONFIGS = {
  cyber: {
    skyColor: "#04060e",
    fogColor: "#04060e",
    fogDensity: 0.015,
    ambientColor: 0x1e2b4d,
    ambientIntensity: 0.7,
    sunColor: 0xffaa66,
    sunIntensity: 1.4,
    oceanLightColor: 0x38bdf8,
    oceanLightIntensity: 0.8,
    sandCol: "#ccb088",
    grassCol: "#0f172a",
    neonGridCol: "#1e293b",
    snowCol: "#4a5568",
    wireframeColor: 0x1240d6,
    wireframeOpacity: 0.08,
    oceanColor: 0x075e8a,
    oceanOpacity: 0.78,
  },
  desert: {
    skyColor: "#1e100c",
    fogColor: "#1e100c",
    fogDensity: 0.012,
    ambientColor: 0x4d2c1e,
    ambientIntensity: 0.65,
    sunColor: 0xff9f55,
    sunIntensity: 1.5,
    oceanLightColor: 0x14b8a6, // Oasis turquoise reflection
    oceanLightIntensity: 0.9,
    sandCol: "#f59e0b", // Golden orange dunes
    grassCol: "#b45309", // Terracotta cliffs
    neonGridCol: "#451a03", // Dark desert basalt
    snowCol: "#1c0d02", // Very dark clay peak accents
    wireframeColor: 0xf97316, // Bright neon orange grid
    wireframeOpacity: 0.12,
    oceanColor: 0x115e59, // Darker turquoise oasis pool
    oceanOpacity: 0.82,
  },
  volcano: {
    skyColor: "#0c0205",
    fogColor: "#0c0205",
    fogDensity: 0.02,
    ambientColor: 0x3b0712,
    ambientIntensity: 0.8,
    sunColor: 0xef4444, // Burning red sun
    sunIntensity: 1.6,
    oceanLightColor: 0xf97316, // Orange magma glare
    oceanLightIntensity: 1.1,
    sandCol: "#111827", // Black obsidian beach
    grassCol: "#1f2937", // Gray lava crust
    neonGridCol: "#374151", // Volcanic basalt rock
    snowCol: "#dc2626", // Incandescent lava peak veins
    wireframeColor: 0xef4444, // Hot neon red grid
    wireframeOpacity: 0.15,
    oceanColor: 0x991b1b, // Glowing deep crimson lava
    oceanOpacity: 0.9,
  },
  arctic: {
    skyColor: "#02141a",
    fogColor: "#02141a",
    fogDensity: 0.016,
    ambientColor: 0x082f49,
    ambientIntensity: 0.8,
    sunColor: 0xa5f3fc, // Cool celestial cyan sun
    sunIntensity: 1.3,
    oceanLightColor: 0x0ea5e9, // Glacier ice sheet glows
    oceanLightIntensity: 0.9,
    sandCol: "#38bdf8", // Glowing cyan beach ice
    grassCol: "#0369a1", // Dark blue glacier pack
    neonGridCol: "#1e293b", // Slate blue bedrock
    snowCol: "#f1f5f9", // Crisp white frost snow
    wireframeColor: 0x06b6d4, // Glacier blue neon grid
    wireframeOpacity: 0.1,
    oceanColor: 0x0ea5e9, // High-visibility frozen cyan bay
    oceanOpacity: 0.72,
  }
};

// Building geometry schemas for collision and stairs
interface BoundingBox3D {
  minX: number; maxX: number;
  minY: number; maxY: number;
  minZ: number; maxZ: number;
}

interface BuildingStructure {
  id: string;
  name: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  floors: {
    y: number;
    height: number;
    rooms: BoundingBox3D[];
  }[];
  stairs: {
    minX: number; maxX: number;
    minZ: number; maxZ: number;
    startY: number; endY: number;
    direction: "north" | "south" | "east" | "west";
  }[];
}

// ─── 3D ENVIRONMENT COMPONENT ────────────────────────────────────────────────

export default function GameWorld({ stats, onUpdateStats, onGameOver, soundEnabled, environment = "cyber", invertJoystickX = true }: GameWorldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const environmentRef = useRef(environment);
  environmentRef.current = environment;
  
  const invertJoystickXRef = useRef(invertJoystickX);
  invertJoystickXRef.current = invertJoystickX;
  
  // Game states & refs
  const [controlsHelp, setControlsHelp] = useState(true);
  const [viewMode, setViewMode] = useState<"fps" | "third">("fps");
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [carSirens, setCarSirens] = useState(false);
  const [carHorn, setCarHorn] = useState(false);
  const [pointerLocked, setPointerLocked] = useState(false);

  // Virtual movement joystick state and refs (Left)
  const moveJoystickBaseRef = useRef<HTMLDivElement>(null);
  const [moveJoystickKnob, setMoveJoystickKnob] = useState({ x: 0, y: 0 });
  const [isMoveJoystickDragging, setIsMoveJoystickDragging] = useState(false);
  const activeMovePointerId = useRef<number | null>(null);

  // Virtual look/aim joystick state and refs (Right)
  const lookJoystickBaseRef = useRef<HTMLDivElement>(null);
  const [lookJoystickKnob, setLookJoystickKnob] = useState({ x: 0, y: 0 });
  const [isLookJoystickDragging, setIsLookJoystickDragging] = useState(false);
  const lookStickValue = useRef({ x: 0, y: 0 });
  const activeLookPointerId = useRef<number | null>(null);

  const updateMoveJoystick = (clientX: number, clientY: number) => {
    if (!moveJoystickBaseRef.current) return;
    const rect = moveJoystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45; 
    
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }
    
    setMoveJoystickKnob({ x: dx, y: dy });
    
    const nx = dx / maxRadius;
    const ny = dy / maxRadius;
    
    const deadzone = 0.15;
    keysPressed.current["w"] = ny < -deadzone;
    keysPressed.current["s"] = ny > deadzone;
    
    const actualNx = invertJoystickXRef.current ? -nx : nx;
    keysPressed.current["a"] = actualNx < -deadzone;
    keysPressed.current["d"] = actualNx > deadzone;
  };

  const updateLookJoystick = (clientX: number, clientY: number) => {
    if (!lookJoystickBaseRef.current) return;
    const rect = lookJoystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 45;
    
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius;
      dy = (dy / distance) * maxRadius;
    }
    
    setLookJoystickKnob({ x: dx, y: dy });
    
    const nx = dx / maxRadius;
    const ny = dy / maxRadius;
    
    const deadzone = 0.1;
    if (Math.abs(nx) > deadzone || Math.abs(ny) > deadzone) {
      const actualNx = invertJoystickXRef.current ? -nx : nx;
      lookStickValue.current = { x: actualNx, y: ny };
    } else {
      lookStickValue.current = { x: 0, y: 0 };
    }
  };

  const handleMoveJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    activeMovePointerId.current = e.pointerId;
    setIsMoveJoystickDragging(true);
    updateMoveJoystick(e.clientX, e.clientY);
  };

  const handleLookJoystickStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    activeLookPointerId.current = e.pointerId;
    setIsLookJoystickDragging(true);
    updateLookJoystick(e.clientX, e.clientY);
  };

  // Keep refs to update handlers so the global event listeners don't require recreation or use stale closures
  const updateMoveJoystickRef = useRef(updateMoveJoystick);
  updateMoveJoystickRef.current = updateMoveJoystick;
  const updateLookJoystickRef = useRef(updateLookJoystick);
  updateLookJoystickRef.current = updateLookJoystick;

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerId === activeMovePointerId.current) {
        updateMoveJoystickRef.current(e.clientX, e.clientY);
      } else if (e.pointerId === activeLookPointerId.current) {
        updateLookJoystickRef.current(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (e.pointerId === activeMovePointerId.current) {
        activeMovePointerId.current = null;
        setIsMoveJoystickDragging(false);
        setMoveJoystickKnob({ x: 0, y: 0 });
        keysPressed.current["w"] = false;
        keysPressed.current["s"] = false;
        keysPressed.current["a"] = false;
        keysPressed.current["d"] = false;
      } else if (e.pointerId === activeLookPointerId.current) {
        activeLookPointerId.current = null;
        setIsLookJoystickDragging(false);
        setLookJoystickKnob({ x: 0, y: 0 });
        lookStickValue.current = { x: 0, y: 0 };
      }
    };

    const handlePointerCancel = (e: PointerEvent) => {
      handlePointerUp(e);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerCancel, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, []);

  // Keyboard state
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  
  // Reference objects for tick updating
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  
  // Player state inside 3D
  const playerRef = useRef({
    x: 0,
    y: 1.5, // Start above ground
    z: 10,
    vx: 0, vy: 0, vz: 0,
    yaw: 0, pitch: 0,
    height: 1.8,
    isGrounded: true,
    isSwimming: false,
    onStairs: false,
    buildingId: null as string | null,
    floorLevel: 0
  });

  // Car state inside 3D
  const carRef = useRef({
    x: 12,
    y: 0.5,
    z: -10,
    vx: 0, vy: 0, vz: 0,
    angle: -Math.PI / 2, // Facing direction
    speed: 0,
    maxSpeed: 38,
    acceleration: 15,
    deceleration: 12,
    friction: 4,
    turnSpeed: 2.2,
    steering: 0,
    health: 100,
    fuel: 100,
    mesh: null as THREE.Group | null,
    wheels: [] as THREE.Mesh[],
    spotlight: null as THREE.SpotLight | null,
    hornTimer: 0,
    bobTimer: 0
  });

  // Target drones list
  const targetsRef = useRef<{ mesh: THREE.Mesh; direction: number; speed: number; id: number }[]>([]);
  
  // Bullet/projectiles list
  const bulletsRef = useRef<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number }[]>([]);
  const particlesRef = useRef<{ mesh: THREE.Points; velocity: THREE.Vector3[]; age: number; maxAge: number }[]>([]);

  // Web Audio synth for engine sound and weapon fire
  const audioCtxRef = useRef<AudioContext | null>(null);
  const engineOscRef = useRef<OscillatorNode | null>(null);
  const engineGainRef = useRef<GainNode | null>(null);

  // Define World Buildings for physics and layout
  const buildings: BuildingStructure[] = [
    {
      id: "outpost",
      name: "Tactical HQ (2-Story)",
      x: -12,
      z: -15,
      width: 14,
      depth: 14,
      height: 10,
      color: "#1e293b",
      floors: [
        { y: 0, height: 4.8, rooms: [] },
        { y: 5.0, height: 4.8, rooms: [] }
      ],
      stairs: [
        {
          minX: -16, maxX: -13, // Relates to building relative pos
          minZ: -20, maxZ: -12,
          startY: 0, endY: 5.0,
          direction: "north"
        }
      ]
    },
    {
      id: "research",
      name: "Control Tower (2-Story)",
      x: 22,
      z: 22,
      width: 10,
      depth: 10,
      height: 12,
      color: "#0f172a",
      floors: [
        { y: 0, height: 5.5, rooms: [] },
        { y: 5.8, height: 5.5, rooms: [] }
      ],
      stairs: [
        {
          minX: 20, maxX: 22,
          minZ: 18, maxZ: 25,
          startY: 0, endY: 5.8,
          direction: "east"
        }
      ]
    }
  ];

  // ─── AUDIO ENGINE SYNTHESIS ─────────────────────────────────────────────────

  const initAudio = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      // Create engine oscillator
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(45, ctx.currentTime); // Low growl
      
      // Low pass filter to make it sound muffled/metallic
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(150, ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0, ctx.currentTime); // Start silent
      osc.start();

      engineOscRef.current = osc;
      engineGainRef.current = gain;
    } catch (e) {
      console.warn("Web Audio API not supported or blocked: ", e);
    }
  }, [soundEnabled]);

  const playSynthSound = (type: "shoot" | "hit" | "horn" | "explosion" | "splash") => {
    if (!soundEnabled || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const t = ctx.currentTime;
    
    if (type === "shoot") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(400, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);
      
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.16);
    } else if (type === "hit") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.linearRampToValueAtTime(20, t + 0.08);
      
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.08);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.09);
    } else if (type === "explosion") {
      // Noise burst for explosions
      const bufferSize = ctx.sampleRate * 0.4;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(200, t);
      filter.frequency.exponentialRampToValueAtTime(30, t + 0.4);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } else if (type === "splash") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(t + 0.35);
    }
  };

  // Update engine sound pitch/gain based on driving speed/RPM
  const updateEngineAudio = useCallback((speed: number, isDriving: boolean) => {
    if (!soundEnabled || !engineOscRef.current || !engineGainRef.current || !audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    
    if (isDriving) {
      const absSpeed = Math.abs(speed);
      const rpmFactor = (absSpeed / 38) * 120 + 45; // base pitch 45Hz goes up to 165Hz
      
      engineOscRef.current.frequency.setTargetAtTime(rpmFactor, ctx.currentTime, 0.1);
      engineGainRef.current.gain.setTargetAtTime(0.18, ctx.currentTime, 0.2);
    } else {
      // Quiet rumble or off
      engineGainRef.current.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    }
  }, [soundEnabled]);

  // ─── PARTICLE SPARKS EFFECT ─────────────────────────────────────────────────

  const createSparks = (position: THREE.Vector3, colorHex = 0x7effc0, count = 15) => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions.push(position.x, position.y, position.z);
      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 8,
        (Math.random() * 5 + 3),
        (Math.random() - 0.5) * 8
      ));
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.4,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const sparkPoints = new THREE.Points(geometry, material);
    scene.add(sparkPoints);

    particlesRef.current.push({
      mesh: sparkPoints,
      velocity: velocities,
      age: 0,
      maxAge: 35 // Frames life
    });
  };

  // ─── CAR ENTER/EXIT ACTION ──────────────────────────────────────────────────

  const toggleVehicleMode = () => {
    const p = playerRef.current;
    const c = carRef.current;

    if (stats.isDriving) {
      // EXIT CAR
      // Place player slightly to the left of the car
      const angle = c.angle + Math.PI / 2;
      p.x = c.x + Math.sin(angle) * 2.5;
      p.z = c.z + Math.cos(angle) * 2.5;
      
      // Keep on building heights if car was parked on one
      p.y = Math.max(0, getTerrainHeight(p.x, p.z, environmentRef.current) + 0.8);
      p.vx = 0;
      p.vz = 0;
      p.vy = 0;

      onUpdateStats((prev) => ({
        ...prev,
        isDriving: false,
        speed: 0
      }));
      
      setViewMode("fps");
      setActivePrompt("EXITED VEHICLE");
      setTimeout(() => setActivePrompt(null), 1500);
      updateEngineAudio(0, false);
    } else {
      // ENTER CAR (Check range)
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const dist = Math.sqrt(dx*dx + dz*dz);

      if (dist < 4.0) {
        onUpdateStats((prev) => ({
          ...prev,
          isDriving: true
        }));
        
        setViewMode("third");
        setActivePrompt("DRIVING TACTICAL CAR");
        setTimeout(() => setActivePrompt(null), 2000);
        
        // Match player orientation to car yaw
        p.yaw = c.angle;
        updateEngineAudio(0, true);
      } else {
        setActivePrompt("TOO FAR TO ENTER VEHICLE");
        setTimeout(() => setActivePrompt(null), 1500);
      }
    }
  };

  // ─── COMBAT: FIRE LASER WEAPON ──────────────────────────────────────────────

  const fireWeapon = () => {
    if (stats.ammo <= 0) {
      setActivePrompt("OUT OF AMMO - RELOAD");
      setTimeout(() => setActivePrompt(null), 1500);
      return;
    }

    onUpdateStats((prev) => ({
      ...prev,
      ammo: prev.ammo - 1
    }));

    playSynthSound("shoot");

    if (!sceneRef.current || !cameraRef.current) return;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Create a physical glowing laser projectile mesh
    const bulletGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 5);
    bulletGeo.rotateX(Math.PI / 2); // Align forward
    const bulletMat = new THREE.MeshBasicMaterial({ color: 0x7effc0 });
    const bullet = new THREE.Mesh(bulletGeo, bulletMat);

    // Initial position slightly in front and offset
    bullet.position.copy(camera.position);
    
    // Direction vector of the camera view
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    bullet.position.addScaledVector(dir, 1.2);

    scene.add(bullet);

    // Speed
    const bSpeed = 110;
    bulletsRef.current.push({
      mesh: bullet,
      vx: dir.x * bSpeed,
      vy: dir.y * bSpeed,
      vz: dir.z * bSpeed,
      life: 60 // 1 second life
    });
  };

  // Reload action
  const performReload = useCallback(() => {
    if (stats.reserve <= 0) return;
    if (stats.ammo === 30) return;
    
    setActivePrompt("RELOADING...");
    setTimeout(() => {
      onUpdateStats((prev) => {
        const needed = 30 - prev.ammo;
        const take = Math.min(needed, prev.reserve);
        return {
          ...prev,
          ammo: prev.ammo + take,
          reserve: prev.reserve - take
        };
      });
      setActivePrompt(null);
    }, 1200);
  }, [stats.reserve, stats.ammo, onUpdateStats]);

  // Stable refs for props and state to prevent re-triggering the massive Three.js initialization useEffect
  const isDrivingRef = useRef(stats.isDriving);
  isDrivingRef.current = stats.isDriving;

  const ammoRef = useRef(stats.ammo);
  ammoRef.current = stats.ammo;

  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const onUpdateStatsRef = useRef(onUpdateStats);
  onUpdateStatsRef.current = onUpdateStats;

  const performReloadRef = useRef(performReload);
  performReloadRef.current = performReload;

  const onGameOverRef = useRef(onGameOver);
  onGameOverRef.current = onGameOver;

  const playSynthSoundRef = useRef(playSynthSound);
  playSynthSoundRef.current = playSynthSound;

  const updateEngineAudioRef = useRef(updateEngineAudio);
  updateEngineAudioRef.current = updateEngineAudio;

  const toggleVehicleModeRef = useRef(toggleVehicleMode);
  toggleVehicleModeRef.current = toggleVehicleMode;

  const fireWeaponRef = useRef(fireWeapon);
  fireWeaponRef.current = fireWeapon;

  // ─── INITIALIZATION & CORE LOOP ──────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize Web Audio API on click
    const startAudioContext = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener("click", startAudioContext);

    // 1. Scene & Render Setup
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Elegant cyber sunset atmosphere
    const config = ENV_CONFIGS[environment] || ENV_CONFIGS.cyber;

    scene.background = new THREE.Color(config.skyColor);
    scene.fog = new THREE.FogExp2(config.fogColor, config.fogDensity);

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 1000);
    cameraRef.current = camera;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. Beautiful Sky Dome & Sun Light
    const ambientLight = new THREE.AmbientLight(config.ambientColor, config.ambientIntensity);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(config.sunColor, config.sunIntensity);
    sunLight.position.set(80, 50, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 300;
    const side = 150;
    sunLight.shadow.camera.left = -side;
    sunLight.shadow.camera.right = side;
    sunLight.shadow.camera.top = side;
    sunLight.shadow.camera.bottom = -side;
    scene.add(sunLight);

    // Rim lighting / ocean reflection glows
    const oceanLight = new THREE.DirectionalLight(config.oceanLightColor, config.oceanLightIntensity);
    oceanLight.position.set(-60, 20, -50);
    scene.add(oceanLight);

    // 3. Realistic Mountains (Procedural Terrain)
    const terrainSize = 500;
    const terrainSegs = 150;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegs, terrainSegs);
    terrainGeo.rotateX(-Math.PI / 2); // Make flat

    const positions = terrainGeo.attributes.position;
    const colorArray: number[] = [];

    // Colors mapping: beach yellow, cliff rock, high peaks
    const sandCol = new THREE.Color(config.sandCol);
    const grassCol = new THREE.Color(config.grassCol); // Cyber slate
    const neonGridCol = new THREE.Color(config.neonGridCol); // Mountain rock dark slate
    const snowCol = new THREE.Color(config.snowCol);

    for (let i = 0; i < positions.count; i++) {
      const vx = positions.getX(i);
      const vz = positions.getZ(i);
      const vy = getTerrainHeight(vx, vz, environment);
      
      positions.setY(i, vy);

      // Determine vertex color based on altitude and slope
      if (vy < -1) {
        colorArray.push(sandCol.r, sandCol.g, sandCol.b); // Sand underwater
      } else if (vy < 1.5) {
        // Sandy coast / beach
        const t = (vy + 1) / 2.5;
        const finalCol = sandCol.clone().lerp(grassCol, t);
        colorArray.push(finalCol.r, finalCol.g, finalCol.b);
      } else if (vy < 15) {
        // Hills
        const t = (vy - 1.5) / 13.5;
        const finalCol = grassCol.clone().lerp(neonGridCol, t);
        colorArray.push(finalCol.r, finalCol.g, finalCol.b);
      } else {
        // High peaks
        const t = Math.min(1.0, (vy - 15) / 15);
        const finalCol = neonGridCol.clone().lerp(snowCol, t);
        colorArray.push(finalCol.r, finalCol.g, finalCol.b);
      }
    }

    terrainGeo.setAttribute("color", new THREE.Float32BufferAttribute(colorArray, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.25,
      flatShading: true
    });

    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Neon grid accent over terrain to fit the FPS cyber theme
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: config.wireframeColor,
      wireframe: true,
      transparent: true,
      opacity: config.wireframeOpacity
    });
    const terrainWireframe = new THREE.Mesh(terrainGeo.clone(), wireframeMat);
    terrainWireframe.position.y += 0.02; // Avoid z-fighting
    scene.add(terrainWireframe);

    // 4. Ocean with Water Physics Plane
    const oceanGeo = new THREE.PlaneGeometry(600, 600, 100, 100);
    oceanGeo.rotateX(-Math.PI / 2);
    
    // Simple shader-like vertex modification in loop is applied later
    const oceanMat = new THREE.MeshStandardMaterial({
      color: config.oceanColor,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: config.oceanOpacity,
      flatShading: true
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -2.0; // Ocean height
    scene.add(oceanMesh);

    // 5. Explorable 2-Story Buildings Construction
    buildings.forEach((bld) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(bld.x, 0, bld.z);
      scene.add(bGroup);

      // --- Ground floor plate
      const floorG = new THREE.BoxGeometry(bld.width, 0.2, bld.depth);
      const concreteMat = new THREE.MeshStandardMaterial({ color: bld.color, roughness: 0.7 });
      const groundFloor = new THREE.Mesh(floorG, concreteMat);
      groundFloor.position.y = 0.1;
      groundFloor.receiveShadow = true;
      bGroup.add(groundFloor);

      // --- Second floor plate
      const secondFloor = new THREE.Mesh(floorG, concreteMat);
      secondFloor.position.y = 5.0;
      secondFloor.receiveShadow = true;
      bGroup.add(secondFloor);

      // --- Roof floor plate
      const roofFloor = new THREE.Mesh(floorG, concreteMat);
      roofFloor.position.y = 10.0;
      roofFloor.receiveShadow = true;
      bGroup.add(roofFloor);

      // --- Structural pillars (Ground to second, second to roof)
      const pGeo = new THREE.BoxGeometry(0.8, bld.height, 0.8);
      const pillarPositions = [
        [-bld.width/2 + 0.5, -bld.depth/2 + 0.5],
        [ bld.width/2 - 0.5, -bld.depth/2 + 0.5],
        [-bld.width/2 + 0.5,  bld.depth/2 - 0.5],
        [ bld.width/2 - 0.5,  bld.depth/2 - 0.5]
      ];
      
      pillarPositions.forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pGeo, concreteMat);
        pillar.position.set(px, bld.height / 2, pz);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        bGroup.add(pillar);
      });

      // --- Exterior/Interior Walls with openings (Doorways/Windows)
      // Ground floor walls
      const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.4 });
      
      // West Wall (solid)
      const sideWallG = new THREE.BoxGeometry(0.2, 4.8, bld.depth);
      const westWall = new THREE.Mesh(sideWallG, wallMat);
      westWall.position.set(-bld.width/2, 2.4, 0);
      westWall.castShadow = true;
      westWall.receiveShadow = true;
      bGroup.add(westWall);

      // East Wall
      const eastWall = new THREE.Mesh(sideWallG, wallMat);
      eastWall.position.set(bld.width/2, 2.4, 0);
      eastWall.castShadow = true;
      eastWall.receiveShadow = true;
      bGroup.add(eastWall);

      // North wall (with dynamic windows)
      const frontWallG1 = new THREE.BoxGeometry(bld.width / 3, 4.8, 0.2);
      const nWallLeft = new THREE.Mesh(frontWallG1, wallMat);
      nWallLeft.position.set(-bld.width / 3, 2.4, -bld.depth/2);
      bGroup.add(nWallLeft);

      const nWallRight = new THREE.Mesh(frontWallG1, wallMat);
      nWallRight.position.set(bld.width / 3, 2.4, -bld.depth/2);
      bGroup.add(nWallRight);

      // Ground Floor South door and wall
      const sWallLeft = new THREE.Mesh(frontWallG1, wallMat);
      sWallLeft.position.set(-bld.width / 3, 2.4, bld.depth/2);
      bGroup.add(sWallLeft);

      // --- 2nd Floor glass walls/windows for great mountain observation
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.4,
        roughness: 0.05,
        metalness: 0.95
      });
      const windowG = new THREE.BoxGeometry(bld.width - 1, 3.5, 0.1);
      
      const frontWindow = new THREE.Mesh(windowG, glassMat);
      frontWindow.position.set(0, 7.2, -bld.depth/2 + 0.1);
      bGroup.add(frontWindow);

      const backWindow = new THREE.Mesh(windowG, glassMat);
      backWindow.position.set(0, 7.2, bld.depth/2 - 0.1);
      bGroup.add(backWindow);

      // Second floor handrails (fences)
      const fenceG = new THREE.BoxGeometry(bld.width, 1.1, 0.2);
      const southFence = new THREE.Mesh(fenceG, wallMat);
      southFence.position.set(0, 5.6, bld.depth/2);
      bGroup.add(southFence);

      // --- STAIRCASE to 2nd Floor (12 steps)
      const numSteps = 14;
      const stepWidth = 3.0;
      const stepDepth = bld.depth / numSteps;
      const stepHeight = 5.0 / numSteps;

      for (let s = 0; s < numSteps; s++) {
        const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth + 0.1);
        const step = new THREE.Mesh(stepGeo, concreteMat);
        
        // Arrange steps starting from South to North climbing up
        const stepZ = bld.depth / 2 - (s * stepDepth) - stepDepth / 2;
        const stepY = (s * stepHeight) + stepHeight / 2;
        
        step.position.set(-bld.width / 2 + stepWidth / 2 + 0.4, stepY, stepZ);
        step.castShadow = true;
        step.receiveShadow = true;
        bGroup.add(step);
      }

      // Add neat interactive glowing terminal prop on first floor
      const consoleG = new THREE.BoxGeometry(1.5, 1.2, 1.0);
      const consoleMesh = new THREE.Mesh(consoleG, wallMat);
      consoleMesh.position.set(0, 0.6, 0);
      
      const screenG = new THREE.BoxGeometry(1.1, 0.6, 0.1);
      const screenMat = new THREE.MeshBasicMaterial({ color: 0x7effc0 });
      const screen = new THREE.Mesh(screenG, screenMat);
      screen.position.set(0, 1.1, 0.15);
      screen.rotateX(-0.3);
      bGroup.add(consoleMesh);
      bGroup.add(screen);

      const terminalLight = new THREE.PointLight(0x7effc0, 1.0, 5);
      terminalLight.position.set(0, 1.5, 0.5);
      bGroup.add(terminalLight);
    });

    // 6. Modeled Drivable Tactical Car (Cyber styling)
    const carGroup = new THREE.Group();
    carGroup.position.set(carRef.current.x, carRef.current.y, carRef.current.z);
    carGroup.rotation.y = carRef.current.angle;
    scene.add(carGroup);

    // Car Body / Chassis (Slanted sci-fi vehicle)
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1e1b4b, // Deep indigo
      roughness: 0.15,
      metalness: 0.85
    });
    
    const chassisGeo = new THREE.BoxGeometry(2.4, 0.8, 4.4);
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    carGroup.add(chassis);

    // Cockpit
    const cockpitGeo = new THREE.BoxGeometry(2.0, 0.7, 2.2);
    const cockpit = new THREE.Mesh(cockpitGeo, chassisMat);
    cockpit.position.set(0, 1.1, -0.3);
    cockpit.castShadow = true;
    carGroup.add(cockpit);

    // Neon headlights
    const lampG = new THREE.BoxGeometry(0.5, 0.12, 0.1);
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfffbeb });
    
    const lLight = new THREE.Mesh(lampG, headlightMat);
    lLight.position.set(-0.8, 0.45, 2.2);
    carGroup.add(lLight);

    const rLight = new THREE.Mesh(lampG, headlightMat);
    rLight.position.set(0.8, 0.45, 2.2);
    carGroup.add(rLight);

    // Tail light neon bars
    const tailMat = new THREE.MeshBasicMaterial({ color: 0xcc1a2e });
    const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.1), tailMat);
    tailLight.position.set(0, 0.5, -2.21);
    carGroup.add(tailLight);

    // Add Spotlight projecting headlights beam
    const headlightSpot = new THREE.SpotLight(0xfffae0, 6.0, 55, Math.PI / 4, 0.5, 1);
    headlightSpot.position.set(0, 0.5, 2.3);
    headlightSpot.target.position.set(0, 0, 15);
    carGroup.add(headlightSpot);
    carGroup.add(headlightSpot.target);
    carRef.current.spotlight = headlightSpot;

    // 4 Cylinder Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 12);
    wheelGeo.rotateZ(Math.PI / 2); // Align axle
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 });

    const wheelOffsets = [
      [-1.3, 0.1, 1.4, "fl"],   // Front Left
      [ 1.3, 0.1, 1.4, "fr"],   // Front Right
      [-1.3, 0.1, -1.4, "rl"],  // Rear Left
      [ 1.3, 0.1, -1.4, "rr"]   // Rear Right
    ] as const;

    const wheelMeshes: THREE.Mesh[] = [];
    wheelOffsets.forEach(([wx, wy, wz]) => {
      const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
      wMesh.position.set(wx, wy, wz);
      wMesh.castShadow = true;
      carGroup.add(wMesh);
      wheelMeshes.push(wMesh);
    });

    carRef.current.wheels = wheelMeshes;
    carRef.current.mesh = carGroup;

    // 7. Interactive Laser Target Drones (Floating in sky/mountains)
    const targetGeo = new THREE.SphereGeometry(1.2, 7, 7);
    const targetMat = new THREE.MeshStandardMaterial({
      color: 0xcc1a2e,
      emissive: 0x3b0712,
      roughness: 0.2,
      metalness: 0.9,
      flatShading: true
    });

    const targetPositions = [
      [15, 6, -15],
      [-22, 10, 2],
      [4, 18, -32],
      [30, 12, 10],
      [-5, 4, -8]
    ];

    targetPositions.forEach(([tx, ty, tz], index) => {
      const drone = new THREE.Mesh(targetGeo, targetMat);
      drone.position.set(tx, ty, tz);
      scene.add(drone);
      
      // Ring around drone
      const ringGeo = new THREE.RingGeometry(1.6, 1.8, 10);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xcc1a2e, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotateX(Math.PI/2);
      drone.add(ring);

      targetsRef.current.push({
        mesh: drone,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: 1.5 + Math.random() * 2.0,
        id: index
      });
    });

    // 8. Visual guide paths (Neon lights) matching the game arena
    const neonLineGeo = new THREE.BoxGeometry(0.3, 0.05, 50);
    const neonLineMat = new THREE.MeshBasicMaterial({ color: 0x1240d6 });
    const trackLine = new THREE.Mesh(neonLineGeo, neonLineMat);
    trackLine.position.set(12, 0.02, 15);
    scene.add(trackLine);

    // Initialize audio system
    initAudio();

    // ─── CONTROL INPUT EVENT LISTENERS ────────────────────────────────────────

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Handle custom menu key binds matching parent
      if (key === "f") {
        toggleVehicleModeRef.current();
      }
      if (key === "r") {
        performReloadRef.current();
      }
      if (key === "v") {
        setViewMode((v) => (v === "fps" ? "third" : "fps"));
      }
      if (key === "h") {
        setCarHorn(true);
        playSynthSoundRef.current("hit");
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
      if (key === "h") {
        setCarHorn(false);
      }
    };

    // DUAL-MODE FPS CONTROLS (Pointer Lock + Drag fallback for iframe)
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const handleMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      // Shoot on left click
      if (e.button === 0 && !isDrivingRef.current && viewModeRef.current === "fps") {
        fireWeaponRef.current();
        
        // Request pointer lock when clicking inside the game window
        if (containerRef.current && document.pointerLockElement !== containerRef.current) {
          containerRef.current.requestPointerLock();
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const isLocked = document.pointerLockElement === containerRef.current;
      if (isLocked) {
        // Pointer Lock Active: direct precise movement coordinates
        const sensitivity = 0.0025;
        playerRef.current.yaw -= e.movementX * sensitivity;
        playerRef.current.pitch -= e.movementY * sensitivity;
      } else {
        // Drag To Look Fallback (Universal/Iframe resilient)
        if (!isDragging) return;
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;

        const sensitivity = 0.004;
        playerRef.current.yaw -= deltaX * sensitivity;
        playerRef.current.pitch -= deltaY * sensitivity;
      }

      // Restrict pitch (look up/down limits)
      playerRef.current.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, playerRef.current.pitch));
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      setPointerLocked(isLocked);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    containerRef.current.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("pointerlockchange", handlePointerLockChange);

    // ─── REAL-TIME GAME LOOP ──────────────────────────────────────────────────

    let lastTime = performance.now();
    let animFrameId: number;

    const gameLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastTime) / 1000); // delta time capped to prevent teleport glitches
      lastTime = now;

      const car = carRef.current;
      const player = playerRef.current;

      // Wave physics simulation for water shader
      const waveTime = now / 1000;
      const oceanPositions = oceanGeo.attributes.position;
      for (let i = 0; i < oceanPositions.count; i++) {
        const ox = oceanPositions.getX(i);
        const oz = oceanPositions.getZ(i);
        const oy = getWaterDisplacement(ox, oz, waveTime);
        oceanPositions.setY(i, oy);
      }
      oceanGeo.computeVertexNormals();
      oceanGeo.attributes.position.needsUpdate = true;

      // Move Target Drones slowly bobbing
      targetsRef.current.forEach((trg) => {
        trg.mesh.position.y += Math.sin(now / 500 + trg.id) * 0.015;
        trg.mesh.rotation.y += dt * 0.5;
        trg.mesh.position.x += trg.direction * trg.speed * dt;

        // Turn around at limits
        if (Math.abs(trg.mesh.position.x) > 100) {
          trg.direction *= -1;
        }

        // --- Drone Collision check vs Player / Car ---
        const playerPos = new THREE.Vector3(player.x, player.y + 1, player.z);
        const distToPlayer = trg.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 2.5) {
          playSynthSoundRef.current("hit");
          createSparks(trg.mesh.position, 0xff7700, 15);
          onUpdateStatsRef.current((prev) => ({
            ...prev,
            health: Math.max(0, prev.health - 6)
          }));
          // Bounce drone back
          trg.direction *= -1;
          trg.mesh.position.x += trg.direction * 3.0;
        }

        const carPos = new THREE.Vector3(car.x, car.y + 0.8, car.z);
        const distToCar = trg.mesh.position.distanceTo(carPos);
        if (distToCar < 3.0) {
          playSynthSoundRef.current("hit");
          createSparks(trg.mesh.position, 0xffaa00, 15);
          // Bounce drone back
          trg.direction *= -1;
          trg.mesh.position.x += trg.direction * 3.0;
        }
      });

      // Update flying bullet lasers and bullet collision check
      const nextBullets: typeof bulletsRef.current = [];
      bulletsRef.current.forEach((b) => {
        b.mesh.position.x += b.vx * dt;
        b.mesh.position.y += b.vy * dt;
        b.mesh.position.z += b.vz * dt;
        b.life--;

        let bulletHit = false;

        // 1. Collision bullet vs Drones
        targetsRef.current.forEach((trg, idx) => {
          const dist = b.mesh.position.distanceTo(trg.mesh.position);
          if (dist < 2.5) {
            bulletHit = true;
            // Explosion sound & sparks
            playSynthSoundRef.current("explosion");
            createSparks(trg.mesh.position, 0xff3b30, 25);

            // Relocate drone somewhere else
            trg.mesh.position.set(
              (Math.random() - 0.5) * 80,
              10 + Math.random() * 10,
              (Math.random() - 0.5) * 80
            );

            // Increment Kills & score!
            onUpdateStatsRef.current((prev) => ({
              ...prev,
              kills: prev.kills + 1,
              score: prev.score + 150
            }));
          }
        });

        // 2. Collision bullet vs Terrain (Ground)
        const gHeight = getTerrainHeight(b.mesh.position.x, b.mesh.position.z);
        if (b.mesh.position.y <= gHeight) {
          bulletHit = true;
          createSparks(b.mesh.position, 0x1240d6, 8); // Blue spark on rocks
        }

        if (b.life > 0 && !bulletHit) {
          nextBullets.push(b);
        } else {
          scene.remove(b.mesh);
        }
      });
      bulletsRef.current = nextBullets;

      // Update Particle Sparks Physics
      const nextParticles: typeof particlesRef.current = [];
      particlesRef.current.forEach((p) => {
        const posAttr = p.mesh.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < posAttr.count; i++) {
          const px = posAttr.getX(i) + p.velocity[i].x * dt;
          const py = posAttr.getY(i) + p.velocity[i].y * dt;
          const pz = posAttr.getZ(i) + p.velocity[i].z * dt;
          
          p.velocity[i].y -= 9.8 * dt; // Gravity sparks
          posAttr.setXYZ(i, px, py, pz);
        }
        posAttr.needsUpdate = true;
        p.age++;

        if (p.age < p.maxAge) {
          nextParticles.push(p);
        } else {
          scene.remove(p.mesh);
        }
      });
      particlesRef.current = nextParticles;

      // ─── VEHICLE PHYSICS ENGINE & UPDATES ──────────────────────────────────

      // Update camera rotation based on the Look joystick (mobile/touch)
      if (lookStickValue.current.x !== 0 || lookStickValue.current.y !== 0) {
        const lookSpeed = 2.2; // rads per sec rotation speed
        player.yaw += lookStickValue.current.x * lookSpeed * dt;
        player.pitch -= lookStickValue.current.y * lookSpeed * dt;
        player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, player.pitch));
      }

      // Steering wheel roll/friction values
      if (isDrivingRef.current) {
        // Accelerate
        if (keysPressed.current["w"]) {
          car.speed += car.acceleration * dt;
        } else if (keysPressed.current["s"]) {
          car.speed -= car.deceleration * dt;
        } else {
          // Coasting friction
          if (car.speed > 0) car.speed = Math.max(0, car.speed - car.friction * dt);
          if (car.speed < 0) car.speed = Math.min(0, car.speed + car.friction * dt);
        }

        // Steer (with speed factor)
        // Corrected: Pressing 'a' (left) decreases angle (turns left in our coordinates), pressing 'd' (right) increases it.
        const turnMult = car.speed < 0 ? -1 : 1;
        if (keysPressed.current["a"]) {
          car.angle -= car.turnSpeed * dt * turnMult * Math.min(1.0, Math.abs(car.speed) / 6);
          car.steering = Math.max(-0.5, car.steering - 2 * dt);
        } else if (keysPressed.current["d"]) {
          car.angle += car.turnSpeed * dt * turnMult * Math.min(1.0, Math.abs(car.speed) / 6);
          car.steering = Math.min(0.5, car.steering + 2 * dt);
        } else {
          car.steering *= 0.8; // Return straight
        }

        // Clamp speed
        car.speed = Math.max(-10, Math.min(car.maxSpeed, car.speed));

        // Drive / Steering position update
        car.x += Math.sin(car.angle) * car.speed * dt;
        car.z += Math.cos(car.angle) * car.speed * dt;

        // --- CAR BOUNDARY & COLLISION PHYSICS ---
        // 1. Map boundary collision so car doesn't fall off the 3D grid
        const mapLimit = 240;
        if (car.x < -mapLimit) { car.x = -mapLimit; car.speed = -car.speed * 0.35; }
        if (car.x > mapLimit) { car.x = mapLimit; car.speed = -car.speed * 0.35; }
        if (car.z < -mapLimit) { car.z = -mapLimit; car.speed = -car.speed * 0.35; }
        if (car.z > mapLimit) { car.z = mapLimit; car.speed = -car.speed * 0.35; }

        // 2. Solid building collision box check with bounce-back response
        const carRadius = 1.8;
        buildings.forEach((bld) => {
          if (car.y >= 0 && car.y <= bld.height) {
            const minX = bld.x - bld.width / 2 - carRadius;
            const maxX = bld.x + bld.width / 2 + carRadius;
            const minZ = bld.z - bld.depth / 2 - carRadius;
            const maxZ = bld.z + bld.depth / 2 + carRadius;

            if (car.x > minX && car.x < maxX && car.z > minZ && car.z < maxZ) {
              // Push out of bounding box along the shortest axis
              const distL = Math.abs(car.x - minX);
              const distR = Math.abs(car.x - maxX);
              const distT = Math.abs(car.z - minZ);
              const distB = Math.abs(car.z - maxZ);
              const minDist = Math.min(distL, distR, distT, distB);

              if (minDist === distL) car.x = minX;
              else if (minDist === distR) car.x = maxX;
              else if (minDist === distT) car.z = minZ;
              else car.z = maxZ;

              // Play solid crash/collision effects & damage on hard hits
              if (Math.abs(car.speed) > 1.5) {
                playSynthSoundRef.current("hit");
                createSparks(new THREE.Vector3(car.x, car.y + 0.6, car.z), 0xff3b30, 15);
                
                onUpdateStatsRef.current((prev) => ({
                  ...prev,
                  health: Math.max(0, prev.health - Math.round(Math.abs(car.speed) * 0.8))
                }));
              }
              car.speed = -car.speed * 0.35; // bounce back
            }
          }
        });

        // Drive terrain height tracking with suspension bounce
        const groundY = getTerrainHeight(car.x, car.z, environmentRef.current);
        const oceanWaterY = getWaterDisplacement(car.x, car.z, waveTime);

        // OCEAN BUOYANCY WATER PHYSICS:
        if (groundY < -2.0) {
          // In ocean! Bob on waves
          const targetY = oceanWaterY + 0.3; // Floating offset
          car.y += (targetY - car.y) * 4.0 * dt; // Float bob speed
          car.speed *= 0.94; // Heavily slowed by water physics

          // Splash particles occasionally
          if (Math.abs(car.speed) > 1.5 && Math.random() > 0.85) {
            playSynthSoundRef.current("splash");
            createSparks(new THREE.Vector3(car.x, car.y - 0.2, car.z), 0x38bdf8, 12);
          }
        } else {
          // On solid ground
          car.y += (groundY - car.y) * 12.0 * dt; // Snap to terrain
        }

        // Update wheel meshes rotation
        car.wheels.forEach((wheel, index) => {
          // Roll
          wheel.rotation.x += (car.speed / 1.0) * dt;
          // Pivot front wheels for steering visual
          if (index < 2) {
            wheel.rotation.y = car.steering;
          }
        });

        // Sync car mesh location
        if (car.mesh) {
          car.mesh.position.set(car.x, car.y + 0.3, car.z);
          car.mesh.rotation.y = car.angle;
        }

        // Keep player matched to car cockpit
        player.x = car.x;
        player.y = car.y + 1.2;
        player.z = car.z;

        // Sync stats UI dashboard
        onUpdateStatsRef.current((prev) => ({
          ...prev,
          speed: Math.round(Math.abs(car.speed) * 3), // Speed dial
          rpm: Math.min(9000, Math.round(3000 + Math.abs(car.speed) * 140)),
          gear: car.speed < -0.1 ? "R" : car.speed < 2 ? "N" : Math.abs(car.speed) > 28 ? "D5" : Math.abs(car.speed) > 18 ? "D4" : "D3"
        }));

        // Drain car fuel
        if (Math.abs(car.speed) > 0.1 && Math.random() > 0.9) {
          onUpdateStatsRef.current((prev) => ({
            ...prev,
            carFuel: Math.max(0, prev.carFuel - 1)
          }));
        }

        updateEngineAudioRef.current(car.speed, true);
      } else {
        // ─── PLAYER WALK ON-FOOT FPS CONTROLS ────────────────────────────────
        let moveX = 0;
        let moveZ = 0;

        if (keysPressed.current["w"] || keysPressed.current["arrowup"]) {
          moveZ += 1;
        }
        if (keysPressed.current["s"] || keysPressed.current["arrowdown"]) {
          moveZ -= 1;
        }
        if (keysPressed.current["a"] || keysPressed.current["arrowleft"]) {
          moveX += 1;
        }
        if (keysPressed.current["d"] || keysPressed.current["arrowright"]) {
          moveX -= 1;
        }

        // Movement relative to current direction yaw look
        const speed = keysPressed.current["shift"] ? 14.0 : 7.0; // Sprint
        const forwardX = Math.sin(player.yaw);
        const forwardZ = Math.cos(player.yaw);
        const rightX = Math.sin(player.yaw - Math.PI / 2);
        const rightZ = Math.cos(player.yaw - Math.PI / 2);

        player.vx = (forwardX * moveZ + rightX * moveX) * speed;
        player.vz = (forwardZ * moveZ + rightZ * moveX) * speed;

        // Apply movement physics
        player.x += player.vx * dt;
        player.z += player.vz * dt;

        // --- PLAYER COLLISION PHYSICS ---
        // 1. Map boundaries so player doesn't wander off the map limits
        const playerMapLimit = 240;
        if (player.x < -playerMapLimit) player.x = -playerMapLimit;
        if (player.x > playerMapLimit) player.x = playerMapLimit;
        if (player.z < -playerMapLimit) player.z = -playerMapLimit;
        if (player.z > playerMapLimit) player.z = playerMapLimit;

        // 2. Solid building walls collision check (with openings for doorways)
        const pRadius = 0.6;
        buildings.forEach((bld) => {
          // Collision applies if the player's Y matches the building vertical layers
          const isAtGroundFloor = player.y >= 0 && player.y < 4.8;
          const isAtSecondFloor = player.y >= 4.8 && player.y < 9.8;

          if (isAtGroundFloor || isAtSecondFloor) {
            const dx = player.x - bld.x;
            const dz = player.z - bld.z;
            const hw = bld.width / 2;
            const hd = bld.depth / 2;

            // West wall (completely solid at -hw)
            if (Math.abs(dz) < hd) {
              const westX = -hw;
              if (dx < westX && dx + pRadius > westX) {
                player.x = bld.x + westX - pRadius;
              }
              if (dx > westX && dx - pRadius < westX) {
                player.x = bld.x + westX + pRadius;
              }

              // East wall (completely solid at +hw)
              const eastX = hw;
              if (dx > eastX && dx - pRadius < eastX) {
                player.x = bld.x + eastX + pRadius;
              }
              if (dx < eastX && dx + pRadius > eastX) {
                player.x = bld.x + eastX - pRadius;
              }
            }

            // North and South walls (solid except for the middle 1/3 doorway on ground floor)
            if (Math.abs(dx) < hw) {
              const northZ = -hd;
              const southZ = hd;
              // Doorway is on south wall (or north depending on entry), let's keep middle 1/3 clear for entrance on ground floor
              const isInDoorwayZone = Math.abs(dx) < (bld.width / 6);

              // North Wall
              if (!isInDoorwayZone || isAtSecondFloor) {
                if (dz < northZ && dz + pRadius > northZ) {
                  player.z = bld.z + northZ - pRadius;
                }
                if (dz > northZ && dz - pRadius < northZ) {
                  player.z = bld.z + northZ + pRadius;
                }
              }

              // South Wall
              if (!isInDoorwayZone || isAtSecondFloor) {
                if (dz > southZ && dz - pRadius < southZ) {
                  player.z = bld.z + southZ + pRadius;
                }
                if (dz < southZ && dz + pRadius > southZ) {
                  player.z = bld.z + southZ - pRadius;
                }
              }
            }
          }
        });

        // Jump physical simulation
        const gravity = 22.0;
        if (!player.isGrounded) {
          player.vy -= gravity * dt;
          player.y += player.vy * dt;
        }

        // Terrain height detection below player
        const floorY = getTerrainHeight(player.x, player.z, environmentRef.current);
        const waterHeight = getWaterDisplacement(player.x, player.z, waveTime);

        // Check if player is on the stairs of Buildings (HQ Outpost or Control Tower)
        let buildingFloorY = -999;
        let insideBuilding = false;

        buildings.forEach((bld) => {
          const dx = player.x - bld.x;
          const dz = player.z - bld.z;

          // Inside building bounds check
          if (Math.abs(dx) < bld.width/2 && Math.abs(dz) < bld.depth/2) {
            insideBuilding = true;
            
            // Staircase climb physics check:
            // HQ Outpost staircase is in the west corridor
            if (bld.id === "outpost") {
              const stairWest = -bld.width/2 + 3.4;
              if (dx < stairWest && dz > -bld.depth/2 && dz < bld.depth/2) {
                // Smooth height interpolate climbing stairs
                const pct = (bld.depth/2 - dz) / bld.depth; // 0 to 1 as we move North
                buildingFloorY = pct * 5.0;
              } else {
                // On flat floors (Ground vs 2nd)
                if (player.y > 3.0) {
                  buildingFloorY = 5.0; // 2nd Floor level Y
                } else {
                  buildingFloorY = 0;   // Ground Floor level Y
                }
              }
            } else if (bld.id === "research") {
              // Staircase for research tower
              if (dx > bld.width/2 - 3.4) {
                const pct = (dz + bld.depth/2) / bld.depth;
                buildingFloorY = pct * 5.8;
              } else {
                if (player.y > 3.5) {
                  buildingFloorY = 5.8;
                } else {
                  buildingFloorY = 0;
                }
              }
            }
          }
        });

        // Set floor target height (stair vs building vs terrain rock)
        const targetGroundedY = insideBuilding ? buildingFloorY : floorY;

        // Swimming/ocean physics:
        if (targetGroundedY < -2.0) {
          player.isSwimming = true;
          // Bob on water level
          if (player.y < waterHeight) {
            player.y += (waterHeight - player.y) * 6.0 * dt;
            player.vy = 0;
            player.isGrounded = true;
          }
        } else {
          player.isSwimming = false;
          // Snap player feet to ground if close or below it (collision resolution)
          if (player.y <= targetGroundedY) {
            player.y = targetGroundedY;
            player.vy = 0;
            player.isGrounded = true;
          } else {
            player.isGrounded = false;
          }
        }

        // Handle Jump Input
        if (keysPressed.current[" "] && player.isGrounded) {
          player.vy = 8.5; // Jump strength
          player.isGrounded = false;
        }

        // Damage warning if player falls into toxic water/depth bounds
        if (player.isSwimming && Math.random() > 0.96) {
          onUpdateStatsRef.current((prev) => {
            const nextHealth = Math.max(0, prev.health - 2);
            if (nextHealth === 0) {
              setTimeout(() => onGameOverRef.current(), 500);
            }
            return {
              ...prev,
              health: nextHealth
            };
          });
        }
      }

      // Sync real-time positions for the tactical map in the parent HUD
      onUpdateStatsRef.current((prev) => {
        const px = prev.playerX ?? 0;
        const pz = prev.playerZ ?? 10;
        const cx = prev.carX ?? 12;
        const cz = prev.carZ ?? -10;
        if (
          Math.abs(px - player.x) < 0.1 &&
          Math.abs(pz - player.z) < 0.1 &&
          Math.abs(cx - car.x) < 0.1 &&
          Math.abs(cz - car.z) < 0.1
        ) {
          return prev;
        }
        return {
          ...prev,
          playerX: player.x,
          playerZ: player.z,
          carX: car.x,
          carZ: car.z,
          isDriving: isDrivingRef.current
        };
      });

      // ─── CAMERA PERSPECTIVE MATRIX TRANSITIONS ─────────────────────────────
      if (viewModeRef.current === "fps") {
        // First person look from player height Y
        camera.position.set(player.x, player.y + player.height - 0.2, player.z);
        
        // Target in front based on Yaw/Pitch angles
        const lookTarget = new THREE.Vector3(
          player.x + Math.sin(player.yaw) * Math.cos(player.pitch),
          player.y + player.height - 0.2 + Math.sin(player.pitch),
          player.z + Math.cos(player.yaw) * Math.cos(player.pitch)
        );
        camera.lookAt(lookTarget);
      } else {
        // Third person cinematic chase behind vehicle
        const distance = 8.5;
        const height = 3.5;
        
        // Let player.yaw and player.pitch act as dynamic orbit offsets around the car!
        const cameraYaw = car.angle + player.yaw;
        const cameraPitch = player.pitch; // tilt up/down
        
        // Calculate camera position orbiting the car
        const hDist = distance * Math.cos(cameraPitch);
        const vDist = height + distance * Math.sin(cameraPitch);
        
        const targetCamX = car.x - Math.sin(cameraYaw) * hDist;
        const targetCamY = car.y + vDist;
        const targetCamZ = car.z - Math.cos(cameraYaw) * hDist;

        // Auto-center camera back behind the car slowly if there's no active look joystick input or mouse dragging
        if (lookStickValue.current.x === 0 && lookStickValue.current.y === 0 && !isDragging) {
          player.yaw += (0 - player.yaw) * 2.2 * dt;
          player.pitch += (0 - player.pitch) * 2.2 * dt;
        }

        // Smooth camera lag/dampening
        camera.position.x += (targetCamX - camera.position.x) * 6 * dt;
        camera.position.y += (targetCamY - camera.position.y) * 6 * dt;
        camera.position.z += (targetCamZ - camera.position.z) * 6 * dt;

        // Always point camera slightly ahead of the car front
        const lookTarget = new THREE.Vector3(car.x, car.y + 0.8, car.z);
        camera.lookAt(lookTarget);
      }

      // Render the frame
      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(gameLoop);
    };

    animFrameId = requestAnimationFrame(gameLoop);

    // Clean up event listeners and Three.js canvas on unmount
    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("pointerlockchange", handlePointerLockChange);
      window.removeEventListener("click", startAudioContext);
      
      if (containerRef.current && renderer.domElement) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current.removeChild(renderer.domElement);
      }

      // Close Audio Context
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [environment]);

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* 3D Canvas element target */}
      <div id="game-canvas-3d" ref={containerRef} className="w-full h-full" />

      {/* ==================== MOBILE/TOUCH INPUT OVERLAY ==================== */}
      {/* Left Movement Joystick */}
      <div 
        className="absolute bottom-6 left-6 z-30 pointer-events-auto flex flex-col items-center select-none"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div 
          ref={moveJoystickBaseRef}
          className="relative w-28 h-28 rounded-full border-2 border-[#1240d6]/50 bg-black/80 shadow-[0_0_15px_rgba(18,64,214,0.3)] flex items-center justify-center cursor-grab active:cursor-grabbing"
          onPointerDown={handleMoveJoystickStart}
          style={{ touchAction: "none" }}
        >
          {/* Futuristic grid inside the joystick base */}
          <div className="absolute inset-2 rounded-full border border-[rgba(18,64,214,0.15)] bg-[radial-gradient(ellipse_at_center,rgba(18,64,214,0.1)_0%,rgba(0,0,0,0)_70%)]" />
          <div className="absolute w-full h-[1px] bg-[rgba(18,64,214,0.2)]" />
          <div className="absolute h-full w-[1px] bg-[rgba(18,64,214,0.2)]" />
          
          {/* Inner bounds indicator */}
          <div className="absolute w-14 h-14 rounded-full border border-dashed border-[#1240d6]/30" />

          {/* Joystick handle/knob */}
          <div 
            className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-[#1240d6] shadow-[0_0_10px_rgba(18,64,214,0.4)] flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${moveJoystickKnob.x}px, ${moveJoystickKnob.y}px)`
            }}
          >
            {/* Center core dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#1240d6] animate-pulse" />
          </div>
        </div>
        <div className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest mt-1.5 uppercase">MOVE CONTROLLER</div>
      </div>

      {/* Right Look / Aim Joystick */}
      <div 
        className="absolute bottom-6 right-6 z-30 pointer-events-auto flex flex-col items-center select-none"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div 
          ref={lookJoystickBaseRef}
          className="relative w-28 h-28 rounded-full border-2 border-[#7effc0]/50 bg-black/80 shadow-[0_0_15px_rgba(126,255,192,0.2)] flex items-center justify-center cursor-grab active:cursor-grabbing"
          onPointerDown={handleLookJoystickStart}
          style={{ touchAction: "none" }}
        >
          {/* Futuristic grid inside the joystick base */}
          <div className="absolute inset-2 rounded-full border border-[rgba(126,255,192,0.15)] bg-[radial-gradient(ellipse_at_center,rgba(126,255,192,0.1)_0%,rgba(0,0,0,0)_70%)]" />
          <div className="absolute w-full h-[1px] bg-[rgba(126,255,192,0.2)]" />
          <div className="absolute h-full w-[1px] bg-[rgba(126,255,192,0.2)]" />
          
          {/* Inner bounds indicator */}
          <div className="absolute w-14 h-14 rounded-full border border-dashed border-[#7effc0]/30" />

          {/* Joystick handle/knob */}
          <div 
            className="absolute w-11 h-11 rounded-full bg-gradient-to-br from-[#1e293b] to-[#0f172a] border-2 border-[#7effc0] shadow-[0_0_10px_rgba(126,255,192,0.4)] flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `translate(${lookJoystickKnob.x}px, ${lookJoystickKnob.y}px)`
            }}
          >
            {/* Center core dot */}
            <div className="w-2.5 h-2.5 rounded-full bg-[#7effc0] animate-pulse" />
          </div>
        </div>
        <div className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest mt-1.5 uppercase">AIM / LOOK ROTATION</div>
      </div>

      {/* Floating Action Buttons (Guns, Jump, Interaction, reload) */}
      <div className="absolute bottom-6 right-36 z-30 pointer-events-auto flex flex-col gap-3 select-none items-end">
        {/* On-Foot actions (Jump, Reload, Fire) */}
        {!stats.isDriving && (
          <div className="flex gap-2.5 items-end">
            {/* Reload Gun (R) */}
            <button
              onClick={() => performReload()}
              className="w-11 h-11 rounded-full bg-[#06070a]/90 border border-[#7effc0]/40 text-[#7effc0] flex items-center justify-center active:bg-[#7effc0]/20 active:scale-95 shadow-[0_0_8px_rgba(126,255,192,0.15)] transition-all cursor-pointer"
              title="Reload Weapon (R)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Jump (Space) */}
            <button
              onPointerDown={() => { keysPressed.current[" "] = true; }}
              onPointerUp={() => { keysPressed.current[" "] = false; }}
              onPointerCancel={() => { keysPressed.current[" "] = false; }}
              className="w-12 h-12 rounded-full bg-[#06070a]/90 border border-[#1240d6]/40 text-[#1240d6] flex items-center justify-center active:bg-[#1240d6]/20 active:scale-95 shadow-[0_0_8px_rgba(18,64,214,0.15)] transition-all cursor-pointer"
              title="Jump (SPACE)"
            >
              <ArrowUp className="w-6 h-6" />
            </button>

            {/* Fire Weapon Big Trigger Button */}
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                fireWeapon();
              }}
              className="w-16 h-16 rounded-full bg-[#cc1a2e]/10 border-2 border-[#cc1a2e] text-[#cc1a2e] flex items-center justify-center active:bg-[#cc1a2e]/30 active:scale-90 shadow-[0_0_20px_rgba(204,26,46,0.35)] transition-all cursor-pointer animate-pulse"
              title="Fire Laser Weapon"
            >
              <Crosshair className="w-8 h-8 animate-spin-slow" />
            </button>
          </div>
        )}
      </div>

      {/* Floating Centered Tactical Console Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex gap-3 select-none">
        {/* Enter/Exit Vehicle Button (F) */}
        <button
          onClick={() => toggleVehicleMode()}
          className={`px-4 py-2.5 rounded-sm font-['Share_Tech_Mono'] text-xs uppercase tracking-widest flex items-center gap-2 border shadow-lg transition-all cursor-pointer ${
            stats.isDriving 
              ? "bg-[#cc1a2e]/20 border-[#cc1a2e] text-[#ff4d5e] hover:bg-[#cc1a2e]/30" 
              : "bg-[#06070a]/95 border-[#1240d6] text-[#7effc0] hover:bg-[#1240d6]/20"
          }`}
        >
          <Car className="w-4 h-4" />
          {stats.isDriving ? "EXIT VEHICLE" : "ENTER VEHICLE (F)"}
        </button>

        {/* Change Camera Perspective (V) */}
        <button
          onClick={() => setViewMode((v) => (v === "fps" ? "third" : "fps"))}
          className="px-4 py-2.5 rounded-sm font-['Share_Tech_Mono'] text-xs uppercase tracking-widest flex items-center gap-2 bg-[#06070a]/95 border border-[rgba(18,64,214,0.5)] text-white hover:bg-[rgba(18,64,214,0.15)] shadow-lg transition-all cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          CAM {viewMode === "fps" ? "3RD" : "FPS"}
        </button>
      </div>

      {/* Floating Tactical Prompt Layer */}
      {activePrompt && (
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-[#06070a]/90 border border-[#7effc0] text-[#7effc0] font-['Share_Tech_Mono'] text-xs uppercase tracking-[0.3em] px-6 py-2.5 rounded-sm animate-pulse shadow-[0_0_15px_rgba(126,255,192,0.4)]">
            {activePrompt}
          </div>
        </div>
      )}



      {/* Driving Dashboard Dial Overlay if Driving */}
      {stats.isDriving && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-30 bg-[#06070a]/95 border border-[#1240d6] px-6 py-4 rounded-sm font-['Share_Tech_Mono'] w-72 flex flex-col gap-2.5 pointer-events-auto">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-[#4a6080] tracking-widest">CAR DIAGNOSTICS</span>
            <span className="text-[10px] text-[#7effc0] animate-pulse">● ENG_CONNECTED</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="border border-[rgba(18,64,214,0.2)] py-2">
              <div className="text-xl font-bold text-white leading-none">{stats.speed}</div>
              <div className="text-[8px] text-[#4a6080] mt-1">KM/H</div>
            </div>
            <div className="border border-[rgba(18,64,214,0.2)] py-2">
              <div className="text-xl font-bold text-[#7effc0] leading-none">{stats.gear}</div>
              <div className="text-[8px] text-[#4a6080] mt-1">GEAR</div>
            </div>
            <div className="border border-[rgba(18,64,214,0.2)] py-2">
              <div className="text-xl font-bold text-[#ffd07e] leading-none">{stats.carFuel}%</div>
              <div className="text-[8px] text-[#4a6080] mt-1">FUEL</div>
            </div>
          </div>

          {/* Steer control & horn panel */}
          <div className="flex justify-between gap-2.5 mt-2.5">
            <button
              onClick={() => {
                setCarSirens(!carSirens);
                setActivePrompt(carSirens ? "SIRENS: OFF" : "SIRENS: ACTIVE");
                setTimeout(() => setActivePrompt(null), 1000);
              }}
              className={`flex-1 py-1.5 text-[9px] font-bold tracking-widest uppercase transition-all border ${
                carSirens 
                  ? "bg-[#cc1a2e]/30 border-[#cc1a2e] text-[#ff4d5e] animate-pulse" 
                  : "bg-transparent border-[rgba(18,64,214,0.3)] text-[#4a6080] hover:text-white"
              }`}
            >
              SIRENS
            </button>
            <button
              onMouseDown={() => { setCarHorn(true); playSynthSound("hit"); }}
              onMouseUp={() => setCarHorn(false)}
              className={`flex-1 py-1.5 text-[9px] font-bold tracking-widest uppercase transition-all border ${
                carHorn 
                  ? "bg-[#7effc0]/30 border-[#7effc0] text-[#7effc0]" 
                  : "bg-transparent border-[rgba(18,64,214,0.3)] text-[#4a6080] hover:text-white"
              }`}
            >
              HORN (H)
            </button>
          </div>
        </div>
      )}

      {/* High-tech FPS Neon Crosshair */}
      {viewMode === "fps" && !stats.isDriving && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex items-center justify-center">
          {/* Subtle Outer ring */}
          <div className="absolute w-8 h-8 rounded-full border border-[#7effc0]/20 animate-pulse" />
          
          {/* Crosshair lines */}
          <div className="absolute w-4.5 h-[1.5px] bg-[#7effc0]/80" style={{ transform: 'translateX(-7px)' }} />
          <div className="absolute w-4.5 h-[1.5px] bg-[#7effc0]/80" style={{ transform: 'translateX(7px)' }} />
          <div className="absolute w-[1.5px] h-4.5 bg-[#7effc0]/80" style={{ transform: 'translateY(-7px)' }} />
          <div className="absolute w-[1.5px] h-4.5 bg-[#7effc0]/80" style={{ transform: 'translateY(7px)' }} />

          {/* Center pinpoint */}
          <div className="w-1.5 h-1.5 rounded-full bg-[#7effc0] shadow-[0_0_6px_#7effc0]" />
        </div>
      )}

      {/* FPS Look Unlocked Warning Layer */}
      {viewMode === "fps" && !stats.isDriving && !pointerLocked && (
        <div className="absolute top-[22%] left-1/2 -translate-x-1/2 z-30 pointer-events-none text-center bg-[#06070a]/95 border border-[#1240d6]/50 p-4 rounded shadow-[0_0_20px_rgba(18,64,214,0.3)] max-w-xs select-none">
          <div className="text-[#7effc0] font-['Share_Tech_Mono'] text-xs tracking-[0.2em] uppercase mb-1.5 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#cc1a2e] animate-ping" />
            MOUSE LOOK UNLOCKED
          </div>
          <div className="text-[#b8cce0] text-[10px] leading-relaxed font-sans opacity-95 mb-2">
            Click anywhere on the screen to lock your cursor for continuous, fluid FPS mouse looking.
          </div>
          <div className="text-[8.5px] text-[#4a6080] font-mono tracking-widest uppercase">
            [ CLICK TO LOCK MOUSE ]
          </div>
        </div>
      )}
    </div>
  );
}
