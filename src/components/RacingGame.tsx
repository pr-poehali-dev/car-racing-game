import { useState, useCallback } from "react";
import { GameScreen, Track, GameRecord, TRACKS } from "./game/types";
import { MenuScreen, RecordsScreen, GameOverScreen } from "./game/MenuScreens";
import GameCanvas from "./game/GameCanvas";

export default function RacingGame() {
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);
  const [records, setRecords] = useState<GameRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem("apex_records") || "[]"); } catch { return []; }
  });
  const [finalTime, setFinalTime] = useState(0);
  const [currentLap, setCurrentLap] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(0);

  const saveRecord = useCallback((trackId: number, trackName: string, time: number) => {
    setRecords(prev => {
      const existing = prev.find(r => r.trackId === trackId);
      let next = prev;
      const newRecord: GameRecord = {
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

  const handleFinish = useCallback((elapsed: number) => {
    setFinalTime(elapsed);
    saveRecord(selectedTrack.id, selectedTrack.name, elapsed);
    setTimeout(() => setScreen("gameover"), 200);
  }, [selectedTrack, saveRecord]);

  if (screen === "menu") {
    return (
      <MenuScreen
        records={records}
        onStart={startGame}
        onNavigate={setScreen}
      />
    );
  }

  if (screen === "records") {
    return (
      <RecordsScreen
        records={records}
        onBack={() => setScreen("menu")}
        onClear={() => {
          localStorage.removeItem("apex_records");
          setRecords([]);
        }}
      />
    );
  }

  if (screen === "gameover") {
    return (
      <GameOverScreen
        selectedTrack={selectedTrack}
        finalTime={finalTime}
        records={records}
        onRestart={startGame}
        onNavigate={setScreen}
      />
    );
  }

  return (
    <GameCanvas
      selectedTrack={selectedTrack}
      onFinish={handleFinish}
      onEscape={() => setScreen("menu")}
      setCurrentLap={setCurrentLap}
      setCurrentTime={setCurrentTime}
      setSpeed={setSpeed}
    />
  );
}
