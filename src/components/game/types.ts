export type GameScreen = "menu" | "game" | "records" | "gameover";

export interface Track {
  id: number;
  name: string;
  difficulty: "ЛЁГКАЯ" | "СРЕДНЯЯ" | "СЛОЖНАЯ" | "ЭКСТРИМ";
  description: string;
  color: string;
  laps: number;
  obstacles: number;
  pathPoints: [number, number][];
}

export interface GameRecord {
  trackId: number;
  trackName: string;
  time: number;
  date: string;
}

export interface Car {
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

export interface Obstacle {
  x: number;
  y: number;
  type: "cone" | "oil" | "barrier" | "boost";
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
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
}

export const TRACKS: Track[] = [
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

export function pointOnPath(points: [number, number][], t: number): [number, number] {
  const totalSegments = points.length - 1;
  const segment = Math.floor(t * totalSegments);
  const segT = (t * totalSegments) - segment;
  const p0 = points[Math.min(segment, totalSegments - 1)];
  const p1 = points[Math.min(segment + 1, totalSegments)];
  return [p0[0] + (p1[0] - p0[0]) * segT, p0[1] + (p1[1] - p0[1]) * segT];
}

export function distSq(ax: number, ay: number, bx: number, by: number) {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

export function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${m}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}
