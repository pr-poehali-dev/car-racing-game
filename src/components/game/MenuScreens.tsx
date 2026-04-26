import { GameRecord, GameScreen, Track, TRACKS, formatTime } from "./types";

interface MenuScreenProps {
  records: GameRecord[];
  onStart: (track: Track) => void;
  onNavigate: (screen: GameScreen) => void;
}

interface RecordsScreenProps {
  records: GameRecord[];
  onBack: () => void;
  onClear: () => void;
}

interface GameOverScreenProps {
  selectedTrack: Track;
  finalTime: number;
  records: GameRecord[];
  onRestart: (track: Track) => void;
  onNavigate: (screen: GameScreen) => void;
}

export function MenuScreen({ records, onStart, onNavigate }: MenuScreenProps) {
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
                onClick={() => onStart(track)}
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
            onClick={() => onNavigate("records")}
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

export function RecordsScreen({ records, onBack, onClear }: RecordsScreenProps) {
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
            onClick={onBack}
            className="flex-1 py-3 border border-white/20 text-white/60 text-sm tracking-widest hover:border-white hover:text-white transition-all"
            style={{ fontFamily: "'Roboto Mono', monospace" }}
          >
            ← НАЗАД
          </button>
          {records.length > 0 && (
            <button
              onClick={onClear}
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

export function GameOverScreen({ selectedTrack, finalTime, records, onRestart, onNavigate }: GameOverScreenProps) {
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
            onClick={() => onRestart(selectedTrack)}
            className="w-full py-4 text-black font-bold text-lg tracking-widest transition-all hover:opacity-90"
            style={{ background: selectedTrack.color }}
          >
            ЕЩЁ РАЗ
          </button>
          <button
            onClick={() => onNavigate("menu")}
            className="w-full py-4 border border-white/20 text-white/70 tracking-widest hover:border-white hover:text-white transition-all text-sm"
            style={{ fontFamily: "'Roboto Mono', monospace" }}
          >
            ВЫБОР ТРАССЫ
          </button>
          <button
            onClick={() => onNavigate("records")}
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
