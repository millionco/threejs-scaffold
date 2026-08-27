import "./style.css";
import { useCallback, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { startGame } from "./game/game";

function App() {
  const [cleaned, setCleaned] = useState(0);
  const [total, setTotal] = useState(1);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const init = useCallback((canvas: HTMLCanvasElement | null) => {
    if (!canvas || started.current) return;
    started.current = true;
    void startGame(canvas, {
      onProgress: (c, t) => {
        setCleaned(c);
        setTotal(t);
      },
      onDone: () => setDone(true),
    });
  }, []);

  const pct = Math.round((cleaned / Math.max(1, total)) * 100);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <canvas id="view" ref={init} className="block h-full w-full" />
      <div className="pointer-events-none absolute top-4 left-1/2 flex w-80 -translate-x-1/2 flex-col items-center gap-1">
        <div className="h-6 w-full overflow-hidden rounded-full border-2 border-white/60 bg-black/40">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="rounded bg-black/40 px-2 text-sm font-semibold text-white">
          {pct}% clean
        </span>
      </div>
      {done && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white px-10 py-8 text-center shadow-2xl">
            <h1 className="text-3xl font-bold text-emerald-600">Room clean! ✨</h1>
            <p className="mt-2 text-gray-600">Every last crumb is gone.</p>
            <button
              type="button"
              className="mt-4 rounded-full bg-emerald-500 px-6 py-2 font-semibold text-white hover:bg-emerald-600"
              onClick={() => location.reload()}
            >
              Play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const root = document.querySelector("#root") as HTMLDivElement;
createRoot(root).render(<App />);
