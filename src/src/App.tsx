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
          { a: "Cable Fly", b: "Lat Pulldown", reps: "12–15", rest: "45s after pair" },
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
        name: "COMPOUND — Shoulders",
        sets: 3,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Overhead Press", b: "—", reps: "8–10", rest: "90s" },
        ]
      },
      {
        name: "SUPERSET A — Shoulders / Biceps",
        sets: 2,
        rpe: "RPE 8",
        pairs: [
          { a: "Lateral Raise", b: "Barbell Curl", reps: "12–15", rest: "45s after pair" },
          { a: "Rear Delt Fly", b: "Hammer Curl", reps: "12–15", rest: "45s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Triceps / Biceps",
        sets: 2,
        rpe: "RPE 8–9",
        pairs: [
          { a: "Tricep Pushdown", b: "Incline DB Curl", reps: "12–15", rest: "45s after pair" },
          { a: "Skull Crusher", b: "Cable Curl", reps: "10–12", rest: "45s after pair" },
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
          { a: "Leg Curl", b: "Hip Thrust", reps: "12–15", rest: "45s after pair" },
        ]
      },
      {
        name: "FINISHER — Calves (slow eccentric 3s down)",
        sets: 3,
        rpe: "RPE 9",
        pairs: [
          { a: "Standing Calf Raise", b: "Seated Calf Raise", reps: "15–20", rest: "30s after pair" },
        ]
      }
    ]
  },
  "Thursday": {
    label: "REST DAY",
    emoji: "😴",
    note: "Full recovery — muscles grow today, not in the gym",
    sessions: ["Light walk 20–30' if desired"],
    groups: []
  },
  "Friday": {
    label: "Chest + Shoulders + Triceps",
    emoji: "🫁💪",
    note: "Push day — all pressing muscles together, high intensity",
    sessions: ["Noon 12–1pm", "Evening 6–7pm (Cardio HIIT 30')"],
    groups: [
      {
        name: "SUPERSET A — Chest / Shoulders",
        sets: 3,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Incline Bench Press", b: "Overhead Press", reps: "8–10", rest: "60s after pair" },
        ]
      },
      {
        name: "SUPERSET B — Chest / Shoulders Isolation",
        sets: 2,
        rpe: "RPE 8",
        pairs: [
          { a: "Pec Deck / Cable Fly", b: "Lateral Raise", reps: "12–15", rest: "45s after pair" },
          { a: "Dips", b: "Front Raise", reps: "10–12", rest: "45s after pair" },
        ]
      },
      {
        name: "SUPERSET C — Triceps (drop set last set)",
        sets: 2,
        rpe: "RPE 8→9",
        pairs: [
          { a: "Overhead Tricep Ext.", b: "Tricep Pushdown", reps: "10–12 → drop → failure", rest: "45s after pair" },
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
    label: "Back + Biceps + Rear Delt",
    emoji: "🔙💪",
    note: "Pull day at gym — all pulling muscles, superset for max pump",
    sessions: ["Gym 50–60'", "Evening 6–7pm (Cardio LISS 45') optional"],
    groups: [
      {
        name: "COMPOUND — Back",
        sets: 3,
        rpe: "RPE 7–8",
        pairs: [
          { a: "Deadlift / Rack Pull", b: "—", reps: "6–8", rest: "120s" },
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
        if (pair.b !== "—") map[`${day}-${gi}-${pi}-B`] = pair.b;
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
  lines.push("Plan: 5-day split — Mon Chest+Back+Abs, Tue Shoulders+Arms, Wed Legs+Glutes+Calves, Thu Rest, Fri Chest+Shoulders+Triceps, Sat Back+Biceps+Rear Delt, Sun Active recovery.");
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
          if (pair.b !== "—") {
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
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 flex-shrink-0">
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
          {copied && (
            <span className="text-green-400 text-sm">Copied to clipboard</span>
          )}
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-gray-900 border-b border-gray-800">
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

      {/* Day Selector */}
      <div className="flex overflow-x-auto gap-2 px-3 py-3 bg-gray-900 border-b border-gray-800">
        {days.map((d: string) => {
          const isRest = plan[d].groups.length === 0;
          return (
            <button
              key={d}
              onClick={() => setActiveDay(d)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeDay === d
                  ? "bg-orange-500 text-white"
                  : isRest
                  ? "bg-gray-800 text-gray-500"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              {d.slice(0,3)}
            </button>
          );
        })}
      </div>

      {/* Day Header */}
      <div className="px-4 py-4 bg-gray-900 border-b border-gray-800 flex-shrink-0">
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
          {day.sessions.map((s: string, i: number) => {
            const isCardio = /Cardio|LISS|HIIT/i.test(s);
            const key = `${activeDay}-session-${i}`;
            const done = checked[key];
            return (
              <li key={i} className="flex items-center gap-2">
                <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                  {isCardio ? "❤️‍🔥" : "⏰"} {s}
                </span>
                {isCardio && (
                  <button
                    type="button"
                    onClick={() => toggleCheck(key)}
                    className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                      done ? "bg-green-500 border-green-500" : "border-gray-600"
                    }`}
                    aria-label="Mark cardio session complete"
                  >
                    {done && <span className="text-white text-xs">✓</span>}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {/* Workout Groups */}
      <div className="px-4 py-4 space-y-6 flex-1">
        {day.groups.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">{day.emoji}</div>
            <div className="text-xl font-bold text-gray-300">{day.label}</div>
            <div className="text-gray-500 mt-2">{day.note}</div>
          </div>
        ) : (
          day.groups.map((g: ExerciseGroup, gi: number) => (
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
                  const setLabel = pair.b !== "—" ? "⚡ Superset" : "🏋️ Straight Set";
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
                            {pair.b !== "—" ? "A: " : ""}{pair.a}
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
                      {pair.b !== "—" && (
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
          ))
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