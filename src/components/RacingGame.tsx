import { useEffect, useRef, useState, useCallback } from "react";
import Icon from "@/components/ui/icon";

// ===== TYPES =====
type GameScreen = "menu" | "game" | "records" | "gameover";

interface Track {
  id: number;
  name: string;
  difficulty: "ЛЁГКАЯ" | "СРЕДНЯЯ" | "СЛОЖНАЯ" | "ЭКСТРИМ";
  description: string;
  color: string;
  laps: number;
  obstacles: number;
  pathPoints: [number, number][];
}

interface Record {
  trackId: number;
  trackName: string;
  time: number;
  date: string;
}

interface Car {
  x: number;
  y: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  friction: number;
  turnSpeed: number;
  width: number;
  height: number;
  lap: number;
  checkpoints: boolean[];
  lastCheckpoint: number;
}

interface Obstacle {
  x: number;
  y: number;
  type: "cone" | "oil" | "barrier" | "boost";
  active: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

// ===== TRACKS =====
const TRACKS: Track[] = [
  {
    id: 1,
    name: "ГОРОДСКАЯ ПЕТЛЯ",
    difficulty: "ЛЁГКАЯ",
    description: "Ровная трасса без резких поворотов",
    color: "#00ff88",
    laps: 3,
    obstacles: 4,
    pathPoints: [
      [100, 200], [300, 100], [500, 100], [600, 200],
      [600, 400], [500, 480], [300, 480], [100, 400], [100, 200]
    ],
  },
  {
    id: 2,
    name: "ГОРНЫЙ СЕРПАНТИН",
    difficulty: "СРЕДНЯЯ",
    description: "Крутые повороты и нефтяные пятна",
    color: "#ffcc00",
    laps: 3,
    obstacles: 8,
    pathPoints: [
      [100, 300], [200, 100], [350, 80], [500, 150],
      [580, 300], [500, 450], [350, 500], [150, 430], [100, 300]
    ],
  },
  {
    id: 3,
    name: "НОЧНОЙ ДАУНТАУН",
    difficulty: "СЛОЖНАЯ",
    description: "Узкие улицы, множество конусов",
    color: "#ff4466",
    laps: 4,
    obstacles: 14,
    pathPoints: [
      [80, 250], [150, 80], [300, 60], [450, 80],
      [550, 180], [580, 340], [480, 470], [280, 490],
      [120, 430], [60, 330], [80, 250]
    ],
  },
  {
    id: 4,
    name: "ТРАССА «ЭКСТРИМ»",
    difficulty: "ЭКСТРИМ",
    description: "Всё препятствия, высокая скорость",
    color: "#ff6600",
    laps: 5,
    obstacles: 20,
    pathPoints: [
      [100, 280], [140, 100], [280, 60], [420, 100],
      [540, 200], [580, 360], [520, 470], [360, 510],
      [180, 480], [80, 380], [60, 240], [100, 280]
    ],
  },
];

// ===== UTILS =====
function pointOnPath(points: [number, number][], t: number): [number, number] {
  const totalSegments = points.length - 1;
  const segment = Math.floor(t * totalSegments);
  const segT = (t * totalSegments) - segment;
  const p0 = points[Math.min(segment, totalSegments - 1)];
  const p1 = points[Math.min(segment + 1, totalSegments)];
  return [p0[0] + (p1[0] - p0[0]) * segT, p0[1] + (p1[1] - p0[1]) * segT];
}

function distSq(ax: number, ay: number, bx: number, by: number) {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

// ===== MAIN COMPONENT =====
export default function RacingGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);
  const [records, setRecords] = useState<Record[]>(() => {
    try { return JSON.parse(localStorage.getItem("apex_records") || "[]"); } catch { return []; }
  });
  const [finalTime, setFinalTime] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(0);

  const gameStateRef = useRef<{
    car: Car;
    obstacles: Obstacle[];
    particles: Particle[];
    keys: Record<string, boolean>;
    startTime: number;
    running: boolean;
    track: Track;
    oilEffect: number;
    boostEffect: number;
    cameraX: number;
    cameraY: number;
    animId: number;
    scale: number;
  } | null>(null);

  const saveRecord = useCallback((trackId: number, trackName: string, time: number) => {
    setRecords(prev => {
      const existing = prev.find(r => r.trackId === trackId);
      let next = prev;
      const newRecord: Record = {
        trackId, trackName, time,
        date: new Date().toLocaleDateString("ru-RU")
      };
      if (!existing || time < existing.time) {
        next = [...prev.filter(r => r.trackId !== trackId), newRecord];
        localStorage.setItem("apex_records", JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const startGame = useCallback((track: Track) => {
    setSelectedTrack(track);
    setScreen("game");
  }, []);

  useEffect(() => {
    if (screen !== "game") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SCALE = 1.1;
    const W = canvas.width;
    const H = canvas.height;

    // Scale track to canvas
    const rawPoints = selectedTrack.pathPoints;
    const minX = Math.min(...rawPoints.map(p => p[0]));
    const minY = Math.min(...rawPoints.map(p => p[1]));
    const maxX = Math.max(...rawPoints.map(p => p[0]));
    const maxY = Math.max(...rawPoints.map(p => p[1]));
    const scaleX = (W * 0.75) / (maxX - minX);
    const scaleY = (H * 0.75) / (maxY - minY);
    const sc = Math.min(scaleX, scaleY) * SCALE;
    const offX = (W - (maxX - minX) * sc) / 2 - minX * sc;
    const offY = (H - (maxY - minY) * sc) / 2 - minY * sc;

    const scaledPoints: [number, number][] = rawPoints.map(([x, y]) => [
      x * sc + offX, y * sc + offY
    ]);

    const ROAD_W = 70;
    const numCheckpoints = scaledPoints.length - 1;

    // Place obstacles on track
    const obstacles: Obstacle[] = [];
    const obsTypes: Array<"cone" | "oil" | "barrier" | "boost"> = ["cone", "oil", "barrier", "boost"];
    for (let i = 0; i < selectedTrack.obstacles; i++) {
      const t = (i + 0.5) / selectedTrack.obstacles;
      const [ox, oy] = pointOnPath(scaledPoints, t);
      const angle = Math.random() * Math.PI * 2;
      const r = (ROAD_W * 0.25) + Math.random() * (ROAD_W * 0.3);
      const type = i < selectedTrack.obstacles - 2
        ? obsTypes[Math.floor(Math.random() * 3)]
        : "boost";
      obstacles.push({
        x: ox + Math.cos(angle) * r,
        y: oy + Math.sin(angle) * r,
        type,
        active: true
      });
    }

    // Start position
    const startPt = scaledPoints[0];
    const startPt2 = scaledPoints[1];
    const startAngle = Math.atan2(startPt2[1] - startPt[1], startPt2[0] - startPt[0]);

    const car: Car = {
      x: startPt[0],
      y: startPt[1] - 20,
      angle: startAngle,
      speed: 0,
      maxSpeed: 6,
      acceleration: 0.18,
      friction: 0.96,
      turnSpeed: 0.045,
      width: 22,
      height: 36,
      lap: 1,
      checkpoints: new Array(numCheckpoints).fill(false),
      lastCheckpoint: 0,
    };

    const keys: Record<string, boolean> = {};
    const particles: Particle[] = [];

    gameStateRef.current = {
      car, obstacles, particles, keys,
      startTime: Date.now(),
      running: true,
      track: selectedTrack,
      oilEffect: 0,
      boostEffect: 0,
      cameraX: 0, cameraY: 0,
      animId: 0, scale: sc,
    };

    const onKey = (e: KeyboardEvent, down: boolean) => {
      keys[e.key] = down;
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", e => onKey(e, true));
    window.addEventListener("keyup", e => onKey(e, false));

    // Mobile touch
    let touchStartX = 0, touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      keys["ArrowUp"] = dy < -20;
      keys["ArrowDown"] = dy > 20;
      keys["ArrowLeft"] = dx < -20;
      keys["ArrowRight"] = dx > 20;
    };
    const onTouchEnd = () => {
      keys["ArrowUp"] = false; keys["ArrowDown"] = false;
      keys["ArrowLeft"] = false; keys["ArrowRight"] = false;
    };
    canvas.addEventListener("touchstart", onTouchStart);
    canvas.addEventListener("touchmove", onTouchMove);
    canvas.addEventListener("touchend", onTouchEnd);

    // ===== DRAW FUNCTIONS =====
    function drawRoad() {
      // Shadow/glow under road
      ctx!.save();
      ctx!.shadowColor = selectedTrack.color;
      ctx!.shadowBlur = 18;
      ctx!.strokeStyle = "#1a1a2e";
      ctx!.lineWidth = ROAD_W + 10;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.beginPath();
      ctx!.moveTo(scaledPoints[0][0], scaledPoints[0][1]);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx!.lineTo(scaledPoints[i][0], scaledPoints[i][1]);
      }
      ctx!.stroke();
      ctx!.restore();

      // Road surface
      ctx!.strokeStyle = "#222233";
      ctx!.lineWidth = ROAD_W;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.beginPath();
      ctx!.moveTo(scaledPoints[0][0], scaledPoints[0][1]);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx!.lineTo(scaledPoints[i][0], scaledPoints[i][1]);
      }
      ctx!.stroke();

      // Lane lines
      ctx!.setLineDash([18, 14]);
      ctx!.strokeStyle = "rgba(255,255,255,0.12)";
      ctx!.lineWidth = 2;
      ctx!.beginPath();
      ctx!.moveTo(scaledPoints[0][0], scaledPoints[0][1]);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx!.lineTo(scaledPoints[i][0], scaledPoints[i][1]);
      }
      ctx!.stroke();
      ctx!.setLineDash([]);

      // Road edges
      ctx!.strokeStyle = selectedTrack.color + "55";
      ctx!.lineWidth = 3;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(scaledPoints[0][0], scaledPoints[0][1]);
      for (let i = 1; i < scaledPoints.length; i++) {
        ctx!.lineTo(scaledPoints[i][0], scaledPoints[i][1]);
      }
      ctx!.stroke();

      // Start/finish line
      const sx = scaledPoints[0][0], sy = scaledPoints[0][1];
      const sx2 = scaledPoints[1][0], sy2 = scaledPoints[1][1];
      const perpAngle = Math.atan2(sy2 - sy, sx2 - sx) + Math.PI / 2;
      ctx!.save();
      ctx!.translate(sx, sy);
      ctx!.rotate(perpAngle);
      for (let i = -3; i <= 3; i++) {
        ctx!.fillStyle = i % 2 === 0 ? "#fff" : "#000";
        ctx!.fillRect(i * 6 - 3, -ROAD_W / 2, 6, ROAD_W / 2);
        ctx!.fillStyle = i % 2 === 0 ? "#000" : "#fff";
        ctx!.fillRect(i * 6 - 3, 0, 6, ROAD_W / 2);
      }
      ctx!.restore();
    }

    function drawObstacles() {
      obstacles.forEach(obs => {
        if (!obs.active) return;
        ctx!.save();
        ctx!.translate(obs.x, obs.y);
        if (obs.type === "cone") {
          ctx!.beginPath();
          ctx!.moveTo(0, -12);
          ctx!.lineTo(8, 8);
          ctx!.lineTo(-8, 8);
          ctx!.closePath();
          ctx!.fillStyle = "#ff4400";
          ctx!.fill();
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 1;
          ctx!.stroke();
          ctx!.fillStyle = "#fff";
          ctx!.fillRect(-8, 2, 16, 3);
        } else if (obs.type === "oil") {
          ctx!.beginPath();
          ctx!.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(20,20,50,0.85)";
          ctx!.fill();
          ctx!.strokeStyle = "#6644ff";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          ctx!.fillStyle = "rgba(100,80,200,0.4)";
          ctx!.beginPath();
          ctx!.ellipse(-3, -2, 5, 3, 0.3, 0, Math.PI * 2);
          ctx!.fill();
        } else if (obs.type === "barrier") {
          ctx!.fillStyle = "#ff2200";
          ctx!.fillRect(-14, -6, 28, 12);
          ctx!.fillStyle = "#fff";
          ctx!.fillRect(-14, -6, 8, 6);
          ctx!.fillRect(-14 + 16, 0, 8, 6);
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 1;
          ctx!.strokeRect(-14, -6, 28, 12);
        } else if (obs.type === "boost") {
          ctx!.save();
          ctx!.rotate(Date.now() * 0.003);
          ctx!.beginPath();
          for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            const r = i % 2 === 0 ? 12 : 6;
            if (i === 0) ctx!.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx!.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx!.closePath();
          ctx!.fillStyle = "#00ffcc";
          ctx!.fill();
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 1.5;
          ctx!.stroke();
          ctx!.restore();
          ctx!.shadowColor = "#00ffcc";
          ctx!.shadowBlur = 14;
          ctx!.fillStyle = "#00ffcc33";
          ctx!.beginPath();
          ctx!.arc(0, 0, 18, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      });
    }

    function drawCar(c: Car) {
      ctx!.save();
      ctx!.translate(c.x, c.y);
      ctx!.rotate(c.angle + Math.PI / 2);

      const gs = gameStateRef.current!;

      // Tire tracks / particles
      if (Math.abs(c.speed) > 1 && (keys["ArrowLeft"] || keys["ArrowRight"])) {
        if (Math.random() < 0.6) {
          particles.push({
            x: c.x + (Math.random() - 0.5) * c.width,
            y: c.y + (Math.random() - 0.5) * c.height,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            life: 30, maxLife: 30,
            color: "#555566",
            size: 3 + Math.random() * 3
          });
        }
      }

      // Boost particles
      if (gs.boostEffect > 0 && Math.random() < 0.8) {
        particles.push({
          x: c.x,
          y: c.y,
          vx: (Math.random() - 0.5) * 3 - Math.sin(c.angle) * 4,
          vy: (Math.random() - 0.5) * 3 - Math.cos(c.angle) * 4,
          life: 20, maxLife: 20,
          color: "#00ffcc",
          size: 4 + Math.random() * 4
        });
      }

      // Car body glow
      ctx!.shadowColor = gs.boostEffect > 0 ? "#00ffcc" : selectedTrack.color;
      ctx!.shadowBlur = gs.boostEffect > 0 ? 20 : 8;

      // Car body
      ctx!.fillStyle = "#e8e8f0";
      ctx!.beginPath();
      ctx!.roundRect(-c.width / 2, -c.height / 2, c.width, c.height, 4);
      ctx!.fill();

      // Windshield
      ctx!.fillStyle = "#334466";
      ctx!.beginPath();
      ctx!.roundRect(-c.width / 2 + 3, -c.height / 2 + 4, c.width - 6, c.height * 0.35, 3);
      ctx!.fill();

      // Headlights
      ctx!.fillStyle = "#ffffaa";
      ctx!.shadowColor = "#ffff88";
      ctx!.shadowBlur = 10;
      ctx!.fillRect(-c.width / 2 + 2, -c.height / 2, 5, 3);
      ctx!.fillRect(c.width / 2 - 7, -c.height / 2, 5, 3);

      // Rear lights
      ctx!.fillStyle = "#ff2200";
      ctx!.shadowColor = "#ff0000";
      ctx!.shadowBlur = 8;
      ctx!.fillRect(-c.width / 2 + 2, c.height / 2 - 3, 5, 3);
      ctx!.fillRect(c.width / 2 - 7, c.height / 2 - 3, 5, 3);

      // Stripe
      ctx!.fillStyle = selectedTrack.color;
      ctx!.shadowBlur = 0;
      ctx!.fillRect(-2, -c.height / 2, 4, c.height);

      ctx!.restore();
    }

    function drawParticles() {
      particles.forEach((p, i) => {
        const alpha = p.life / p.maxLife;
        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx!.fill();
      });
      ctx!.globalAlpha = 1;
    }

    function drawHUD(c: Car, elapsed: number) {
      const gs = gameStateRef.current!;

      // Top bar bg
      ctx!.fillStyle = "rgba(0,0,0,0.75)";
      ctx!.fillRect(0, 0, W, 56);

      // Lap
      ctx!.fillStyle = selectedTrack.color;
      ctx!.font = "bold 13px 'Roboto Mono', monospace";
      ctx!.fillText("КРУ", 20, 22);
      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 26px 'Oswald', sans-serif";
      ctx!.fillText(`${c.lap} / ${selectedTrack.laps}`, 20, 48);

      // Time
      ctx!.fillStyle = selectedTrack.color;
      ctx!.font = "bold 13px 'Roboto Mono', monospace";
      const timeText = formatTime(elapsed);
      const tw = ctx!.measureText(timeText).width;
      ctx!.fillText("ВРЕМЯ", W / 2 - 30, 22);
      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 26px 'Oswald', sans-serif";
      ctx!.fillText(timeText, W / 2 - 40, 48);

      // Speed
      const speedKmh = Math.round(Math.abs(c.speed) * 30);
      ctx!.fillStyle = selectedTrack.color;
      ctx!.font = "bold 13px 'Roboto Mono', monospace";
      ctx!.fillText("КМ/Ч", W - 90, 22);
      ctx!.fillStyle = "#fff";
      ctx!.font = "bold 26px 'Oswald', sans-serif";
      ctx!.fillText(speedKmh.toString(), W - 90, 48);

      // Speed bar
      const barW = 80;
      const barH = 5;
      ctx!.fillStyle = "#333";
      ctx!.fillRect(W - 94, 52, barW, barH);
      const pct = Math.abs(c.speed) / (c.maxSpeed * (gs.boostEffect > 0 ? 1.5 : 1));
      const barColor = gs.boostEffect > 0 ? "#00ffcc" : selectedTrack.color;
      ctx!.fillStyle = barColor;
      ctx!.fillRect(W - 94, 52, barW * Math.min(pct, 1), barH);

      // Oil effect overlay
      if (gs.oilEffect > 0) {
        ctx!.fillStyle = `rgba(80,40,180,${gs.oilEffect * 0.25})`;
        ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = "#aa88ff";
        ctx!.font = "bold 18px 'Oswald', sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillText("⚠ ЗАНОС!", W / 2, H / 2 + 40);
        ctx!.textAlign = "left";
      }

      // Boost effect
      if (gs.boostEffect > 0) {
        ctx!.fillStyle = `rgba(0,255,200,${gs.boostEffect * 0.12})`;
        ctx!.fillRect(0, 0, W, H);
        ctx!.fillStyle = "#00ffcc";
        ctx!.font = "bold 22px 'Oswald', sans-serif";
        ctx!.textAlign = "center";
        ctx!.fillText("⚡ BOOST!", W / 2, H / 2 + 40);
        ctx!.textAlign = "left";
      }
    }

    function drawBackground() {
      // Dark gradient bg
      const grad = ctx!.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
      grad.addColorStop(0, "#0d0d1a");
      grad.addColorStop(1, "#060610");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, W, H);

      // Grid lines
      ctx!.strokeStyle = "rgba(255,255,255,0.025)";
      ctx!.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx!.beginPath(); ctx!.moveTo(x, 0); ctx!.lineTo(x, H); ctx!.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx!.beginPath(); ctx!.moveTo(0, y); ctx!.lineTo(W, y); ctx!.stroke();
      }
    }

    function checkCheckpoints(c: Car) {
      for (let i = 0; i < numCheckpoints; i++) {
        const t = (i + 0.5) / numCheckpoints;
        const [cpx, cpy] = pointOnPath(scaledPoints, t);
        if (distSq(c.x, c.y, cpx, cpy) < (ROAD_W * 0.8) ** 2) {
          c.checkpoints[i] = true;
        }
      }
      // Check lap completion: near start + all checkpoints passed
      if (distSq(c.x, c.y, scaledPoints[0][0], scaledPoints[0][1]) < (ROAD_W * 0.9) ** 2) {
        if (c.checkpoints.every(Boolean)) {
          c.lap++;
          c.checkpoints = new Array(numCheckpoints).fill(false);
        }
      }
    }

    function isOnRoad(c: Car): boolean {
      for (let i = 0; i < scaledPoints.length - 1; i++) {
        const [ax, ay] = scaledPoints[i];
        const [bx, by] = scaledPoints[i + 1];
        // Closest point on segment
        const dx = bx - ax, dy = by - ay;
        const len2 = dx * dx + dy * dy;
        const t = Math.max(0, Math.min(1, ((c.x - ax) * dx + (c.y - ay) * dy) / len2));
        const closestX = ax + t * dx, closestY = ay + t * dy;
        if (distSq(c.x, c.y, closestX, closestY) < (ROAD_W * 0.48) ** 2) return true;
      }
      return false;
    }

    let lastTime = 0;
    function loop(timestamp: number) {
      if (!gameStateRef.current?.running) return;
      const dt = Math.min((timestamp - lastTime) / 16.67, 3);
      lastTime = timestamp;
      const gs = gameStateRef.current!;
      const c = gs.car;

      ctx!.clearRect(0, 0, W, H);
      drawBackground();
      drawRoad();
      drawObstacles();

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      drawParticles();

      // Car physics
      const onRoad = isOnRoad(c);
      const frictionMod = gs.oilEffect > 0 ? 1.0 : (onRoad ? c.friction : 0.90);
      const accelMod = onRoad ? 1 : 0.4;
      const boostMod = gs.boostEffect > 0 ? 1.6 : 1;

      if (keys["ArrowUp"] || keys["w"] || keys["W"]) {
        c.speed += c.acceleration * accelMod * boostMod * dt;
      } else if (keys["ArrowDown"] || keys["s"] || keys["S"]) {
        c.speed -= c.acceleration * 0.6 * dt;
      }

      c.speed *= Math.pow(frictionMod, dt);

      const effectiveTurnSpeed = gs.oilEffect > 0
        ? c.turnSpeed * 2.2
        : c.turnSpeed * (0.5 + 0.5 * Math.abs(c.speed) / c.maxSpeed);

      if (keys["ArrowLeft"] || keys["a"] || keys["A"]) {
        c.angle -= effectiveTurnSpeed * dt * Math.sign(c.speed);
      }
      if (keys["ArrowRight"] || keys["d"] || keys["D"]) {
        c.angle += effectiveTurnSpeed * dt * Math.sign(c.speed);
      }

      const topSpeed = c.maxSpeed * boostMod;
      c.speed = Math.max(-topSpeed * 0.5, Math.min(topSpeed, c.speed));
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;

      // Boundary
      c.x = Math.max(10, Math.min(W - 10, c.x));
      c.y = Math.max(10, Math.min(H - 10, c.y));

      // Effects decay
      if (gs.oilEffect > 0) gs.oilEffect -= 0.015 * dt;
      else gs.oilEffect = 0;
      if (gs.boostEffect > 0) gs.boostEffect -= 0.02 * dt;
      else gs.boostEffect = 0;

      // Obstacle collision
      obstacles.forEach(obs => {
        if (!obs.active) return;
        const r = obs.type === "barrier" ? 14 : 10;
        if (distSq(c.x, c.y, obs.x, obs.y) < r * r * 2.5) {
          if (obs.type === "oil") {
            gs.oilEffect = 1;
          } else if (obs.type === "boost") {
            gs.boostEffect = 1;
            obs.active = false;
          } else if (obs.type === "cone") {
            c.speed *= 0.6;
            obs.active = false;
            // Cone particles
            for (let p = 0; p < 8; p++) {
              particles.push({
                x: obs.x, y: obs.y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 25, maxLife: 25,
                color: "#ff4400",
                size: 4
              });
            }
          } else if (obs.type === "barrier") {
            c.speed *= -0.4;
            c.angle += (Math.random() - 0.5) * 0.4;
          }
        }
      });

      checkCheckpoints(c);
      drawCar(c);

      const elapsed = Date.now() - gs.startTime;
      setCurrentLap(c.lap);
      setCurrentTime(elapsed);
      setSpeed(Math.round(Math.abs(c.speed) * 30));
      drawHUD(c, elapsed);

      // Check win
      if (c.lap > selectedTrack.laps) {
        gs.running = false;
        setFinalTime(elapsed);
        saveRecord(selectedTrack.id, selectedTrack.name, elapsed);
        setTimeout(() => setScreen("gameover"), 200);
        return;
      }

      gs.animId = requestAnimationFrame(loop);
    }

    gameStateRef.current!.animId = requestAnimationFrame(loop);

    return () => {
      if (gameStateRef.current) {
        gameStateRef.current.running = false;
        cancelAnimationFrame(gameStateRef.current.animId);
      }
      window.removeEventListener("keydown", e => onKey(e, true));
      window.removeEventListener("keyup", e => onKey(e, false));
      canvas.removeEventListener("touchstart", onTouchStart);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchend", onTouchEnd);
    };
  }, [screen, selectedTrack, saveRecord]);

  // ===== RENDER =====
  const diffColor = {
    "ЛЁГКАЯ": "#00ff88",
    "СРЕДНЯЯ": "#ffcc00",
    "СЛОЖНАЯ": "#ff4466",
    "ЭКСТРИМ": "#ff6600",
  };

  if (screen === "menu") {
    return (
      <div className="min-h-screen bg-[#060610] text-white flex flex-col" style={{ fontFamily: "'Oswald', sans-serif" }}>
        {/* Header */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #0a0a20 100%)" }}>
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, #ffffff08 39px, #ffffff08 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, #ffffff08 39px, #ffffff08 40px)"
            }}
          />
          <div className="relative z-10 text-center py-14 px-8">
            <div className="inline-block mb-3 px-4 py-1 border border-[#00ff88] text-[#00ff88] text-xs tracking-[0.3em]"
              style={{ fontFamily: "'Roboto Mono', monospace" }}>
              ГОНОЧНЫЙ СИМУЛЯТОР
            </div>
            <h1 className="text-6xl md:text-8xl font-bold tracking-widest text-white mt-2 mb-1"
              style={{ textShadow: "0 0 60px #00ff8844, 0 0 120px #00ff8822" }}>
              APEX
            </h1>
            <h2 className="text-3xl md:text-4xl font-light tracking-[0.5em] text-[#00ff88]">DRIFT</h2>
            <p className="mt-4 text-gray-400 text-sm tracking-widest" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              ВЫБЕРИ ТРАССУ И УСТАНОВИ РЕКОРД
            </p>
          </div>
        </div>

        {/* Track selection */}
        <div className="flex-1 p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {TRACKS.map((track) => {
              const rec = records.find(r => r.trackId === track.id);
              return (
                <button
                  key={track.id}
                  onClick={() => startGame(track)}
                  className="relative group text-left p-6 border transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = track.color;
                    (e.currentTarget as HTMLElement).style.background = track.color + "11";
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 0 30px ${track.color}22`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs tracking-widest mb-1" style={{ color: track.color, fontFamily: "'Roboto Mono', monospace" }}>
                        ТРАССА {track.id}
                      </div>
                      <div className="text-xl font-bold tracking-wide text-white">{track.name}</div>
                    </div>
                    <div className="px-2 py-1 text-xs font-bold tracking-wider"
                      style={{
                        color: track.color,
                        border: `1px solid ${track.color}`,
                        fontFamily: "'Roboto Mono', monospace"
                      }}>
                      {track.difficulty}
                    </div>
                  </div>
                  <p className="text-gray-400 text-sm mb-4" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    {track.description}
                  </p>
                  <div className="flex gap-6 text-xs" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                    <div>
                      <div className="text-gray-600">КРУГИ</div>
                      <div className="text-white font-bold">{track.laps}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">ПРЕПЯТСТВИЯ</div>
                      <div className="text-white font-bold">{track.obstacles}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">РЕКОРД</div>
                      <div style={{ color: track.color }} className="font-bold">
                        {rec ? formatTime(rec.time) : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: track.color, fontSize: 22 }}>
                    ▶
                  </div>
                </button>
              );
            })}
          </div>

          {/* Bottom nav */}
          <div className="flex justify-center gap-6 mt-10">
            <button
              onClick={() => setScreen("records")}
              className="px-8 py-3 border border-white/20 text-white/60 text-sm tracking-widest hover:border-white/60 hover:text-white transition-all"
              style={{ fontFamily: "'Roboto Mono', monospace" }}
            >
              РЕКОРДЫ
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "records") {
    return (
      <div className="min-h-screen bg-[#060610] text-white flex flex-col items-center justify-center p-8"
        style={{ fontFamily: "'Oswald', sans-serif" }}>
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="text-xs tracking-widest text-[#00ff88] mb-2" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              ТАБЛИЦА
            </div>
            <h1 className="text-5xl font-bold tracking-widest">РЕКОРДЫ</h1>
          </div>

          {records.length === 0 ? (
            <div className="text-center text-gray-500 py-16 border border-white/10"
              style={{ fontFamily: "'Roboto Mono', monospace" }}>
              <div className="text-4xl mb-4">🏁</div>
              <div className="text-sm tracking-widest">НЕТ РЕКОРДОВ</div>
              <div className="text-xs mt-2 text-gray-600">ЗАВЕРШИ ПЕРВУЮ ГОНКУ</div>
            </div>
          ) : (
            <div className="space-y-3">
              {TRACKS.map(track => {
                const rec = records.find(r => r.trackId === track.id);
                return (
                  <div key={track.id} className="flex items-center justify-between p-4 border"
                    style={{ borderColor: rec ? track.color + "44" : "rgba(255,255,255,0.06)", background: rec ? track.color + "08" : "transparent" }}>
                    <div>
                      <div className="text-xs text-gray-500 tracking-widest mb-1" style={{ fontFamily: "'Roboto Mono', monospace" }}>
                        {track.difficulty}
                      </div>
                      <div className="font-bold tracking-wide">{track.name}</div>
                    </div>
                    <div className="text-right">
                      {rec ? (
                        <>
                          <div className="text-xl font-bold" style={{ color: track.color }}>{formatTime(rec.time)}</div>
                          <div className="text-xs text-gray-600" style={{ fontFamily: "'Roboto Mono', monospace" }}>{rec.date}</div>
                        </>
                      ) : (
                        <div className="text-gray-600 text-sm" style={{ fontFamily: "'Roboto Mono', monospace" }}>—</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <button
              onClick={() => setScreen("menu")}
              className="flex-1 py-3 border border-white/20 text-white/60 text-sm tracking-widest hover:border-white hover:text-white transition-all"
              style={{ fontFamily: "'Roboto Mono', monospace" }}
            >
              ← НАЗАД
            </button>
            {records.length > 0 && (
              <button
                onClick={() => {
                  localStorage.removeItem("apex_records");
                  setRecords([]);
                }}
                className="py-3 px-6 border border-red-500/30 text-red-400/60 text-sm tracking-widest hover:border-red-500 hover:text-red-400 transition-all"
                style={{ fontFamily: "'Roboto Mono', monospace" }}
              >
                СБРОС
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "gameover") {
    const rec = records.find(r => r.trackId === selectedTrack.id);
    const isNew = rec && rec.time === finalTime;
    return (
      <div className="min-h-screen bg-[#060610] text-white flex flex-col items-center justify-center p-8"
        style={{ fontFamily: "'Oswald', sans-serif" }}>
        <div className="text-center max-w-sm w-full">
          <div className="text-6xl mb-6">🏁</div>
          {isNew && (
            <div className="mb-4 px-4 py-2 text-sm tracking-widest animate-pulse"
              style={{ color: selectedTrack.color, border: `1px solid ${selectedTrack.color}`, fontFamily: "'Roboto Mono', monospace" }}>
              ★ НОВЫЙ РЕКОРД!
            </div>
          )}
          <h1 className="text-5xl font-bold tracking-widest mb-2">ФИНИШ</h1>
          <div className="text-gray-400 text-sm tracking-widest mb-8" style={{ fontFamily: "'Roboto Mono', monospace" }}>
            {selectedTrack.name}
          </div>

          <div className="py-8 border-y mb-8"
            style={{ borderColor: selectedTrack.color + "44" }}>
            <div className="text-xs text-gray-500 tracking-widest mb-2" style={{ fontFamily: "'Roboto Mono', monospace" }}>
              ФИНАЛЬНОЕ ВРЕМЯ
            </div>
            <div className="text-5xl font-bold" style={{ color: selectedTrack.color }}>
              {formatTime(finalTime)}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => startGame(selectedTrack)}
              className="w-full py-4 text-black font-bold text-lg tracking-widest transition-all hover:opacity-90"
              style={{ background: selectedTrack.color }}
            >
              ЕЩЁ РАЗ
            </button>
            <button
              onClick={() => setScreen("menu")}
              className="w-full py-4 border border-white/20 text-white/70 tracking-widest hover:border-white hover:text-white transition-all text-sm"
              style={{ fontFamily: "'Roboto Mono', monospace" }}
            >
              ВЫБОР ТРАССЫ
            </button>
            <button
              onClick={() => setScreen("records")}
              className="w-full py-3 text-gray-500 tracking-widest hover:text-gray-300 transition-all text-xs"
              style={{ fontFamily: "'Roboto Mono', monospace" }}
            >
              ТАБЛИЦА РЕКОРДОВ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="relative w-full h-screen bg-[#060610] overflow-hidden flex flex-col">
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
        width={800}
        height={600}
        style={{ imageRendering: "pixelated" }}
      />

      {/* Mobile controls */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 md:hidden select-none">
        <div className="grid grid-cols-3 gap-1">
          <div />
          <button
            className="w-14 h-14 border border-white/30 bg-black/50 text-white text-xl flex items-center justify-center active:bg-white/20 rounded"
            onTouchStart={() => gameStateRef.current && (gameStateRef.current.keys["ArrowUp"] = true)}
            onTouchEnd={() => gameStateRef.current && (gameStateRef.current.keys["ArrowUp"] = false)}
          >▲</button>
          <div />
          <button
            className="w-14 h-14 border border-white/30 bg-black/50 text-white text-xl flex items-center justify-center active:bg-white/20 rounded"
            onTouchStart={() => gameStateRef.current && (gameStateRef.current.keys["ArrowLeft"] = true)}
            onTouchEnd={() => gameStateRef.current && (gameStateRef.current.keys["ArrowLeft"] = false)}
          >◀</button>
          <button
            className="w-14 h-14 border border-white/30 bg-black/50 text-white text-xl flex items-center justify-center active:bg-white/20 rounded"
            onTouchStart={() => gameStateRef.current && (gameStateRef.current.keys["ArrowDown"] = true)}
            onTouchEnd={() => gameStateRef.current && (gameStateRef.current.keys["ArrowDown"] = false)}
          >▼</button>
          <button
            className="w-14 h-14 border border-white/30 bg-black/50 text-white text-xl flex items-center justify-center active:bg-white/20 rounded"
            onTouchStart={() => gameStateRef.current && (gameStateRef.current.keys["ArrowRight"] = true)}
            onTouchEnd={() => gameStateRef.current && (gameStateRef.current.keys["ArrowRight"] = false)}
          >▶</button>
        </div>
      </div>

      {/* ESC button */}
      <button
        onClick={() => {
          if (gameStateRef.current) {
            gameStateRef.current.running = false;
            cancelAnimationFrame(gameStateRef.current.animId);
          }
          setScreen("menu");
        }}
        className="absolute top-4 left-4 px-3 py-1 border border-white/20 text-white/40 text-xs tracking-widest hover:border-white/60 hover:text-white/80 transition-all z-10 bg-black/40"
        style={{ fontFamily: "'Roboto Mono', monospace" }}
      >
        ESC
      </button>

      {/* Controls hint desktop */}
      <div className="absolute bottom-3 right-4 text-white/20 text-xs tracking-widest hidden md:block"
        style={{ fontFamily: "'Roboto Mono', monospace" }}>
        ↑↓ ГАЗ/ТОРМОЗ · ←→ ПОВОРОТ
      </div>
    </div>
  );
}
