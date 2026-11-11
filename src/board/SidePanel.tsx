import jeLogo from "../assets/logos/jersey-electricity.jpg";
import {
  describeLap,
  displayName,
  latestLap,
  type Lap,
  type LapVerdict,
  type Standing,
} from "../lib/standings";
import { formatGap, formatLapTime } from "../lib/time";

interface SidePanelProps {
  laps: Lap[];
  standings: Standing[];
  pageLabel: string | null;
}

interface Delta {
  text: string;
  tone: "fl" | "pb" | "slow";
}

function deltaFor(verdict: LapVerdict): Delta {
  switch (verdict.kind) {
    case "fastest":
      return { text: "FASTEST LAP", tone: "fl" };
    case "first":
      return { text: "FIRST LAP", tone: "pb" };
    case "pb":
      return { text: `PB ${formatGap(verdict.deltaMs ?? 0)}`, tone: "pb" };
    case "slower":
      return {
        text: `${formatGap(verdict.deltaMs ?? 0)} NO IMPROVEMENT`,
        tone: "slow",
      };
  }
}

export function SidePanel({ laps, standings, pageLabel }: SidePanelProps) {
  const fastest = standings[0];
  const last = latestLap(laps);
  const delta = last
    ? deltaFor(
        describeLap(
          laps.filter((lap) => lap.id !== last.id),
          last,
        ),
      )
    : null;

  return (
    <div className="side">
      <div className="card fl">
        <h4>Fastest lap</h4>
        <div className="who">{fastest?.name ?? "Up for grabs"}</div>
        <div className="big">
          {fastest ? formatLapTime(fastest.bestMs) : "-:--.---"}
        </div>
      </div>
      <div className="card last bump" key={last?.id ?? "none"}>
        <h4>Latest lap</h4>
        <div className="who">
          {last ? displayName(last.driverName) : "Waiting for driver"}
        </div>
        <div className="big">
          {last ? formatLapTime(last.timeMs) : "-:--.---"}
        </div>
        {delta && <span className={`delta ${delta.tone}`}>{delta.text}</span>}
      </div>
      <div className="stats">
        <span>
          {standings.length} drivers · {laps.length} laps
          {pageLabel && <em>{pageLabel}</em>}
        </span>
        <img src={jeLogo} alt="Jersey Electricity" />
      </div>
    </div>
  );
}
