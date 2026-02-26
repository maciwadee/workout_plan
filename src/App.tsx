import { useState, useCallback } from "react";

const STORAGE_KEY = "workout-tracker-v1";

function getMondayOfWeek(d: Date): Date {
  const d2 = new Date(d);
  const day = d2.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d2.setDate(d2.getDate() + diff);
  return d2;
}

function getCurrentWeekId(): string {
  const monday = getMondayOfWeek(new Date());
  const year = monday.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const startMonday = getMondayOfWeek(startOfYear);
  const weekNum = Math.floor((monday.getTime() - startMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

function parseWeekId(weekId: string): { year: number; week: number } {
  const [yearStr, weekStr] = weekId.split("-W");
  return { year: parseInt(yearStr, 10), week: parseInt(weekStr, 10) };
}

function getWeekLabel(weekId: string): string {
  const { year, week } = parseWeekId(weekId);
  const jan4 = new Date(year, 0, 4);
  const startMonday = getMondayOfWeek(jan4);
  const monday = new Date(startMonday);
  monday.setDate(startMonday.getDate() + (week - 1) * 7);
  const mon = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const sun = new Date(monday);
  sun.setDate(sun.getDate() + 6);
  const sunStr = sun.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${mon}–${sunStr}`;
}

function getPreviousWeekId(weekId: string): string {
  const { year, week } = parseWeekId(weekId);
  if (week === 1) return `${year - 1}-W52`;
  return `${year}-W${String(week - 1).padStart(2, "0")}`;
}

function getNextWeekId(weekId: string): string {
  const { year, week } = parseWeekId(weekId);
  if (week === 52) return `${year + 1}-W01`;
  return `${year}-W${String(week + 1).padStart(2, "0")}`;
}

type WeekData = { checked: Record<string, boolean>; weights: Record<string, string> };

type ExercisePair = {
  a: string;
  b: string;
  reps: string;
  rest: string;
};

type ExerciseGroup = {
  name: string;
  sets: number;
  rpe: string;
  pairs: ExercisePair[];
};

type DayPlan = {
  label: string;
  emoji: string;
  note: string;
  sessions: string[];
  groups: ExerciseGroup[];
};

type PlanType = {
  [key: string]: DayPlan;
};

function loadAllWeeks(): Record<string, WeekData> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, WeekData>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveAllWeeks(allWeeks: Record<string, WeekData>): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allWeeks));
    }
  } catch (_) {}
}

const plan: PlanType = {
  "Monday": {
    label: "Chest + Back + Abs",
    emoji: "🫁🔙🔥",
    note: "Antagonist superset — chest & back never compete",
    sessions: ["Noon 12–1pm", "Evening 6–7pm (Cardio LISS 45')"],
    groups: [
      {
        name: "SUPERSET A — Chest / Back",
        sets: 3,
        rpe: "RPE 7→8",
        pairs: [
          { a: "Bench Press", b: "Bent Over Row", reps: "8–10", rest: "60s after pair" },
          { a: "Incline DB Press", b: "Seated Cable Row", reps: "10–12", rest: "60s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Chest Isolation / Back Isolation",
        sets: 2,
        rpe: "RPE 8",
        pairs: [
          { a: "Cable Fly (mid-chest)", b: "Lat Pulldown", reps: "12–15", rest: "45s after pair" },
        ]
      },
      {
        name: "CIRCUIT — Abs (no rest between)",
        sets: 2,
        rpe: "RPE 8–9",
        pairs: [
          { a: "Hanging Leg Raise", b: "Cable Crunch", reps: "15–20", rest: "45s after circuit" },
        ]
      }
    ]
  },
  "Tuesday": {
    label: "Shoulders + Arms + Core",
    emoji: "💪💪🔥",
    note: "Shoulders first when fresh, arms benefit from pre-fatigue",
    sessions: ["Noon 12–1pm", "Evening 6–7pm (Cardio HIIT 30')"],
    groups: [
      {
        name: "SUPERSET A — Shoulders / Biceps (compound)",
        sets: 3,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Overhead Press", b: "Barbell Curl", reps: "8–10 / 8–10", rest: "90s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Shoulders / Biceps",
        sets: 2,
        rpe: "RPE 8",
        pairs: [
          { a: "Lateral Raise", b: "Hammer Curl", reps: "12–15", rest: "45s after pair" },
          { a: "Rear Delt Fly", b: "Cable Curl", reps: "12–15", rest: "45s after pair" },
        ]
      },
      {
        name: "SUPERSET C — Triceps / Biceps",
        sets: 2,
        rpe: "RPE 8–9",
        pairs: [
          { a: "Tricep Pushdown", b: "Incline DB Curl", reps: "12–15", rest: "45s after pair" },
          { a: "Skull Crusher", b: "—", reps: "10–12", rest: "45s" },
        ]
      }
    ]
  },
  "Wednesday": {
    label: "Legs + Glutes + Calves",
    emoji: "🦵🍑",
    note: "Drop set on last set of Squat & RDL for maximum stimulus",
    sessions: ["Noon 12–1pm", "Evening 6–7pm (Cardio LISS 45')"],
    groups: [
      {
        name: "COMPOUND — Quad Dominant",
        sets: 3,
        rpe: "RPE 7→9 (last set drop set)",
        pairs: [
          { a: "Squat", b: "—", reps: "8–10 → drop 20% → failure", rest: "120s" },
        ]
      },
      {
        name: "SUPERSET A — Hamstring / Quad",
        sets: 3,
        rpe: "RPE 8",
        pairs: [
          { a: "Romanian Deadlift", b: "Leg Press", reps: "10–12", rest: "60s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Hamstring Isolation / Glute",
        sets: 2,
        rpe: "RPE 8–9",
        pairs: [
          { a: "Lying Leg Curl (face down)", b: "Hip Thrust", reps: "12–15", rest: "45s after pair" },
        ]
      },
      {
        name: "FINISHER — Calves (slow eccentric 3s down)",
        sets: 3,
        rpe: "RPE 9",
        pairs: [
          { a: "Standing Calf Raise", b: "—", reps: "15–20", rest: "30s" },
          { a: "Seated Calf Raise", b: "—", reps: "15–20", rest: "30s" },
        ]
      }
    ]
  },
  "Thursday": {
    label: "Chest + Shoulders + Triceps",
    emoji: "🫁💪",
    note: "Push day — supersets where muscles don't overlap to save time",
    sessions: ["Noon 12–1pm", "Evening 6–7pm (Cardio HIIT 30')"],
    groups: [
      {
        name: "SUPERSET A — Chest / Side Delt + OHP / Core",
        sets: 3,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Incline Bench Press", b: "Lateral Raise", reps: "8–10 / 12–15", rest: "60s after pair" },
          { a: "Overhead Press", b: "Plank (30–45s)", reps: "8–10 / 30–45s", rest: "60s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Chest Isolation / Front Delt + Dips / Core",
        sets: 2,
        rpe: "RPE 8",
        pairs: [
          { a: "Pec Deck / Cable Fly (mid-chest)", b: "Front Raise", reps: "12–15 / 10–12", rest: "45s after pair" },
          { a: "Dips", b: "Dead Bug (10 per side)", reps: "10–12 / 10 per side", rest: "45s after pair" },
        ]
      },
      {
        name: "STRAIGHT SETS — Triceps (drop set last set)",
        sets: 2,
        rpe: "RPE 8→9",
        pairs: [
          { a: "Overhead Tricep Ext.", b: "—", reps: "10–12 → drop → failure", rest: "45s" },
          { a: "Tricep Pushdown", b: "—", reps: "10–12 → drop → failure", rest: "45s" },
        ]
      }
    ]
  },
  "Friday": {
    label: "Back + Biceps + Rear Delt",
    emoji: "🔙💪",
    note: "Pull day at gym — all pulling muscles, superset for max pump",
    sessions: ["Gym 50–60'", "Evening 6–7pm (Cardio LISS 45') optional"],
    groups: [
      {
        name: "SUPERSET — Back Compound + Core",
        sets: 3,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Deadlift / Rack Pull", b: "Plank (30–45s)", reps: "6–8 / 30–45s", rest: "120s after pair" },
        ]
      },
      {
        name: "SUPERSET A — Back / Biceps",
        sets: 3,
        rpe: "RPE 8",
        pairs: [
          { a: "Pull-up / Lat Pulldown", b: "Barbell Curl", reps: "8–10", rest: "60s after pair" },
          { a: "Cable Row", b: "Hammer Curl", reps: "10–12", rest: "45s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Rear Delt / Biceps Isolation",
        sets: 2,
        rpe: "RPE 8–9",
        pairs: [
          { a: "Face Pull", b: "Incline DB Curl", reps: "15–20", rest: "45s after pair" },
        ]
      }
    ]
  },
  "Saturday": {
    label: "Tennis + Home (no gym)",
    emoji: "🎾🏠",
    note: "No gym equipment — tennis 2h then optional bodyweight at home",
    sessions: ["Tennis 2h", "Optional: bodyweight circuit 20–30' at home"],
    groups: [
      {
        name: "CIRCUIT A — Pull / Push (no equipment)",
        sets: 2,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Inverted Row (table/bar)", b: "Push-up", reps: "8–12", rest: "45s after pair" },
        ]
      },
      {
        name: "CIRCUIT B — Legs / Glutes",
        sets: 2,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Bodyweight Squat", b: "Glute Bridge", reps: "12–15", rest: "45s after pair" },
        ]
      },
      {
        name: "CIRCUIT C — Core (no rest between)",
        sets: 2,
        rpe: "RPE 8",
        pairs: [
          { a: "Plank", b: "Dead Bug", reps: "30–45s / 10 per side", rest: "30s after circuit" },
        ]
      }
    ]
  },
  "Sunday": {
    label: "REST DAY",
    emoji: "😴",
    note: "Full recovery — muscles grow today, not in the gym",
    sessions: ["Light walk 20–30' if desired"],
    groups: []
  }
};

const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const rpeColor = (rpe: string): string => {
  if (rpe.includes("9")) return "text-red-400";
  if (rpe.includes("8")) return "text-yellow-400";
  return "text-green-400";
};

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function getTodayDayName(): string {
  return dayNames[new Date().getDay()];
}

function buildKeyToExerciseName(): Record<string, string> {
  const map: Record<string, string> = {};
  days.forEach((day: string) => {
    plan[day].groups.forEach((g: ExerciseGroup, gi: number) => {
      g.pairs.forEach((pair: ExercisePair, pi: number) => {
        map[`${day}-${gi}-${pi}-A`] = pair.a;
        if (hasSecondExercise(pair)) map[`${day}-${gi}-${pi}-B`] = pair.b;
      });
    });
  });
  return map;
}

const keyToExerciseName = buildKeyToExerciseName();

function buildExerciseHistory(allWeeks: Record<string, WeekData>): Record<string, string[]> {
  const byExercise: Record<string, string[]> = {};
  const weekIds = Object.keys(allWeeks).sort().reverse().slice(0, 8);
  weekIds.forEach((weekId: string) => {
    const w = allWeeks[weekId];
    if (!w?.weights) return;
    Object.entries(w.weights).forEach(([key, val]: [string, string]) => {
      if (val == null || val === "") return;
      const name = keyToExerciseName[key];
      if (name) {
        if (!byExercise[name]) byExercise[name] = [];
        byExercise[name].push(val);
      }
    });
  });
  return byExercise;
}

function buildMarkdownReport(allWeeks: Record<string, WeekData>): string {
  const lines: string[] = [];
  lines.push("# Workout plan progress report");
  lines.push("");
  lines.push(`Export date: ${new Date().toISOString().slice(0, 10)}`);
  lines.push("");
  lines.push("Plan: 5-day split — Mon Chest+Back+Abs, Tue Shoulders+Arms, Wed Legs+Glutes+Calves, Thu Push, Fri Pull, Sat Tennis+home, Sun Rest.");
  lines.push("");
  const weekIds = Object.keys(allWeeks).sort().reverse().slice(0, 8);
  weekIds.forEach((weekId: string) => {
    lines.push(`## Week ${weekId} (${getWeekLabel(weekId)})`);
    lines.push("");
    const w = allWeeks[weekId];
    if (!w) return;
    days.forEach((day: string) => {
      const groups = plan[day].groups;
      if (groups.length === 0) return;
      const items: string[] = [];
      groups.forEach((g: ExerciseGroup, gi: number) => {
        g.pairs.forEach((pair: ExercisePair, pi: number) => {
          const keyA = `${day}-${gi}-${pi}-A`;
          const keyB = `${day}-${gi}-${pi}-B`;
          const doneA = w.checked?.[keyA];
          const wtA = w.weights?.[keyA];
          items.push(`${pair.a} ${wtA ?? "—"} kg ${doneA ? "done" : "—"}`);
          if (hasSecondExercise(pair)) {
            const doneB = w.checked?.[keyB];
            const wtB = w.weights?.[keyB];
            items.push(`${pair.b} ${wtB ?? "—"} kg ${doneB ? "done" : "—"}`);
          }
        });
      });
      lines.push(`### ${day} — ${plan[day].label}`);
      lines.push(items.join("; ") + ".");
      lines.push("");
    });
  });
  lines.push("## Progress by exercise (last 8 weeks, newest first)");
  lines.push("");
  const history = buildExerciseHistory(allWeeks);
  Object.entries(history).forEach(([name, weights]: [string, string[]]) => {
    lines.push(`- **${name}**: ${weights.join(", ")} kg`);
  });
  return lines.join("\n");
}

/** True if this pair has a second exercise (superset); false for straight set (b is dash or empty). */
function hasSecondExercise(pair: ExercisePair): boolean {
  const b = (pair.b ?? "").trim();
  return b.length > 0 && b !== "—" && b !== "–" && b !== "-";
}

function isDayComplete(weekData: WeekData, d: string): boolean {
  const groups = plan[d].groups;
  if (groups.length === 0) return false;
  const checked = weekData?.checked ?? {};
  for (let gi = 0; gi < groups.length; gi++) {
    const g = groups[gi];
    for (let pi = 0; pi < g.pairs.length; pi++) {
      const pair = g.pairs[pi];
      const keyA = `${d}-${gi}-${pi}-A`;
      if (!checked[keyA]) return false;
      if (hasSecondExercise(pair)) {
        const keyB = `${d}-${gi}-${pi}-B`;
        if (!checked[keyB]) return false;
      }
    }
  }
  return true;
}

function buildJsonReport(allWeeks: Record<string, WeekData>): string {
  const weekIds = Object.keys(allWeeks).sort().reverse();
  const weeks: Record<string, { checked: Record<string, boolean>; weights: Record<string, string>; label: string }> = {};
  weekIds.forEach((weekId: string) => {
    const w = allWeeks[weekId];
    if (w) weeks[weekId] = { ...w, label: getWeekLabel(weekId) };
  });
  const exerciseHistory = buildExerciseHistory(allWeeks);
  return JSON.stringify({ weeks, exerciseHistory }, null, 2);
}

export default function App() {
  const currentWeekId = getCurrentWeekId();
  const [selectedWeek, setSelectedWeek] = useState(currentWeekId);
  const [allWeeks, setAllWeeks] = useState<Record<string, WeekData>>(() => loadAllWeeks());
  const [activeDay, setActiveDay] = useState(() => getTodayDayName());
  const [copied, setCopied] = useState<"markdown" | "json" | null>(null);
  const [showImportUI, setShowImportUI] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const copyReport = (format: "markdown" | "json") => {
    const text = format === "markdown" ? buildMarkdownReport(allWeeks) : buildJsonReport(allWeeks);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(format);
      setTimeout(() => setCopied(null), 2000);
    }).catch(() => {});
  };

  const weekData = allWeeks[selectedWeek] ?? { checked: {}, weights: {} };
  const checked = weekData.checked;
  const weights = weekData.weights;

  const persistWeek = useCallback((weekId: string, data: WeekData) => {
    setAllWeeks((prev) => {
      const next = { ...prev, [weekId]: data };
      saveAllWeeks(next);
      return next;
    });
  }, []);

  const toggleCheck = (key: string) => {
    const next = { ...checked, [key]: !checked[key] };
    persistWeek(selectedWeek, { ...weekData, checked: next });
  };
  const setWeight = (key: string, val: string) => {
    const next = { ...weights, [key]: val };
    persistWeek(selectedWeek, { ...weekData, weights: next });
  };

  const day = plan[activeDay];

  const totalSets = day.groups.reduce((acc: number, g: ExerciseGroup) => acc + g.sets * g.pairs.length, 0);

  const previousWeekId = getPreviousWeekId(selectedWeek);
  const nextWeekId = getNextWeekId(selectedWeek);
  const isCurrentWeek = selectedWeek === currentWeekId;

  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans">
      <div className="max-w-2xl mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border border-gray-800 px-4 py-3 flex-shrink-0 rounded-2xl mx-3 mt-3">
        <h1 className="text-xl font-bold text-center text-white">💪 Workout Tracker</h1>
        <p className="text-center text-gray-400 text-sm mt-1">5-Day | 3 Muscle Groups/Day | Superset + RPE</p>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => copyReport("markdown")}
            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium"
          >
            Copy progress report
          </button>
          <button
            type="button"
            onClick={() => copyReport("json")}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium"
          >
            Copy as JSON
          </button>
          <button
            type="button"
            onClick={() => { setShowImportUI(true); setImportMessage(null); }}
            className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium"
          >
            Import JSON
          </button>
          {copied && (
            <span className="text-green-400 text-sm">Copied to clipboard</span>
          )}
          {importMessage && (
            <span className={importMessage.startsWith("Invalid") ? "text-red-400 text-sm" : "text-green-400 text-sm"}>
              {importMessage}
            </span>
          )}
        </div>
        {showImportUI && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <textarea
              placeholder="Paste JSON from Copy as JSON here"
              className="w-full min-h-[120px] px-3 py-2 rounded-lg bg-gray-800 border border-gray-600 text-gray-200 text-sm font-mono placeholder-gray-500 resize-y"
              id="import-json-textarea"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById("import-json-textarea") as HTMLTextAreaElement;
                  if (!el) return;
                  try {
                    const data = JSON.parse(el.value);
                    if (!data || typeof data.weeks !== "object") {
                      setImportMessage("Invalid data");
                      return;
                    }
                    const normalized: Record<string, WeekData> = {};
                    Object.entries(data.weeks).forEach(([weekId, w]: [string, unknown]) => {
                      const row = w as { checked?: Record<string, boolean>; weights?: Record<string, string> };
                      normalized[weekId] = {
                        checked: row?.checked ?? {},
                        weights: row?.weights ?? {}
                      };
                    });
                    setAllWeeks((prev) => {
                      const next = { ...prev, ...normalized };
                      saveAllWeeks(next);
                      return next;
                    });
                    setShowImportUI(false);
                    setImportMessage("Imported successfully");
                    setTimeout(() => setImportMessage(null), 2000);
                    el.value = "";
                  } catch {
                    setImportMessage("Invalid data");
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium"
              >
                Import
              </button>
              <button
                type="button"
                onClick={() => { setShowImportUI(false); setImportMessage(null); }}
                className="px-3 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-gray-200 text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-2xl mx-3 mt-3">
        <button
          type="button"
          onClick={() => setSelectedWeek(previousWeekId)}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-medium"
        >
          ← Prev
        </button>
        <div className="flex-1 text-center min-w-0">
          <span className="text-white font-semibold text-sm">
            {isCurrentWeek ? "This week" : getWeekLabel(selectedWeek)}
          </span>
          {!isCurrentWeek && (
            <span className="text-gray-500 text-xs ml-1">({selectedWeek})</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setSelectedWeek(nextWeekId)}
          className="flex-shrink-0 px-3 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 text-sm font-medium"
        >
          Next →
        </button>
      </div>

      {/* Day Selector — completed days: green shade (stays green when selected) */}
      <div className="flex overflow-x-auto gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-2xl mx-3 mt-3">
        {days.map((d: string) => {
          const isRest = plan[d].groups.length === 0;
          const isActive = activeDay === d;
          const dayComplete = !isRest && isDayComplete(weekData, d);
          const showGreen = dayComplete;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setActiveDay(d)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all border-2 ${
                showGreen
                  ? "text-gray-200 border-green-800 " + (isActive ? "ring ring-green-500" : "")
                  : isRest
                  ? "bg-gray-800 text-gray-500 border-gray-700"
                  : isActive
                  ? "bg-gray-800 text-white border-gray-700 ring"
                  : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700"
              }`}
              style={showGreen ? { backgroundColor: "rgba(20, 83, 45, 0.38)" } : undefined}
            >
              {d.slice(0,3)}
            </button>
          );
        })}
      </div>

      {/* Day Header */}
      <div className="px-4 py-3 bg-gray-900 border border-gray-800 flex-shrink-0 rounded-2xl mx-3 mt-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-2xl">{day.emoji}</div>
            <div className="text-lg font-bold mt-1">{activeDay}</div>
            <div className="text-orange-400 font-semibold text-sm">{day.label}</div>
          </div>
          {day.groups.length > 0 && (
            <div className="text-right flex-shrink-0 pl-4 border-l border-gray-700">
              <div className="text-2xl font-bold text-orange-400">{totalSets}</div>
              <div className="text-gray-400 text-xs">total sets</div>
            </div>
          )}
        </div>
        <p className="mt-3 text-gray-400 text-sm italic flex items-baseline gap-1.5">
          <span className="text-gray-500 flex-shrink-0" aria-hidden>•</span>
          <span>💡 {day.note}</span>
        </p>
        <ul className="mt-3 flex flex-wrap gap-2 list-none pl-0">
          {day.sessions.map((s: string, i: number) => (
            <li key={i}>
              <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                ⏰ {s}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Workout Groups */}
      <div className="px-4 py-4 space-y-6 flex-1">
        {day.groups.length === 0 ? (
          <div className="py-10">
            <div className="text-center">
              <div className="text-6xl mb-4">{day.emoji}</div>
              <div className="text-xl font-bold text-gray-300">{day.label}</div>
              <div className="text-gray-500 mt-2">{day.note}</div>
            </div>
            {/* Extra content for rest days to avoid super-short pages on mobile */}
            <div className="mt-8 space-y-3 text-sm text-gray-400 max-w-xl mx-auto">
              <p className="font-semibold text-gray-300 text-center">Suggested recovery checklist</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>10–15' easy walk or light stretching</li>
                <li>Hit daily step target and drink 2–3L of water</li>
                <li>8+ hours of sleep and 1–2 high-protein meals</li>
              </ul>
            </div>
            <div className="h-24" />
          </div>
        ) : (
          <>
            {day.groups.map((g: ExerciseGroup, gi: number) => (
              <div key={gi} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                {/* Group Header */}
                <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{g.name}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{g.sets} sets per exercise</div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-900 ${rpeColor(g.rpe)}`}>
                    {g.rpe}
                  </span>
                </div>

                {/* Exercise Pairs */}
                <div className="divide-y divide-gray-800">
                  {g.pairs.map((pair: ExercisePair, pi: number) => {
                    const keyA = `${activeDay}-${gi}-${pi}-A`;
                    const keyB = `${activeDay}-${gi}-${pi}-B`;
                    const prevWeekData = allWeeks[getPreviousWeekId(selectedWeek)];
                    const lastWeightA = prevWeekData?.weights?.[keyA];
                    const lastWeightB = prevWeekData?.weights?.[keyB];
                    const setLabel = hasSecondExercise(pair) ? "⚡ Superset" : "🏋️ Straight Set";
                    return (
                      <div key={pi} className="px-4 py-3">
                        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                          <span className="text-gray-500 flex-shrink-0">•</span>
                          <span className="truncate">{setLabel} — {pair.reps} reps · Rest {pair.rest}</span>
                        </p>
                        {/* Exercise A */}
                        <div className={`flex items-center gap-3 p-2 rounded-lg mb-2 ${checked[keyA] ? "bg-green-900/30" : "bg-gray-800"}`}>
                          <button onClick={() => toggleCheck(keyA)} className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked[keyA] ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
                            {checked[keyA] && <span className="text-white text-xs">✓</span>}
                          </button>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <div className={`font-semibold text-sm truncate ${checked[keyA] ? "line-through text-gray-500" : "text-white"}`} title={pair.a}>
                              {hasSecondExercise(pair) ? "A: " : ""}{pair.a}
                            </div>
                            {lastWeightA != null && lastWeightA !== "" && (
                              <div className="text-xs text-gray-500 mt-0.5">Last: {lastWeightA} kg</div>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="kg"
                            value={weights[keyA] || ""}
                            onChange={e => setWeight(keyA, e.target.value)}
                            className="w-12 flex-shrink-0 bg-gray-700 text-white text-center text-sm rounded-lg px-2 py-1.5 border border-gray-600 focus:border-orange-400 outline-none"
                          />
                        </div>
                        {/* Exercise B */}
                        {hasSecondExercise(pair) && (
                          <div className={`flex items-center gap-3 p-2 rounded-lg ${checked[keyB] ? "bg-green-900/30" : "bg-gray-800"}`}>
                            <button onClick={() => toggleCheck(keyB)} className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${checked[keyB] ? "bg-green-500 border-green-500" : "border-gray-600"}`}>
                              {checked[keyB] && <span className="text-white text-xs">✓</span>}
                            </button>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div className={`font-semibold text-sm truncate ${checked[keyB] ? "line-through text-gray-500" : "text-white"}`} title={pair.b}>
                                B: {pair.b}
                              </div>
                              {lastWeightB != null && lastWeightB !== "" && (
                                <div className="text-xs text-gray-500 mt-0.5">Last: {lastWeightB} kg</div>
                              )}
                            </div>
                            <input
                              type="text"
                              placeholder="kg"
                              value={weights[keyB] || ""}
                              onChange={e => setWeight(keyB, e.target.value)}
                              className="w-12 flex-shrink-0 bg-gray-700 text-white text-center text-sm rounded-lg px-2 py-1.5 border border-gray-600 focus:border-orange-400 outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Cardio completion after weightlifting sets */}
            {(() => {
              const cardioSessions = day.sessions.filter((s: string) =>
                /Cardio|LISS|HIIT/i.test(s)
              );
              if (cardioSessions.length === 0) return null;
              const cardioRpe = "RPE 7–9";
              
              // Extract time from first cardio session (format: "Evening 6–7pm (Cardio LISS 45')")
              const firstCardio = cardioSessions[0];
              const timeMatch = firstCardio.match(/^([^(]+)/);
              const time = timeMatch ? timeMatch[1].trim() : "";
              
              return (
                <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                  {/* Group Header */}
                  <div className="px-4 py-3 bg-gray-800 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">CARDIO - {time}</div>
                      <div className="text-gray-400 text-xs mt-0.5">
                        {cardioSessions.length} session{cardioSessions.length > 1 ? "s" : ""} · Finish after weights
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-900 ${rpeColor(cardioRpe)}`}>
                      {cardioRpe}
                    </span>
                  </div>

                  {/* Cardio Items */}
                  <div className="divide-y divide-gray-800">
                    {cardioSessions.map((cardioSession: string, ci: number) => {
                      const cardioKey = `${activeDay}-cardio-${ci}`;
                      const cardioDone = checked[cardioKey];

                      // Extract cardio type from inside parentheses (format: "Evening 6–7pm (Cardio LISS 45')")
                      const cardioMatch = cardioSession.match(/\(([^)]+)\)/);
                      const cardioType = cardioMatch ? cardioMatch[1].trim() : cardioSession;
                      
                      // Determine if HIIT or LISS and create instruction note
                      const isHIIT = /HIIT/i.test(cardioType);
                      const isLISS = /LISS/i.test(cardioType);
                      const durationMatch = cardioType.match(/(\d+)/);
                      const duration = durationMatch ? durationMatch[1] : "";
                      
                      let instructionNote = "";
                      if (isHIIT) {
                        instructionNote = `HIIT — 8–10 × 30s (50% HRmax) & 60s (95% HRmax)`;
                      } else if (isLISS) {
                        instructionNote = `LISS — ${duration}' at 60-70% HRmax continuous`;
                      } else {
                        instructionNote = cardioType;
                      }

                      return (
                        <div key={ci} className="px-4 py-3">
                          <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5 whitespace-nowrap overflow-hidden">
                            <span className="text-gray-500 flex-shrink-0">•</span>
                            <span className="truncate">{instructionNote}</span>
                          </p>
                          <div className={`flex items-center gap-3 p-2 rounded-lg ${cardioDone ? "bg-green-900/30" : "bg-gray-800"}`}>
                            <button
                              onClick={() => toggleCheck(cardioKey)}
                              className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                cardioDone ? "bg-green-500 border-green-500" : "border-gray-600"
                              }`}
                            >
                              {cardioDone && <span className="text-white text-xs">✓</span>}
                            </button>
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                              <div
                                className={`font-semibold text-sm truncate ${
                                  cardioDone ? "line-through text-gray-500" : "text-white"
                                }`}
                                title={cardioSession}
                              >
                                ❤️‍🔥 {cardioType}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* RPE Guide */}
        {day.groups.length > 0 && (
          <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
            <div className="text-sm font-bold text-gray-300 mb-3">📊 RPE Guide</div>
            <div className="space-y-2">
              {[
                { rpe: "RPE 7", color: "bg-green-500", desc: "3 reps left — warm up sets, early sets" },
                { rpe: "RPE 8", color: "bg-yellow-500", desc: "2 reps left — most working sets" },
                { rpe: "RPE 9", color: "bg-orange-500", desc: "1 rep left — last set only" },
                { rpe: "RPE 10", color: "bg-red-500", desc: "Failure — isolation only, never compound" },
              ].map((r: { rpe: string; color: string; desc: string }) => (
                <div key={r.rpe} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.color}`} />
                  <span className="text-white text-xs font-bold w-14">{r.rpe}</span>
                  <span className="text-gray-400 text-xs">{r.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
