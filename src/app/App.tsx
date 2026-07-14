import { useState, useEffect, useRef } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import GameWorld from "./components/GameWorld";

type Screen = "landing" | "menu" | "settings" | "controls" | "hud" | "gameover";

// ─── Shared UI primitives ────────────────────────────────────────────────────

function CornerBracket({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M0 16V0h16" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-50"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)",
      }}
    />
  );
}

function GridBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(18,64,214,0.06) 1px, transparent 1px),
          linear-gradient(90deg, rgba(18,64,214,0.06) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
      }}
    />
  );
}

function Noise() {
  return (
    <div
      className="pointer-events-none absolute inset-0 opacity-30"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E")`,
        backgroundSize: "180px 180px",
      }}
    />
  );
}

function StatusBar({ label, value, color = "#1240d6" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-[10px] tracking-widest uppercase font-['Share_Tech_Mono'] text-[#4a6080]">{label}</span>
      <span className="text-[10px] font-['Share_Tech_Mono']" style={{ color }}>{value}</span>
    </div>
  );
}

function TacticalButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}) {
  const base =
    "relative font-['Rajdhani'] font-semibold tracking-widest uppercase transition-all duration-150 select-none border focus:outline-none";

  const variants = {
    primary:
      "bg-[#1240d6] border-[#1a52ff] text-white hover:bg-[#1a52ff] hover:shadow-[0_0_24px_rgba(18,64,214,0.6)] active:bg-[#0d32b0]",
    secondary:
      "bg-transparent border-[#0b3d22] text-[#7effc0] hover:bg-[#0b3d22]/50 hover:shadow-[0_0_16px_rgba(11,61,34,0.5)] active:bg-[#0b3d22]",
    danger:
      "bg-transparent border-[#cc1a2e] text-[#ff4d5e] hover:bg-[#cc1a2e]/20 hover:shadow-[0_0_16px_rgba(204,26,46,0.4)]",
    ghost:
      "bg-transparent border-[rgba(18,64,214,0.2)] text-[#4a6080] hover:border-[#1240d6] hover:text-[#b8cce0]",
  };

  const sizes = {
    sm: "px-4 py-1.5 text-xs",
    md: "px-6 py-2.5 text-sm",
    lg: "px-10 py-4 text-base",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[rgba(18,64,214,0.4)]" />
      {label && (
        <span className="text-[9px] tracking-[0.3em] uppercase font-['Share_Tech_Mono'] text-[#4a6080]">{label}</span>
      )}
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[rgba(18,64,214,0.4)]" />
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [tick, setTick] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 300);
    const i = setInterval(() => setTick((n) => n + 1), 500);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#06070a]">
      <GridBackground />
      <Noise />
      <ScanlineOverlay />

      {/* Radial blue glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 60%, rgba(18,64,214,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-8 py-4 border-b border-[rgba(18,64,214,0.2)]">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#7effc0] rounded-full animate-pulse" />
          <span className="font-['Share_Tech_Mono'] text-[10px] text-[#4a6080] tracking-widest">SYS::VANTA-OPS</span>
        </div>
        <div className="flex gap-6">
          <StatusBar label="BUILD" value="v4.7.2" />
          <StatusBar label="STATUS" value="ONLINE" color="#7effc0" />
          <StatusBar label="REGION" value="EU-WEST-1" />
        </div>
      </div>

      {/* Main logo block */}
      <div
        className="relative z-10 flex flex-col items-center gap-0 text-center"
        style={{
          opacity: loaded ? 1 : 0,
          transform: loaded ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#1240d6]" />
          <span className="font-['Share_Tech_Mono'] text-[10px] tracking-[0.5em] text-[#1240d6] uppercase">
            Phthalo Interactive
          </span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#1240d6]" />
        </div>

        <h1
          className="font-['Rajdhani'] font-bold text-[clamp(4rem,12vw,9rem)] leading-none tracking-[0.06em] uppercase"
          style={{
            color: "#e8f0ff",
            textShadow: "0 0 80px rgba(18,64,214,0.7), 0 0 160px rgba(18,64,214,0.3)",
          }}
        >
          VANTA
        </h1>

        <h2
          className="font-['Rajdhani'] font-light text-[clamp(1.2rem,4vw,2.8rem)] tracking-[0.5em] uppercase mt-2"
          style={{ color: "#7effc0", textShadow: "0 0 30px rgba(126,255,192,0.5)" }}
        >
          PROTOCOL
        </h2>

        <div className="mt-8 flex flex-col items-center gap-1">
          <div className="flex gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="w-1 h-1"
                style={{
                  background: i <= (tick % 9) ? "#1240d6" : "rgba(18,64,214,0.15)",
                  transition: "background 0.1s",
                }}
              />
            ))}
          </div>
          <span className="font-['Share_Tech_Mono'] text-[9px] text-[#4a6080] tracking-widest mt-2">
            LOADING ASSETS... {Math.min(100, (tick % 20) * 6)}%
          </span>
        </div>
      </div>

      {/* CTA */}
      <div
        className="absolute bottom-24 flex flex-col items-center gap-6 z-10"
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 1.2s ease 0.4s",
        }}
      >
        <TacticalButton onClick={onEnter} size="lg" variant="primary">
          INITIALIZE SESSION
        </TacticalButton>
        <span
          className="font-['Share_Tech_Mono'] text-[10px] tracking-[0.3em] text-[#4a6080]"
          style={{ opacity: tick % 2 === 0 ? 1 : 0.3, transition: "opacity 0.3s" }}
        >
          PRESS ENTER OR CLICK TO CONTINUE
        </span>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-8 py-3 border-t border-[rgba(18,64,214,0.2)]">
        <span className="font-['Share_Tech_Mono'] text-[9px] text-[#4a6080] tracking-widest">
          © 2074 PHTHALO INTERACTIVE. ALL RIGHTS RESERVED.
        </span>
        <div className="flex gap-4">
          <span className="font-['Share_Tech_Mono'] text-[9px] text-[#4a6080]">RATING: M</span>
          <span className="font-['Share_Tech_Mono'] text-[9px] text-[#4a6080]">ESRB</span>
        </div>
      </div>
    </div>
  );
}

function StartMenu({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const items = [
    { label: "DEPLOY", sub: "Start New Campaign", screen: "hud" as Screen, key: "F1" },
    { label: "SETTINGS", sub: "Configure System", screen: "settings" as Screen, key: "F2" },
    { label: "CONTROLS", sub: "Key Bindings", screen: "controls" as Screen, key: "F3" },
    { label: "GAME OVER", sub: "Preview Screen", screen: "gameover" as Screen, key: "F4" },
    { label: "LANDING", sub: "Return to Launch", screen: "landing" as Screen, key: "ESC" },
  ];

  return (
    <div className="relative w-full h-full flex overflow-hidden bg-[#06070a]">
      <GridBackground />
      <Noise />
      <ScanlineOverlay />

      {/* Left accent */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-[#1240d6] to-transparent" />

      {/* Left panel */}
      <div className="relative z-10 flex flex-col justify-between w-[420px] min-w-[300px] border-r border-[rgba(18,64,214,0.2)] p-10">
        <div>
          <div className="mb-2 font-['Share_Tech_Mono'] text-[9px] text-[#4a6080] tracking-[0.4em] uppercase">
            MAIN INTERFACE
          </div>
          <h1 className="font-['Rajdhani'] font-bold text-5xl text-white tracking-wider uppercase leading-none">
            VANTA
          </h1>
          <h2 className="font-['Rajdhani'] font-light text-xl text-[#7effc0] tracking-[0.4em] uppercase mt-1">
            PROTOCOL
          </h2>

          <Divider />

          <nav className="flex flex-col gap-1 mt-6">
            {items.map((item, i) => (
              <button
                key={item.label}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onNavigate(item.screen)}
                className="group relative flex items-center gap-4 px-4 py-3 text-left cursor-pointer transition-all duration-150 border border-transparent hover:border-[rgba(18,64,214,0.4)] hover:bg-[rgba(18,64,214,0.08)]"
                style={{ outline: "none" }}
              >
                <span
                  className="font-['Share_Tech_Mono'] text-[10px] w-8 text-right transition-colors duration-150"
                  style={{ color: hovered === i ? "#1240d6" : "#2a3a50" }}
                >
                  {item.key}
                </span>
                <div className="flex flex-col">
                  <span
                    className="font-['Rajdhani'] font-bold text-lg tracking-widest uppercase transition-colors duration-150"
                    style={{ color: hovered === i ? "#ffffff" : "#b8cce0" }}
                  >
                    {item.label}
                  </span>
                  <span className="font-['Exo_2'] text-[11px] text-[#4a6080] tracking-wide">{item.sub}</span>
                </div>
                <div
                  className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#1240d6] transition-all duration-150"
                  style={{ opacity: hovered === i ? 1 : 0 }}
                />
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-2">
          <Divider />
          <StatusBar label="PLAYER" value="GHOST-7" color="#7effc0" />
          <StatusBar label="RANK" value="COLONEL III" />
          <StatusBar label="K/D" value="4.2" color="#b8cce0" />
          <StatusBar label="HOURS" value="1,847" />
        </div>
      </div>

      {/* Right panel — atmospheric art */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(18,64,214,0.12) 0%, rgba(11,61,34,0.08) 50%, transparent 80%)",
          }}
        />

        {/* Tactical reticle */}
        <svg width="340" height="340" viewBox="0 0 340 340" className="opacity-20">
          <circle cx="170" cy="170" r="120" stroke="#1240d6" strokeWidth="0.5" fill="none" />
          <circle cx="170" cy="170" r="80" stroke="#1240d6" strokeWidth="0.5" fill="none" strokeDasharray="4 8" />
          <circle cx="170" cy="170" r="40" stroke="#7effc0" strokeWidth="0.5" fill="none" />
          <line x1="170" y1="0" x2="170" y2="100" stroke="#1240d6" strokeWidth="0.5" />
          <line x1="170" y1="240" x2="170" y2="340" stroke="#1240d6" strokeWidth="0.5" />
          <line x1="0" y1="170" x2="100" y2="170" stroke="#1240d6" strokeWidth="0.5" />
          <line x1="240" y1="170" x2="340" y2="170" stroke="#1240d6" strokeWidth="0.5" />
          <rect x="160" y="160" width="20" height="20" stroke="#7effc0" strokeWidth="0.5" fill="none" />
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const x = 170 + 130 * Math.sin(angle);
            const y = 170 - 130 * Math.cos(angle);
            return <circle key={i} cx={x} cy={y} r="1.5" fill="#1240d6" />;
          })}
        </svg>

        {/* Hex grid overlay */}
        <div className="absolute bottom-10 left-10 right-10 grid grid-cols-8 gap-1 opacity-10">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="h-4 border border-[#1240d6]"
              style={{ opacity: Math.random() > 0.6 ? 0.6 : 0.1 }}
            />
          ))}
        </div>

        {/* Corner brackets */}
        <CornerBracket className="absolute top-4 left-4 text-[#1240d6] opacity-40" />
        <CornerBracket className="absolute top-4 right-4 text-[#1240d6] opacity-40 rotate-90" />
        <CornerBracket className="absolute bottom-4 left-4 text-[#1240d6] opacity-40 -rotate-90" />
        <CornerBracket className="absolute bottom-4 right-4 text-[#1240d6] opacity-40 rotate-180" />

        <div className="absolute bottom-6 right-8 font-['Share_Tech_Mono'] text-[9px] text-[#2a3a50] tracking-widest">
          VANTA::CORE v4.7.2 // BUILD 2074.07.14
        </div>
      </div>
    </div>
  );
}

function SettingsMenu({
  onBack,
  isFullscreen,
  onToggleFullscreen,
  environment = "cyber",
  onEnvironmentChange,
  invertJoystickX = true,
  onInvertJoystickXChange,
}: {
  onBack: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  environment: "cyber" | "desert" | "volcano" | "arctic";
  onEnvironmentChange: (env: "cyber" | "desert" | "volcano" | "arctic") => void;
  invertJoystickX: boolean;
  onInvertJoystickXChange: (v: boolean) => void;
}) {
  const [tab, setTab] = useState<"graphics" | "audio" | "gameplay">("graphics");
  const [values, setValues] = useState({
    resolution: "2560×1440",
    fov: 90,
    renderScale: 100,
    shadows: "ULTRA",
    motionBlur: false,
    masterVol: 85,
    sfxVol: 70,
    musicVol: 40,
    voiceVol: 90,
    sensitivity: 3.5,
    aimSens: 2.1,
    crosshair: "TACTICAL",
    hud: true,
    hitMarkers: true,
  });

  const set = (k: keyof typeof values, v: unknown) =>
    setValues((prev) => ({ ...prev, [k]: v }));

  const handleExportToHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CYBER FPS ARENA - STANDALONE EXPORT</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@600;700&family=Exo+2:wght@400;600&display=swap');
    body { margin: 0; overflow: hidden; background-color: #04060e; user-select: none; }
  </style>
</head>
<body class="font-['Exo_2'] text-[#b8cce0] bg-[#04060e] relative h-screen w-screen overflow-hidden">
  <div id="startScreen" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#06070a] px-6 text-center">
    <div class="max-w-md border border-[rgba(18,64,214,0.3)] bg-[#0c101e]/85 p-8 rounded-sm shadow-[0_0_50px_rgba(18,64,214,0.15)] relative">
      <div class="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#7effc0]"></div>
      <div class="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#7effc0]"></div>
      <div class="font-['Share_Tech_Mono'] text-xs text-[#1240d6] tracking-[0.4em] uppercase mb-1">STANDALONE EXPORT</div>
      <h1 class="font-['Rajdhani'] font-bold text-4xl text-white tracking-widest uppercase mb-6">CYBER ARENA</h1>
      <p class="text-xs text-[#4a6080] mb-8 leading-relaxed font-['Share_Tech_Mono']">
        Interactive self-contained offline build of the simulator. Drive, aim, shoot red drones, and explore the landscape in standard 3D. Supported on both desktop and mobile devices.
      </p>
      <button id="startButton" class="w-full bg-[#1240d6] border border-[#1a52ff] hover:bg-[#1a52ff] text-white font-['Share_Tech_Mono'] py-3.5 px-6 rounded-sm cursor-pointer uppercase transition-all tracking-[0.2em] text-xs shadow-[0_0_15px_rgba(18,64,214,0.3)]">
        LAUNCH ARENA
      </button>
    </div>
  </div>

  <div id="hud" class="absolute inset-0 z-30 pointer-events-none hidden flex-col justify-between p-6">
    <div class="flex justify-between items-start w-full">
      <div class="flex gap-4">
        <div class="bg-[#06070a]/80 border border-[rgba(18,64,214,0.3)] p-3 rounded-sm flex flex-col min-w-[120px]">
          <span class="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">HEALTH SYS</span>
          <div class="flex items-center gap-2">
            <div class="h-2 w-20 bg-[#1240d6]/20 border border-[rgba(18,64,214,0.4)] overflow-hidden rounded-sm">
              <div id="healthFill" class="h-full bg-[#7effc0]" style="width: 100%;"></div>
            </div>
            <span id="healthVal" class="font-['Share_Tech_Mono'] text-xs text-[#7effc0] font-bold">100%</span>
          </div>
        </div>
        <div class="bg-[#06070a]/80 border border-[rgba(18,64,214,0.3)] p-3 rounded-sm flex flex-col min-w-[100px]">
          <span class="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">SCORE SYS</span>
          <span id="killsVal" class="font-['Share_Tech_Mono'] text-xs text-white font-bold">KILLS: 00</span>
        </div>
      </div>
      <div class="flex flex-col gap-2 pointer-events-auto items-end">
        <div class="flex gap-1 bg-[#06070a]/80 border border-[rgba(18,64,214,0.3)] p-1 rounded-sm">
          <button id="btn-cyber" class="px-2 py-0.5 font-['Share_Tech_Mono'] text-[8px] border border-[#7effc0] text-[#7effc0] bg-[rgba(126,255,192,0.12)] cursor-pointer uppercase rounded-sm">CYBER</button>
          <button id="btn-desert" class="px-2 py-0.5 font-['Share_Tech_Mono'] text-[8px] border border-transparent text-[#4a6080] hover:text-[#b8cce0] cursor-pointer uppercase rounded-sm">DESERT</button>
          <button id="btn-volcano" class="px-2 py-0.5 font-['Share_Tech_Mono'] text-[8px] border border-transparent text-[#4a6080] hover:text-[#b8cce0] cursor-pointer uppercase rounded-sm">VOLCANO</button>
        </div>
        <div class="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-wider">WASD/KEYS TO MOVE | CLICK/TOUCH TO AIM & SHOOT</div>
      </div>
    </div>

    <div class="flex justify-between items-end w-full">
      <div class="bg-[#06070a]/80 border border-[rgba(18,64,214,0.3)] p-3 rounded-sm flex flex-col min-w-[120px]">
        <span class="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">ENGINE SPEED</span>
        <div class="flex items-baseline gap-1">
          <span id="speedVal" class="font-['Share_Tech_Mono'] text-xl text-white font-bold">0</span>
          <span class="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080]">KM/H</span>
        </div>
      </div>
      <div class="bg-[#06070a]/80 border border-[rgba(18,64,214,0.3)] p-3 rounded-sm flex flex-col min-w-[120px] items-end">
        <span class="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest uppercase mb-1">LASER SYS</span>
        <div class="flex items-baseline gap-1">
          <span id="ammoVal" class="font-['Share_Tech_Mono'] text-lg text-white font-bold">30</span>
          <span class="font-['Share_Tech_Mono'] text-[10px] text-[#4a6080]">/ ∞</span>
        </div>
      </div>
    </div>
  </div>

  <div id="joysticksContainer" class="absolute inset-x-0 bottom-10 z-40 hidden justify-between px-10 pointer-events-none">
    <div id="moveJoystick" class="w-24 h-24 rounded-full border border-[rgba(18,64,214,0.35)] bg-[#06070a]/60 backdrop-blur-xs relative flex items-center justify-center pointer-events-auto">
      <div id="moveKnob" class="w-8 h-8 rounded-full border border-[#7effc0] bg-[#1240d6]/30 absolute transition-all duration-75"></div>
    </div>
    <button id="fireButton" class="w-16 h-16 rounded-full border border-[rgba(239,68,68,0.4)] bg-[rgba(239,68,68,0.15)] flex items-center justify-center font-['Share_Tech_Mono'] text-[10px] text-red-400 font-bold uppercase tracking-widest pointer-events-auto cursor-pointer">FIRE</button>
    <div id="aimJoystick" class="w-24 h-24 rounded-full border border-[rgba(18,64,214,0.35)] bg-[#06070a]/60 backdrop-blur-xs relative flex items-center justify-center pointer-events-auto">
      <div id="aimKnob" class="w-8 h-8 rounded-full border border-[#7effc0] bg-[#1240d6]/30 absolute transition-all duration-75"></div>
    </div>
  </div>

  <div id="canvas-container" class="absolute inset-0 z-10"></div>

  <script>
    let scene, camera, renderer;
    let car, drones = [], lasers = [], particles = [];
    let keys = { w: false, a: false, s: false, d: false };
    let speed = 0, steerAngle = 0;
    let kills = 0, health = 100, ammo = 30;
    let lookX = 0, lookY = 0;
    let currentEnv = 'cyber';
    let audioCtx, engineOsc, engineGain;

    const envs = {
      cyber: { sky: 0x04060e, fog: 0x04060e, fogDen: 0.015, grid: 0x1240d6 },
      desert: { sky: 0x1a120b, fog: 0x1a120b, fogDen: 0.02, grid: 0xd97706 },
      volcano: { sky: 0x110202, fog: 0x110202, fogDen: 0.025, grid: 0xdc2626 }
    };

    let isMoveDragging = false, isAimDragging = false;
    let moveJoy = { x: 0, y: 0 }, aimJoy = { x: 0, y: 0 };
    const invertX = ${invertJoystickX ? 'true' : 'false'};

    document.getElementById('startButton').addEventListener('click', () => {
      document.getElementById('startScreen').classList.add('hidden');
      document.getElementById('hud').classList.remove('hidden');
      if (window.innerWidth < 1024) {
        document.getElementById('joysticksContainer').classList.remove('hidden');
      }
      initAudio();
      initGame();
      animate();
    });

    function initAudio() {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        engineOsc = audioCtx.createOscillator();
        engineGain = audioCtx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(30, audioCtx.currentTime);
        engineGain.gain.setValueAtTime(0.01, audioCtx.currentTime);
        engineOsc.connect(engineGain);
        engineGain.connect(audioCtx.destination);
        engineOsc.start();
      } catch(e) {}
    }

    function playLaserSound() {
      if(!audioCtx) return;
      try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch(e) {}
    }

    function playExplosionSound() {
      if(!audioCtx) return;
      try {
        let osc = audioCtx.createOscillator();
        let gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(10, audioCtx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch(e) {}
    }

    function updateEngineSound(s) {
      if (engineOsc && audioCtx) {
        try {
          const freq = 30 + Math.abs(s) * 8;
          engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);
          const vol = 0.005 + (Math.abs(s) / 40) * 0.02;
          engineGain.gain.setTargetAtTime(vol, audioCtx.currentTime, 0.1);
        } catch(e) {}
      }
    }

    function initGame() {
      const container = document.getElementById('canvas-container');
      const w = container.clientWidth, h = container.clientHeight;

      scene = new THREE.Scene();
      const config = envs[currentEnv];
      scene.background = new THREE.Color(config.sky);
      scene.fog = new THREE.FogExp2(config.fog, config.fogDen);

      camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = true;
      container.appendChild(renderer.domElement);

      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);
      const sun = new THREE.DirectionalLight(0xffffff, 1);
      sun.position.set(50, 100, 50);
      scene.add(sun);

      const grid = new THREE.GridHelper(200, 50, config.grid, config.grid);
      grid.position.y = -0.5;
      grid.name = 'grid';
      scene.add(grid);

      car = new THREE.Group();
      
      const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.2 });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      car.add(bodyMesh);

      const cabinGeo = new THREE.BoxGeometry(1.2, 0.6, 2);
      const cabinMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0.9 });
      const cabinMesh = new THREE.Mesh(cabinGeo, cabinMat);
      cabinMesh.position.y = 0.6;
      cabinMesh.position.z = -0.2;
      car.add(cabinMesh);

      const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 12);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      const offsets = [
        { x: -1.1, y: -0.2, z: 1.5 },
        { x: 1.1, y: -0.2, z: 1.5 },
        { x: -1.1, y: -0.2, z: -1.5 },
        { x: 1.1, y: -0.2, z: -1.5 }
      ];
      offsets.forEach(off => {
        const wMesh = new THREE.Mesh(wheelGeo, wheelMat);
        wMesh.rotation.z = Math.PI / 2;
        wMesh.position.set(off.x, off.y, off.z);
        car.add(wMesh);
      });

      scene.add(car);

      createDrones();

      window.addEventListener('keydown', e => {
        if(e.key === 'w' || e.key === 'ArrowUp') keys.w = true;
        if(e.key === 's' || e.key === 'ArrowDown') keys.s = true;
        if(e.key === 'a' || e.key === 'ArrowLeft') keys.a = true;
        if(e.key === 'd' || e.key === 'ArrowRight') keys.d = true;
        if(e.key === ' ') fireLaser();
      });

      window.addEventListener('keyup', e => {
        if(e.key === 'w' || e.key === 'ArrowUp') keys.w = false;
        if(e.key === 's' || e.key === 'ArrowDown') keys.s = false;
        if(e.key === 'a' || e.key === 'ArrowLeft') keys.a = false;
        if(e.key === 'd' || e.key === 'ArrowRight') keys.d = false;
      });

      window.addEventListener('click', e => {
        if (!document.getElementById('startScreen').classList.contains('hidden') || window.innerWidth < 1024) return;
        fireLaser();
      });

      window.addEventListener('mousemove', e => {
        if (window.innerWidth >= 1024) {
          lookX -= e.movementX * 0.003;
          lookY = Math.max(-0.5, Math.min(0.5, lookY - e.movementY * 0.003));
        }
      });

      setupMobileControls();

      document.getElementById('btn-cyber').addEventListener('click', () => switchEnvironment('cyber'));
      document.getElementById('btn-desert').addEventListener('click', () => switchEnvironment('desert'));
      document.getElementById('btn-volcano').addEventListener('click', () => switchEnvironment('volcano'));

      window.addEventListener('resize', onResize);
    }

    function createDrones() {
      drones.forEach(d => scene.remove(d));
      drones = [];

      const droneGeo = new THREE.OctahedronGeometry(1.2, 0);
      const droneMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.1, emissive: 0xef4444, emissiveIntensity: 0.5 });

      for(let i = 0; i < 8; i++) {
        const drone = new THREE.Mesh(droneGeo, droneMat);
        resetDrone(drone);
        scene.add(drone);
        drones.push(drone);
      }
    }

    function resetDrone(d) {
      d.position.set(
        (Math.random() - 0.5) * 120,
        4 + Math.random() * 8,
        (Math.random() - 0.5) * 120
      );
      d.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      d.userData = { bobSpeed: 1 + Math.random() * 2, bobHeight: 0.5 + Math.random(), baseHeight: d.position.y };
    }

    function switchEnvironment(env) {
      if(!envs[env]) return;
      currentEnv = env;
      
      const config = envs[env];
      scene.background = new THREE.Color(config.sky);
      scene.fog.color = new THREE.Color(config.sky);
      scene.fog.density = config.fogDen;

      ['btn-cyber', 'btn-desert', 'btn-volcano'].forEach(id => {
        const btn = document.getElementById(id);
        if (id === 'btn-' + env) {
          btn.className = "px-2 py-0.5 font-['Share_Tech_Mono'] text-[8px] border border-[#7effc0] text-[#7effc0] bg-[rgba(126,255,192,0.12)] cursor-pointer uppercase rounded-sm";
        } else {
          btn.className = "px-2 py-0.5 font-['Share_Tech_Mono'] text-[8px] border border-transparent text-[#4a6080] hover:text-[#b8cce0] cursor-pointer uppercase rounded-sm";
        }
      });

      const oldGrid = scene.getObjectByName('grid');
      if (oldGrid) scene.remove(oldGrid);
      const grid = new THREE.GridHelper(200, 50, config.grid, config.grid);
      grid.position.y = -0.5;
      grid.name = 'grid';
      scene.add(grid);
    }

    function fireLaser() {
      if (ammo <= 0) return;
      ammo--;
      document.getElementById('ammoVal').innerText = ammo;
      setTimeout(() => { ammo = 30; document.getElementById('ammoVal').innerText = ammo; }, 1200);

      playLaserSound();

      const laserGeo = new THREE.CylinderGeometry(0.1, 0.1, 2, 8);
      const laserMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const laser = new THREE.Mesh(laserGeo, laserMat);

      laser.rotation.x = Math.PI / 2;
      laser.rotation.y = car.rotation.y;
      
      laser.position.copy(car.position);
      laser.position.y += 0.4;
      
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion).normalize();
      laser.userData = { dir: dir, age: 0 };
      
      scene.add(laser);
      lasers.push(laser);
    }

    function setupMobileControls() {
      const moveJoystick = document.getElementById('moveJoystick');
      const moveKnob = document.getElementById('moveKnob');
      const aimJoystick = document.getElementById('aimJoystick');
      const aimKnob = document.getElementById('aimKnob');
      const fireButton = document.getElementById('fireButton');

      fireButton.addEventListener('pointerdown', fireLaser);

      moveJoystick.addEventListener('pointerdown', e => { isMoveDragging = true; e.stopPropagation(); });
      window.addEventListener('pointermove', e => {
        if (isMoveDragging) {
          const rect = moveJoystick.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = e.clientX - centerX;
          const dy = e.clientY - centerY;
          const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
          const angle = Math.atan2(dy, dx);
          
          const knX = Math.cos(angle) * dist;
          const knY = Math.sin(angle) * dist;
          moveKnob.style.transform = 'translate(' + knX + 'px, ' + knY + 'px)';

          moveJoy.x = knX / 40;
          moveJoy.y = knY / 40;
        }
      });

      aimJoystick.addEventListener('pointerdown', e => { isAimDragging = true; e.stopPropagation(); });
      window.addEventListener('pointermove', e => {
        if (isAimDragging) {
          const rect = aimJoystick.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = e.clientX - centerX;
          const dy = e.clientY - centerY;
          const dist = Math.min(Math.sqrt(dx*dx + dy*dy), 40);
          const angle = Math.atan2(dy, dx);
          
          const knX = Math.cos(angle) * dist;
          const knY = Math.sin(angle) * dist;
          aimKnob.style.transform = 'translate(' + knX + 'px, ' + knY + 'px)';

          aimJoy.x = knX / 40;
          aimJoy.y = knY / 40;
        }
      });

      window.addEventListener('pointerup', () => {
        if (isMoveDragging) {
          isMoveDragging = false;
          moveKnob.style.transform = 'translate(0px, 0px)';
          moveJoy = { x: 0, y: 0 };
        }
        if (isAimDragging) {
          isAimDragging = false;
          aimKnob.style.transform = 'translate(0px, 0px)';
          aimJoy = { x: 0, y: 0 };
        }
      });
    }

    function onResize() {
      const container = document.getElementById('canvas-container');
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    function spawnExplosionParticles(pos) {
      const count = 15;
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const velocities = [];

      for(let i = 0; i < count; i++) {
        positions.push(pos.x, pos.y, pos.z);
        velocities.push(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.1) * 8,
          (Math.random() - 0.5) * 10
        );
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color: 0xef4444, size: 0.4, transparent: true, opacity: 1 });
      const system = new THREE.Points(geom, mat);
      
      system.userData = { velocities: velocities, age: 0, mat: mat };
      scene.add(system);
      particles.push(system);
    }

    function animate() {
      requestAnimationFrame(animate);

      let fwd = 0, turn = 0;
      if (keys.w) fwd = 1.2;
      if (keys.s) fwd = -0.8;
      if (keys.a) turn = -1;
      if (keys.d) turn = 1;

      if (isMoveDragging) {
        fwd = -moveJoy.y * 1.2;
        const actualX = invertX ? -moveJoy.x : moveJoy.x;
        turn = actualX;
      }

      speed += fwd * 0.15;
      speed *= 0.95;
      steerAngle += (turn * 0.05 - steerAngle) * 0.1;

      car.rotation.y -= steerAngle * (speed * 0.015);
      
      const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(car.quaternion);
      car.position.addScaledVector(forwardDir, speed * 0.1);

      car.position.x = Math.max(-95, Math.min(95, car.position.x));
      car.position.z = Math.max(-95, Math.min(95, car.position.z));

      updateEngineSound(speed);

      if (isAimDragging) {
        const actualAimX = invertX ? -aimJoy.x : aimJoy.x;
        lookX += actualAimX * 0.04;
        lookY = Math.max(-0.5, Math.min(0.5, lookY - aimJoy.y * 0.04));
      }

      const offset = new THREE.Vector3(0, 3.5, -9).applyQuaternion(car.quaternion);
      camera.position.copy(car.position).add(offset);
      
      const targetLookAt = new THREE.Vector3().copy(car.position).add(new THREE.Vector3(0, 1.5, 0));
      camera.lookAt(targetLookAt);

      camera.rotation.y += lookX;
      camera.rotation.x += lookY;

      const time = Date.now() * 0.001;
      drones.forEach(d => {
        d.position.y = d.userData.baseHeight + Math.sin(time * d.userData.bobSpeed) * d.userData.bobHeight;
        d.rotation.y += 0.01;
      });

      for(let i = lasers.length - 1; i >= 0; i--) {
        const l = lasers[i];
        l.position.addScaledVector(l.userData.dir, 2.5);
        l.userData.age++;

        let hit = false;
        for(let j = 0; j < drones.length; j++) {
          const d = drones[j];
          if (l.position.distanceTo(d.position) < 3) {
            spawnExplosionParticles(d.position);
            playExplosionSound();
            resetDrone(d);
            kills++;
            document.getElementById('killsVal').innerText = 'KILLS: ' + (kills < 10 ? '0' + kills : kills);
            hit = true;
            break;
          }
        }

        if (hit || l.userData.age > 80) {
          scene.remove(l);
          lasers.splice(i, 1);
        }
      }

      for(let i = particles.length - 1; i >= 0; i--) {
        const sys = particles[i];
        const posAttr = sys.geometry.attributes.position;
        const v = sys.userData.velocities;
        sys.userData.age++;

        for(let j = 0; j < posAttr.count; j++) {
          posAttr.setX(j, posAttr.getX(j) + v[j*3] * 0.015);
          posAttr.setY(j, posAttr.getY(j) + v[j*3+1] * 0.015);
          posAttr.setZ(j, posAttr.getZ(j) + v[j*3+2] * 0.015);
        }
        posAttr.needsUpdate = true;
        
        sys.userData.mat.opacity = Math.max(0, 1 - sys.userData.age / 40);

        if (sys.userData.age > 40) {
          scene.remove(sys);
          particles.splice(i, 1);
        }
      }

      document.getElementById('speedVal').innerText = Math.round(Math.abs(speed) * 8);

      renderer.render(scene, camera);
    }
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cyberpunk-arena-offline.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = ["graphics", "audio", "gameplay"] as const;

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#06070a]">
      <GridBackground />
      <Noise />
      <ScanlineOverlay />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-10 py-5 border-b border-[rgba(18,64,214,0.25)]">
        <div className="flex items-center gap-6">
          <button
            onClick={onBack}
            className="font-['Share_Tech_Mono'] text-[10px] text-[#4a6080] tracking-widest hover:text-[#b8cce0] transition-colors cursor-pointer"
          >
            ← BACK
          </button>
          <div className="w-px h-4 bg-[rgba(18,64,214,0.3)]" />
          <h1 className="font-['Rajdhani'] font-bold text-2xl tracking-widest uppercase text-white">SETTINGS</h1>
        </div>
        <div className="flex gap-1">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 font-['Rajdhani'] font-semibold text-sm tracking-widest uppercase cursor-pointer border transition-all duration-150 ${
                tab === t
                  ? "bg-[#1240d6] border-[#1a52ff] text-white"
                  : "bg-transparent border-[rgba(18,64,214,0.2)] text-[#4a6080] hover:text-[#b8cce0] hover:border-[rgba(18,64,214,0.5)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-10 py-8" style={{ scrollbarWidth: "none" }}>
        {tab === "graphics" && (
          <div className="grid grid-cols-1 gap-6 max-w-2xl">
            <SettingRow label="RESOLUTION" description="Display output resolution">
              <select
                value={values.resolution}
                onChange={(e) => set("resolution", e.target.value)}
                className="bg-[#0e1320] border border-[rgba(18,64,214,0.3)] text-[#b8cce0] font-['Share_Tech_Mono'] text-xs px-3 py-2 focus:outline-none focus:border-[#1240d6]"
              >
                {["1920×1080", "2560×1440", "3840×2160"].map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="DISPLAY MODE" description="Toggle fullscreen display mode">
              <button
                onClick={onToggleFullscreen}
                className="bg-[#0e1320] border border-[rgba(18,64,214,0.3)] hover:border-[#1240d6] text-[#b8cce0] hover:text-[#7effc0] font-['Share_Tech_Mono'] text-xs px-3 py-2 focus:outline-none cursor-pointer uppercase transition-colors"
              >
                {isFullscreen ? "WINDOWED" : "FULLSCREEN"}
              </button>
            </SettingRow>
            <SettingRow label="FIELD OF VIEW" description={`Current: ${values.fov}°`}>
              <SliderControl value={values.fov} min={60} max={120} onChange={(v) => set("fov", v)} />
            </SettingRow>
            <SettingRow label="RENDER SCALE" description={`${values.renderScale}% — affects GPU load`}>
              <SliderControl value={values.renderScale} min={50} max={200} onChange={(v) => set("renderScale", v)} />
            </SettingRow>
            <SettingRow label="SHADOW QUALITY" description="Defines shadow map resolution">
              <select
                value={values.shadows}
                onChange={(e) => set("shadows", e.target.value)}
                className="bg-[#0e1320] border border-[rgba(18,64,214,0.3)] text-[#b8cce0] font-['Share_Tech_Mono'] text-xs px-3 py-2 focus:outline-none focus:border-[#1240d6]"
              >
                {["OFF", "LOW", "MEDIUM", "HIGH", "ULTRA"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="MOTION BLUR" description="Temporal motion blur effect">
              <ToggleControl value={values.motionBlur} onChange={(v) => set("motionBlur", v)} />
            </SettingRow>
          </div>
        )}

        {tab === "audio" && (
          <div className="grid grid-cols-1 gap-6 max-w-2xl">
            <SettingRow label="MASTER VOLUME" description={`${values.masterVol}%`}>
              <SliderControl value={values.masterVol} min={0} max={100} onChange={(v) => set("masterVol", v)} color="#7effc0" />
            </SettingRow>
            <SettingRow label="SFX VOLUME" description={`${values.sfxVol}%`}>
              <SliderControl value={values.sfxVol} min={0} max={100} onChange={(v) => set("sfxVol", v)} color="#7effc0" />
            </SettingRow>
            <SettingRow label="MUSIC VOLUME" description={`${values.musicVol}%`}>
              <SliderControl value={values.musicVol} min={0} max={100} onChange={(v) => set("musicVol", v)} color="#7effc0" />
            </SettingRow>
            <SettingRow label="VOICE VOLUME" description={`${values.voiceVol}%`}>
              <SliderControl value={values.voiceVol} min={0} max={100} onChange={(v) => set("voiceVol", v)} color="#7effc0" />
            </SettingRow>
          </div>
        )}

        {tab === "gameplay" && (
          <div className="grid grid-cols-1 gap-6 max-w-2xl">
            <SettingRow label="LOOK SENSITIVITY" description={`${values.sensitivity.toFixed(1)} — mouse movement speed`}>
              <SliderControl
                value={values.sensitivity * 20}
                min={2}
                max={100}
                onChange={(v) => set("sensitivity", parseFloat((v / 20).toFixed(1)))}
              />
            </SettingRow>
            <SettingRow label="ADS SENSITIVITY" description={`${values.aimSens.toFixed(1)} — aim-down-sights multiplier`}>
              <SliderControl
                value={values.aimSens * 20}
                min={2}
                max={100}
                onChange={(v) => set("aimSens", parseFloat((v / 20).toFixed(1)))}
              />
            </SettingRow>
            <SettingRow label="CROSSHAIR STYLE" description="Reticle appearance in combat">
              <select
                value={values.crosshair}
                onChange={(e) => set("crosshair", e.target.value)}
                className="bg-[#0e1320] border border-[rgba(18,64,214,0.3)] text-[#b8cce0] font-['Share_Tech_Mono'] text-xs px-3 py-2 focus:outline-none focus:border-[#1240d6]"
              >
                {["TACTICAL", "DOT", "CIRCLE", "CROSS", "NONE"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="LANDSCAPE ARENA" description="Primary simulation terrain and atmosphere">
              <select
                value={environment}
                onChange={(e) => onEnvironmentChange(e.target.value as any)}
                className="bg-[#0e1320] border border-[rgba(18,64,214,0.3)] text-[#7effc0] font-['Share_Tech_Mono'] text-xs px-3 py-2 focus:outline-none focus:border-[#1240d6] uppercase"
              >
                {(["cyber", "desert", "volcano", "arctic"] as const).map((env) => (
                  <option key={env} value={env}>{env}</option>
                ))}
              </select>
            </SettingRow>
            <SettingRow label="HUD DISPLAY" description="Toggle heads-up display elements">
              <ToggleControl value={values.hud} onChange={(v) => set("hud", v)} />
            </SettingRow>
            <SettingRow label="HIT MARKERS" description="Show damage confirmation markers">
              <ToggleControl value={values.hitMarkers} onChange={(v) => set("hitMarkers", v)} />
            </SettingRow>
            <SettingRow label="INVERT JOYSTICK X" description="Invert horizontal X-axis on both virtual joysticks">
              <ToggleControl value={invertJoystickX} onChange={onInvertJoystickXChange} />
            </SettingRow>
            <SettingRow label="OFFLINE STANDALONE EXPORT" description="Download a self-contained single-file HTML version of the simulation">
              <button
                onClick={handleExportToHtml}
                className="bg-[#1240d6] border border-[#1a52ff] hover:bg-[#1a52ff] text-white font-['Share_Tech_Mono'] text-xs px-4 py-2 hover:shadow-[0_0_12px_rgba(26,82,255,0.4)] transition-all cursor-pointer rounded-sm tracking-wider uppercase font-semibold"
              >
                DOWNLOAD HTML
              </button>
            </SettingRow>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between px-10 py-4 border-t border-[rgba(18,64,214,0.2)]">
        <span className="font-['Share_Tech_Mono'] text-[9px] text-[#2a3a50] tracking-widest">
          CHANGES APPLIED ON SESSION RESTART
        </span>
        <div className="flex gap-3">
          <TacticalButton variant="ghost" size="sm">RESET DEFAULTS</TacticalButton>
          <TacticalButton variant="primary" size="sm">APPLY</TacticalButton>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-[rgba(18,64,214,0.1)]">
      <div>
        <div className="font-['Rajdhani'] font-semibold text-sm tracking-widest uppercase text-[#b8cce0]">{label}</div>
        <div className="font-['Share_Tech_Mono'] text-[10px] text-[#4a6080] mt-0.5">{description}</div>
      </div>
      <div className="ml-8">{children}</div>
    </div>
  );
}

function SliderControl({
  value,
  min,
  max,
  onChange,
  color = "#1240d6",
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3 w-48">
      <div className="relative flex-1 h-1 bg-[rgba(18,64,214,0.15)]">
        <div className="absolute inset-y-0 left-0" style={{ width: `${pct}%`, background: color }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer"
        />
      </div>
      <span className="font-['Share_Tech_Mono'] text-[10px] text-[#4a6080] w-8 text-right">{value}</span>
    </div>
  );
}

function ToggleControl({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`relative w-12 h-6 border transition-all duration-200 cursor-pointer ${
        value ? "border-[#1240d6] bg-[rgba(18,64,214,0.2)]" : "border-[rgba(18,64,214,0.2)] bg-transparent"
      }`}
    >
      <span
        className="absolute top-0.5 bottom-0.5 w-4 transition-all duration-200"
        style={{
          left: value ? "calc(100% - 18px)" : "2px",
          background: value ? "#1240d6" : "#2a3a50",
        }}
      />
      <span className="sr-only">{value ? "ON" : "OFF"}</span>
    </button>
  );
}

function ControlsScreen({ onBack }: { onBack: () => void }) {
  const bindings = [
    { action: "Move Forward", key: "W", category: "MOVEMENT" },
    { action: "Move Backward", key: "S", category: "MOVEMENT" },
    { action: "Strafe Left", key: "A", category: "MOVEMENT" },
    { action: "Strafe Right", key: "D", category: "MOVEMENT" },
    { action: "Sprint", key: "SHIFT", category: "MOVEMENT" },
    { action: "Crouch", key: "CTRL", category: "MOVEMENT" },
    { action: "Jump", key: "SPACE", category: "MOVEMENT" },
    { action: "Fire", key: "LMB", category: "COMBAT" },
    { action: "Aim Down Sights", key: "RMB", category: "COMBAT" },
    { action: "Reload", key: "R", category: "COMBAT" },
    { action: "Melee", key: "V", category: "COMBAT" },
    { action: "Grenade", key: "G", category: "COMBAT" },
    { action: "Switch Weapon", key: "Q / SCROLL", category: "COMBAT" },
    { action: "Interact", key: "F", category: "INTERACT" },
    { action: "Use Ability", key: "E", category: "INTERACT" },
    { action: "Scoreboard", key: "TAB", category: "INTERACT" },
    { action: "Map", key: "M", category: "INTERACT" },
    { action: "Comms", key: "T", category: "INTERACT" },
  ];

  const categories = [...new Set(bindings.map((b) => b.category))];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#06070a]">
      <GridBackground />
      <Noise />
      <ScanlineOverlay />

      <div className="relative z-10 flex items-center gap-6 px-10 py-5 border-b border-[rgba(18,64,214,0.25)]">
        <button
          onClick={onBack}
          className="font-['Share_Tech_Mono'] text-[10px] text-[#4a6080] tracking-widest hover:text-[#b8cce0] transition-colors cursor-pointer"
        >
          ← BACK
        </button>
        <div className="w-px h-4 bg-[rgba(18,64,214,0.3)]" />
        <h1 className="font-['Rajdhani'] font-bold text-2xl tracking-widest uppercase text-white">KEY BINDINGS</h1>
        <div className="ml-auto font-['Share_Tech_Mono'] text-[9px] text-[#4a6080] tracking-widest">
          CLICK ANY BINDING TO REASSIGN
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-10 py-8" style={{ scrollbarWidth: "none" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
          {categories.map((cat) => (
            <div key={cat}>
              <div className="font-['Share_Tech_Mono'] text-[9px] text-[#1240d6] tracking-[0.4em] mb-3">{cat}</div>
              <div className="space-y-px">
                {bindings
                  .filter((b) => b.category === cat)
                  .map((b) => (
                    <div
                      key={b.action}
                      className="group flex items-center justify-between px-3 py-2.5 border border-transparent hover:border-[rgba(18,64,214,0.3)] hover:bg-[rgba(18,64,214,0.05)] cursor-pointer transition-all duration-100"
                    >
                      <span className="font-['Exo_2'] text-sm text-[#4a6080] group-hover:text-[#b8cce0] transition-colors">
                        {b.action}
                      </span>
                      <span className="font-['Share_Tech_Mono'] text-[10px] text-[#b8cce0] border border-[rgba(18,64,214,0.3)] px-2 py-0.5 group-hover:border-[#1240d6] group-hover:text-white transition-all">
                        {b.key}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 border border-[rgba(11,61,34,0.4)] bg-[rgba(11,61,34,0.1)] max-w-5xl">
          <div className="font-['Share_Tech_Mono'] text-[9px] text-[#0b8a4f] tracking-widest mb-2">CONTROLLER SUPPORT</div>
          <div className="font-['Exo_2'] text-xs text-[#4a6080]">
            Xbox and DualSense controllers are auto-detected. Vibration and adaptive trigger support enabled by default. Controller bindings configurable in hardware settings.
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between px-10 py-4 border-t border-[rgba(18,64,214,0.2)]">
        <span className="font-['Share_Tech_Mono'] text-[9px] text-[#2a3a50] tracking-widest">
          PROFILE: GHOST-7 // CUSTOM LAYOUT
        </span>
        <div className="flex gap-3">
          <TacticalButton variant="ghost" size="sm">RESET TO DEFAULT</TacticalButton>
          <TacticalButton variant="secondary" size="sm">EXPORT PROFILE</TacticalButton>
        </div>
      </div>
    </div>
  );
}

function HUDDisplay({
  onNavigate,
  isFullscreen,
  onToggleFullscreen,
  environment = "cyber",
  onEnvironmentChange,
  invertJoystickX = true,
  onInvertJoystickXChange,
}: {
  onNavigate: (s: Screen) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  environment: "cyber" | "desert" | "volcano" | "arctic";
  onEnvironmentChange: (env: "cyber" | "desert" | "volcano" | "arctic") => void;
  invertJoystickX: boolean;
  onInvertJoystickXChange: (v: boolean) => void;
}) {
  const [stats, setStats] = useState({
    health: 100,
    armor: 100,
    ammo: 30,
    reserve: 90,
    kills: 0,
    speed: 0,
    gear: "N",
    rpm: 800,
    isDriving: false,
    carFuel: 100,
    activeWeapon: "M4A1 — BLASTER",
    score: 0,
    playerX: 0,
    playerZ: 10,
    carX: 12,
    carZ: -10
  });

  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [time, setTime] = useState(847);
  const [hitFlash, setHitFlash] = useState(false);
  const [killfeed, setKillfeed] = useState([
    { killer: "GHOST-7", victim: "DRONE-ALPHA", weapon: "LASER" },
    { killer: "PHANTOM-3", victim: "WOLF-2", weapon: "SNIPER" },
    { killer: "GHOST-7", victim: "PHANTOM-5", weapon: "KNIFE" },
  ]);

  useEffect(() => {
    const i = setInterval(() => setTime((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(i);
  }, []);

  const lastHealth = useRef(100);
  useEffect(() => {
    if (stats.health < lastHealth.current) {
      setHitFlash(true);
      const t = setTimeout(() => setHitFlash(false), 200);
      lastHealth.current = stats.health;
      return () => clearTimeout(t);
    }
    lastHealth.current = stats.health;
  }, [stats.health]);

  const lastKills = useRef(0);
  useEffect(() => {
    if (stats.kills > lastKills.current) {
      const victims = ["DRONE-SENTINEL", "CORRUPTED-GRID", "SATELLITE-PROBE", "NIGHT-STALKER"];
      const weapons = ["LASER-BLAST", "PLASMA", "ORBITAL-RAIL"];
      const randVictim = victims[Math.floor(Math.random() * victims.length)];
      const randWeapon = weapons[Math.floor(Math.random() * weapons.length)];
      setKillfeed((prev) => [
        { killer: "GHOST-7", victim: randVictim, weapon: randWeapon },
        ...prev.slice(0, 2)
      ]);
      lastKills.current = stats.kills;
    }
  }, [stats.kills]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const takeManualDamage = () => {
    setStats((prev) => {
      const nextHealth = Math.max(0, prev.health - 12);
      if (nextHealth === 0) setTimeout(() => onNavigate("gameover"), 600);
      return {
        ...prev,
        health: nextHealth
      };
    });
  };

  const manualReload = () => {
    if (stats.reserve > 0) {
      const needed = 30 - stats.ammo;
      const take = Math.min(needed, stats.reserve);
      setStats((prev) => ({
        ...prev,
        ammo: prev.ammo + take,
        reserve: prev.reserve - take
      }));
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#06070a] cursor-crosshair">
      {/* ─── ACTUAL IMMERSIVE 3D WORLD CONTAINER ───────────────────────────── */}
      <GameWorld 
        stats={stats} 
        onUpdateStats={setStats} 
        onGameOver={() => onNavigate("gameover")}
        soundEnabled={true}
        environment={environment}
        invertJoystickX={invertJoystickX}
      />

      {/* Hit damage flash overlay */}
      {hitFlash && (
        <div className="absolute inset-0 pointer-events-none z-20" style={{ background: "rgba(204,26,46,0.3)" }} />
      )}

      <ScanlineOverlay />

      {/* Modern Tactical crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
        <svg width="40" height="40" viewBox="0 0 40 40" className="opacity-90">
          <line x1="20" y1="2" x2="20" y2="12" stroke="#7effc0" strokeWidth="1.5" />
          <line x1="20" y1="28" x2="20" y2="38" stroke="#7effc0" strokeWidth="1.5" />
          <line x1="2" y1="20" x2="12" y2="20" stroke="#7effc0" strokeWidth="1.5" />
          <line x1="28" y1="20" x2="38" y2="20" stroke="#7effc0" strokeWidth="1.5" />
          <circle cx="20" cy="20" r="14" stroke="#7effc0" strokeWidth="0.5" fill="none" strokeDasharray="3 6" />
          <rect x="18" y="18" width="4" height="4" stroke="#7effc0" strokeWidth="1" fill="none" />
        </svg>
      </div>

      {/* TOP BAR OVERLAY */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-start justify-between px-6 py-4 pointer-events-none">
        {/* Objective / mission status */}
        <div className="bg-[rgba(6,7,10,0.85)] border border-[rgba(18,64,214,0.3)] px-4 py-3">
          <div className="font-['Share_Tech_Mono'] text-[8px] text-[#1240d6] tracking-[0.3em] mb-1">MISSION DIRECTIVE</div>
          <div className="font-['Rajdhani'] font-semibold text-sm text-[#b8cce0] tracking-wide">
            EXPLORE ARENA SECTOR 7
          </div>
          <div className="font-['Share_Tech_Mono'] text-[8px] text-[#7effc0] mt-1 flex items-center gap-1.5 animate-pulse">
            <span className="w-1.5 h-1.5 bg-[#7effc0] rounded-full" /> DRIVABLE VEHICLE CONNECTED
          </div>
        </div>

        {/* Dynamic Timer + Score */}
        <div className="flex flex-col items-center">
          <div className="font-['Share_Tech_Mono'] text-3xl text-white tracking-widest">{fmt(time)}</div>
          <div className="font-['Share_Tech_Mono'] text-[9px] text-[#4a6080] tracking-widest">TACTICAL SESSION TIME</div>
          <div className="mt-2.5 flex gap-8">
            <div className="text-center">
              <div className="font-['Share_Tech_Mono'] text-lg text-[#7effc0]">{stats.kills}</div>
              <div className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080]">TARGETS ELIMINATED</div>
            </div>
            <div className="text-center">
              <div className="font-['Share_Tech_Mono'] text-lg text-[#1240d6]">{stats.score}</div>
              <div className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080]">SCORE</div>
            </div>
          </div>
        </div>

        {/* Real-time battle log */}
        <div className="flex flex-col gap-1 min-w-[220px]">
          {killfeed.map((kf, i) => (
            <div
              key={i}
              className="bg-[rgba(6,7,10,0.85)] border-l-2 px-3 py-1.5 flex items-center justify-between gap-2"
              style={{ borderColor: kf.killer === "GHOST-7" ? "#7effc0" : "#cc1a2e", opacity: 1 - i * 0.25 }}
            >
              <span
                className="font-['Share_Tech_Mono'] text-[10px] font-bold"
                style={{ color: kf.killer === "GHOST-7" ? "#7effc0" : "#b8cce0" }}
              >
                {kf.killer}
              </span>
              <span className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080]">[{kf.weapon}]</span>
              <span className="font-['Share_Tech_Mono'] text-[10px] text-[#cc1a2e]">{kf.victim}</span>
            </div>
          ))}
        </div>
      </div>

      {/* BOTTOM LEFT — Player Vitals */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
        <div className="flex flex-col gap-2 bg-[rgba(6,7,10,0.9)] border border-[rgba(18,64,214,0.35)] p-4 min-w-[220px]">
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest">TACTICAL BIO-HEALTH</span>
              <span className="font-['Share_Tech_Mono'] text-[8px] font-bold" style={{ color: stats.health > 50 ? "#7effc0" : stats.health > 25 ? "#ffb84d" : "#cc1a2e" }}>
                {stats.health}%
              </span>
            </div>
            <div className="h-2 bg-[rgba(255,255,255,0.05)]">
              <div
                className="h-full transition-all duration-200"
                style={{
                  width: `${stats.health}%`,
                  background: stats.health > 50 ? "#0b8a4f" : stats.health > 25 ? "#c07a00" : "#cc1a2e",
                }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest">BODY REINFORCEMENT ARMR</span>
              <span className="font-['Share_Tech_Mono'] text-[8px] text-[#b8cce0]">{stats.armor}%</span>
            </div>
            <div className="h-2 bg-[rgba(255,255,255,0.05)]">
              <div className="h-full bg-[#1240d6] transition-all duration-300" style={{ width: `${stats.armor}%` }} />
            </div>
          </div>
          <div className="mt-1 flex justify-between items-center">
            <div className="font-['Rajdhani'] font-bold text-2xl text-white tracking-widest">GHOST-7</div>
            <div className="font-['Share_Tech_Mono'] text-[9px] text-[#7effc0]">ONLINE</div>
          </div>
        </div>
      </div>

      {/* BOTTOM RIGHT — Tactical Ammunition */}
      <div className="absolute bottom-6 right-6 z-20 text-right pointer-events-none">
        <div className="bg-[rgba(6,7,10,0.9)] border border-[rgba(18,64,214,0.35)] p-4 min-w-[160px]">
          <div className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest mb-1">AMMUNITION LOG</div>
          <div className="flex items-baseline justify-end gap-2">
            <span className="font-['Rajdhani'] font-bold text-4xl text-white tracking-widest">{String(stats.ammo).padStart(2, "0")}</span>
            <span className="font-['Share_Tech_Mono'] text-sm text-[#4a6080]">/</span>
            <span className="font-['Share_Tech_Mono'] text-lg text-[#4a6080]">{stats.reserve}</span>
          </div>
          <div className="font-['Share_Tech_Mono'] text-[8px] text-[#1240d6] tracking-widest mt-1 uppercase">{stats.activeWeapon}</div>
        </div>
      </div>

      {/* TACTICAL REAL-TIME MAP — Relocated to top right and made expandable */}
      <div className="absolute top-36 right-6 z-30 pointer-events-auto select-none">
        <div 
          onClick={() => setIsMapExpanded(!isMapExpanded)}
          title="Click to Expand/Collapse tactical map"
          className="bg-[rgba(6,7,10,0.95)] border border-[rgba(18,64,214,0.35)] hover:border-[#7effc0] transition-colors p-2 shadow-[0_0_15px_rgba(18,64,214,0.15)] cursor-pointer flex flex-col"
        >
          {(() => {
            const mapSize = isMapExpanded ? 240 : 112;
            const mapScale = (mapSize / 112) * 0.8;
            const mapCenter = mapSize / 2;

            // Coordinates conversion
            const mapHqW = 14 * mapScale;
            const mapHqH = 14 * mapScale;
            const mapHqX = mapCenter + (-12) * mapScale - mapHqW / 2;
            const mapHqY = mapCenter + (-15) * mapScale - mapHqH / 2;

            const mapTwrW = 10 * mapScale;
            const mapTwrH = 10 * mapScale;
            const mapTwrX = mapCenter + 22 * mapScale - mapTwrW / 2;
            const mapTwrY = mapCenter + 22 * mapScale - mapTwrH / 2;

            const mapOceanRight = mapCenter + (-20) * mapScale;

            const mapPx = mapCenter + (stats.playerX ?? 0) * mapScale;
            const mapPy = mapCenter + (stats.playerZ ?? 10) * mapScale;

            const mapCx = mapCenter + (stats.carX ?? 12) * mapScale;
            const mapCy = mapCenter + (stats.carZ ?? -10) * mapScale;

            const mapDrones = [
              { x: 15, z: -15 },
              { x: -22, z: 2 },
              { x: 4, z: -32 },
              { x: 30, z: 10 },
              { x: -5, z: -8 }
            ];

            return (
              <div className="relative" style={{ width: mapSize, height: mapSize }}>
                <svg width={mapSize} height={mapSize} viewBox={`0 0 ${mapSize} ${mapSize}`}>
                  {/* Map Backdrop */}
                  <rect width={mapSize} height={mapSize} fill="rgba(11,61,34,0.12)" />

                  {/* Grid Lines if expanded */}
                  {isMapExpanded && (
                    <>
                      <line x1={0} y1={mapCenter} x2={mapSize} y2={mapCenter} stroke="rgba(18,64,214,0.15)" strokeWidth="0.5" />
                      <line x1={mapCenter} y1={0} x2={mapCenter} y2={mapSize} stroke="rgba(18,64,214,0.15)" strokeWidth="0.5" />
                      <circle cx={mapCenter} cy={mapCenter} r={mapSize * 0.25} stroke="rgba(18,64,214,0.1)" strokeWidth="0.5" fill="none" />
                      <circle cx={mapCenter} cy={mapCenter} r={mapSize * 0.4} stroke="rgba(18,64,214,0.1)" strokeWidth="0.5" fill="none" />
                      
                      {/* Compass markings */}
                      <text x={mapCenter} y={11} fill="rgba(126,255,192,0.6)" fontSize="8" textAnchor="middle" fontWeight="bold">N</text>
                      <text x={mapCenter} y={mapSize - 4} fill="rgba(126,255,192,0.6)" fontSize="8" textAnchor="middle" fontWeight="bold">S</text>
                      <text x={6} y={mapCenter + 3} fill="rgba(126,255,192,0.6)" fontSize="8" textAnchor="left" fontWeight="bold">W</text>
                      <text x={mapSize - 11} y={mapCenter + 3} fill="rgba(126,255,192,0.6)" fontSize="8" textAnchor="right" fontWeight="bold">E</text>
                    </>
                  )}

                  {/* Ocean Sector */}
                  <rect x={0} y={0} width={Math.max(0, mapOceanRight)} height={mapSize} fill="rgba(7,94,138,0.25)" stroke="rgba(7,94,138,0.4)" strokeWidth="0.5" />
                  <text 
                    x={Math.max(0, mapOceanRight) / 2} 
                    y={mapCenter} 
                    fill="rgba(7,94,138,0.6)" 
                    fontSize={isMapExpanded ? 8 : 5} 
                    textAnchor="middle" 
                    transform={`rotate(-90 ${Math.max(0, mapOceanRight) / 2} ${mapCenter})`}
                  >
                    OCEAN
                  </text>

                  {/* HQ Outpost */}
                  <rect x={mapHqX} y={mapHqY} width={mapHqW} height={mapHqH} fill="rgba(18,64,214,0.25)" stroke="rgba(18,64,214,0.7)" strokeWidth="0.5" />
                  <text x={mapHqX + mapHqW/2} y={mapHqY + mapHqH/2 + (isMapExpanded ? 3 : 1.8)} fill="#4a6080" fontSize={isMapExpanded ? 8 : 5} textAnchor="middle">HQ</text>

                  {/* Control Tower */}
                  <rect x={mapTwrX} y={mapTwrY} width={mapTwrW} height={mapTwrH} fill="rgba(18,64,214,0.25)" stroke="rgba(18,64,214,0.7)" strokeWidth="0.5" />
                  <text x={mapTwrX + mapTwrW/2} y={mapTwrY + mapTwrH/2 + (isMapExpanded ? 3 : 1.8)} fill="#4a6080" fontSize={isMapExpanded ? 8 : 5} textAnchor="middle">TWR</text>

                  {/* Threat Drones */}
                  {mapDrones.map((d, idx) => {
                    const dcx = mapCenter + d.x * mapScale;
                    const dcy = mapCenter + d.z * mapScale;
                    return (
                      <circle key={idx} cx={dcx} cy={dcy} r={isMapExpanded ? 4 : 2.5} fill="#cc1a2e" className="animate-pulse" />
                    );
                  })}

                  {/* Car Position Marker */}
                  {!stats.isDriving && (
                    <g>
                      <circle cx={mapCx} cy={mapCy} r={isMapExpanded ? 4.5 : 2.5} fill="#1240d6" />
                      <circle cx={mapCx} cy={mapCy} r={isMapExpanded ? 8 : 5} stroke="#1240d6" strokeWidth="0.5" fill="none" className="animate-ping" />
                      <text x={mapCx} y={mapCy - (isMapExpanded ? 6 : 4)} fill="#1240d6" fontSize={isMapExpanded ? 7 : 4} textAnchor="middle" fontWeight="bold">CAR</text>
                    </g>
                  )}

                  {/* Player / Driver Marker */}
                  <g>
                    <circle cx={stats.isDriving ? mapCx : mapPx} cy={stats.isDriving ? mapCy : mapPy} r={isMapExpanded ? 4.5 : 2.5} fill="#7effc0" />
                    <circle cx={stats.isDriving ? mapCx : mapPx} cy={stats.isDriving ? mapCy : mapPy} r={isMapExpanded ? 8 : 5} stroke="#7effc0" strokeWidth="0.5" fill="none" className="animate-ping" />
                    <text 
                      x={stats.isDriving ? mapCx : mapPx} 
                      y={(stats.isDriving ? mapCy : mapPy) - (isMapExpanded ? 6 : 4)} 
                      fill="#7effc0" 
                      fontSize={isMapExpanded ? 7 : 4} 
                      textAnchor="middle" 
                      fontWeight="bold"
                    >
                      {stats.isDriving ? "DRIVING" : "GHOST-7"}
                    </text>
                  </g>
                </svg>

                {/* Corner Brackets */}
                <CornerBracket className="absolute top-0 left-0 text-[#1240d6] opacity-65 scale-75" />
                <CornerBracket className="absolute top-0 right-0 text-[#1240d6] opacity-65 scale-75 rotate-90" />
                <CornerBracket className="absolute bottom-0 left-0 text-[#1240d6] opacity-65 scale-75 -rotate-90" />
                <CornerBracket className="absolute bottom-0 right-0 text-[#1240d6] opacity-65 scale-75 rotate-180" />
              </div>
            );
          })()}

          <div className="font-['Share_Tech_Mono'] text-[7px] text-[#4a6080] tracking-widest text-center mt-1 uppercase">
            {isMapExpanded ? (
              <>
                SECTOR 7 // X={Math.round(stats.playerX ?? 0)} Z={Math.round(stats.playerZ ?? 10)}
              </>
            ) : (
              "SECTOR 7 // TACTICAL MAP"
            )}
          </div>
        </div>
      </div>

      {/* Action triggers layer */}
      <div className="absolute top-1/2 right-6 -translate-y-1/2 z-30 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={(e) => { e.stopPropagation(); manualReload(); }}
          className="px-3 py-2 font-['Share_Tech_Mono'] text-[10px] bg-[rgba(18,64,214,0.2)] border border-[rgba(18,64,214,0.4)] text-[#b8cce0] hover:bg-[rgba(18,64,214,0.4)] cursor-pointer tracking-widest"
        >
          RELOAD
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onInvertJoystickXChange(!invertJoystickX); }}
          className={`px-3 py-1.5 font-['Share_Tech_Mono'] text-[9px] border text-center cursor-pointer tracking-widest uppercase transition-all ${
            invertJoystickX
              ? "border-[#7effc0] text-[#7effc0] bg-[rgba(126,255,192,0.12)] shadow-[0_0_8px_rgba(126,255,192,0.15)]"
              : "border-[rgba(18,64,214,0.15)] text-[#4a6080] hover:text-[#b8cce0] hover:border-[rgba(18,64,214,0.4)] bg-transparent"
          }`}
        >
          INVERT X: {invertJoystickX ? "ON" : "OFF"}
        </button>
        <div className="flex flex-col gap-1 bg-[rgba(6,7,10,0.85)] border border-[rgba(18,64,214,0.3)] p-2 rounded-sm">
          <div className="font-['Share_Tech_Mono'] text-[7px] text-[#4a6080] tracking-widest uppercase mb-1 text-center">LANDSCAPE</div>
          {(["cyber", "desert", "volcano", "arctic"] as const).map((env) => (
            <button
              key={env}
              onClick={(e) => { e.stopPropagation(); onEnvironmentChange(env); }}
              className={`px-2 py-0.5 font-['Share_Tech_Mono'] text-[8px] border text-center cursor-pointer uppercase transition-all tracking-wider ${
                environment === env
                  ? "border-[#7effc0] text-[#7effc0] bg-[rgba(126,255,192,0.15)]"
                  : "border-[rgba(18,64,214,0.15)] text-[#4a6080] hover:text-[#b8cce0] hover:border-[rgba(18,64,214,0.4)]"
              }`}
            >
              {env}
            </button>
          ))}
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate("menu"); }}
          className="px-3 py-2 font-['Share_Tech_Mono'] text-[10px] bg-transparent border border-[rgba(18,64,214,0.2)] text-[#4a6080] hover:text-[#b8cce0] cursor-pointer tracking-widest"
        >
          MENU
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }}
          className="px-3 py-2 font-['Share_Tech_Mono'] text-[10px] bg-transparent border border-[rgba(18,64,214,0.25)] text-[#7effc0] hover:border-[#7effc0] hover:bg-[rgba(126,255,192,0.1)] cursor-pointer tracking-widest transition-colors uppercase"
        >
          {isFullscreen ? "WINDOW" : "FULLSCREEN"}
        </button>
      </div>
    </div>
  );
}

function GameOverScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  const stats = [
    { label: "KILLS", value: "6", good: true },
    { label: "DEATHS", value: "3", good: false },
    { label: "ASSISTS", value: "11", good: true },
    { label: "ACCURACY", value: "38.2%", good: true },
    { label: "HEADSHOTS", value: "2", good: true },
    { label: "TIME ALIVE", value: "08:47", good: true },
    { label: "DAMAGE DEALT", value: "1,840", good: true },
    { label: "DAMAGE TAKEN", value: "920", good: false },
  ];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden bg-[#06070a]">
      <GridBackground />
      <Noise />
      <ScanlineOverlay />

      {/* Red vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 30%, rgba(204,26,46,0.25) 100%)",
        }}
      />

      {/* Horizontal glitch lines */}
      {visible && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[15, 38, 62, 81].map((pct) => (
            <div
              key={pct}
              className="absolute left-0 right-0 h-px opacity-20"
              style={{ top: `${pct}%`, background: "#cc1a2e", animation: "none" }}
            />
          ))}
        </div>
      )}

      <div
        className="relative z-10 flex flex-col items-center gap-0"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1)" : "scale(1.04)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}
      >
        {/* KIA label */}
        <div className="flex items-center gap-4 mb-6">
          <div className="h-px w-24 bg-[#cc1a2e]" />
          <span className="font-['Share_Tech_Mono'] text-[9px] text-[#cc1a2e] tracking-[0.5em]">
            CASUALTY REPORT
          </span>
          <div className="h-px w-24 bg-[#cc1a2e]" />
        </div>

        <h1
          className="font-['Rajdhani'] font-bold text-[clamp(3rem,10vw,7rem)] uppercase leading-none tracking-[0.05em]"
          style={{ color: "#cc1a2e", textShadow: "0 0 60px rgba(204,26,46,0.7)" }}
        >
          ELIMINATED
        </h1>

        <div className="flex items-center gap-4 mt-3 mb-10">
          <span className="font-['Share_Tech_Mono'] text-sm text-[#4a6080]">OPERATOR:</span>
          <span className="font-['Rajdhani'] font-semibold text-lg text-[#b8cce0] tracking-widest">GHOST-7</span>
          <span className="font-['Share_Tech_Mono'] text-[10px] text-[#2a3a50]">—</span>
          <span className="font-['Share_Tech_Mono'] text-sm text-[#4a6080]">CAUSE:</span>
          <span className="font-['Share_Tech_Mono'] text-sm text-[#cc1a2e]">HOSTILE CONTACT</span>
        </div>

        {/* Stats grid */}
        <div className="border border-[rgba(204,26,46,0.2)] bg-[rgba(6,7,10,0.8)] p-6 mb-10 grid grid-cols-4 gap-x-10 gap-y-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest">{s.label}</span>
              <span
                className="font-['Rajdhani'] font-bold text-2xl tracking-wider"
                style={{ color: s.good ? "#b8cce0" : "#cc1a2e" }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div className="w-full max-w-sm mb-8">
          <div className="flex justify-between mb-2">
            <span className="font-['Share_Tech_Mono'] text-[9px] text-[#4a6080] tracking-widest">XP EARNED</span>
            <span className="font-['Share_Tech_Mono'] text-[9px] text-[#7effc0]">+1,240 XP</span>
          </div>
          <div className="h-1 bg-[rgba(255,255,255,0.05)]">
            <div className="h-full bg-[#0b8a4f] transition-all duration-1000 delay-500" style={{ width: visible ? "67%" : "0%" }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-['Share_Tech_Mono'] text-[8px] text-[#2a3a50]">COLONEL III</span>
            <span className="font-['Share_Tech_Mono'] text-[8px] text-[#2a3a50]">67% TO COLONEL IV</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <TacticalButton onClick={() => onNavigate("hud")} variant="primary" size="md">
            REDEPLOY
          </TacticalButton>
          <TacticalButton onClick={() => onNavigate("menu")} variant="secondary" size="md">
            MAIN MENU
          </TacticalButton>
          <TacticalButton onClick={() => onNavigate("settings")} variant="ghost" size="md">
            DEBRIEF
          </TacticalButton>
        </div>
      </div>
    </div>
  );
}

// ─── Nav overlay ─────────────────────────────────────────────────────────────

function NavDots({
  current,
  onNavigate,
  isFullscreen,
  onToggleFullscreen,
}: {
  current: Screen;
  onNavigate: (s: Screen) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const screens: { key: Screen; label: string }[] = [
    { key: "landing", label: "LAUNCH" },
    { key: "menu", label: "MAIN MENU" },
    { key: "settings", label: "SETTINGS" },
    { key: "controls", label: "CONTROLS" },
    { key: "hud", label: "HUD" },
    { key: "gameover", label: "GAME OVER" },
  ];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 pointer-events-auto items-center">
      {screens.map((s) => (
        <button
          key={s.key}
          onClick={() => onNavigate(s.key)}
          title={s.label}
          className="group flex items-center gap-2 cursor-pointer self-end"
        >
          <span className="hidden group-hover:block font-['Share_Tech_Mono'] text-[8px] text-[#4a6080] tracking-widest whitespace-nowrap">
            {s.label}
          </span>
          <div
            className="w-1.5 h-1.5 transition-all duration-150"
            style={{
              background: current === s.key ? "#7effc0" : "rgba(74,96,128,0.4)",
              boxShadow: current === s.key ? "0 0 8px rgba(126,255,192,0.8)" : "none",
            }}
          />
        </button>
      ))}

      {/* Elegant tactical fullscreen icon toggle */}
      <div className="w-4 h-px bg-[rgba(18,64,214,0.3)] my-2" />
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        className="group p-1 border border-[rgba(18,64,214,0.3)] bg-[rgba(6,7,10,0.6)] text-[#4a6080] hover:text-[#7effc0] hover:border-[#7effc0] transition-all cursor-pointer flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(18,64,214,0.1)] hover:shadow-[0_0_12px_rgba(126,255,192,0.3)]"
        style={{ width: "24px", height: "24px" }}
      >
        {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
      </button>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [environment, setEnvironment] = useState<"cyber" | "desert" | "volcano" | "arctic">("cyber");
  const [invertJoystickX, setInvertJoystickX] = useState<boolean>(true);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#06070a] font-['Exo_2']">
      {screen === "landing" && <LandingPage onEnter={() => setScreen("menu")} />}
      {screen === "menu" && <StartMenu onNavigate={setScreen} />}
      {screen === "settings" && (
        <SettingsMenu
          onBack={() => setScreen("menu")}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          environment={environment}
          onEnvironmentChange={setEnvironment}
          invertJoystickX={invertJoystickX}
          onInvertJoystickXChange={setInvertJoystickX}
        />
      )}
      {screen === "controls" && <ControlsScreen onBack={() => setScreen("menu")} />}
      {screen === "hud" && (
        <HUDDisplay
          onNavigate={setScreen}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          environment={environment}
          onEnvironmentChange={setEnvironment}
          invertJoystickX={invertJoystickX}
          onInvertJoystickXChange={setInvertJoystickX}
        />
      )}
      {screen === "gameover" && <GameOverScreen onNavigate={setScreen} />}

      <NavDots
        current={screen}
        onNavigate={setScreen}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
