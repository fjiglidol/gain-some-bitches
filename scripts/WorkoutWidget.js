// WorkoutWidget.js — Scriptable Home Screen Widget
// Shows today's session at a glance. Tap to open the PWA.
// Setup: Copy to iCloud Drive/Scriptable/, add as Scriptable widget on home screen.
// Also copy programme.json to iCloud Drive/Scriptable/ for exercise data.

const APP_URL = "https://fjiglidol.github.io/gain-some-bitches/";

// ── Schedule (matches the app) ──
const DAY_TO_SESSION = {
  1: "push_b",     // Mon
  2: "pull_b",     // Tue
  3: "cardio_day", // Wed
  4: "day_7",      // Thu — Rest
  5: "legs_core",  // Fri
  6: "push_a",     // Sat — Heavy Push
  0: "pull_a",     // Sun — Heavy Pull
};

const SESSION_LABELS = {
  push_a:    "Push A (Heavy)",
  pull_a:    "Pull A (Heavy)",
  legs_core: "Legs + Core",
  cardio_day:"Cardio",
  push_b:    "Push B (Pump)",
  pull_b:    "Pull B (Pump)",
  day_7:     "Rest / Recovery",
};

const SESSION_FOCUS = {
  push_a:    "Strength",
  pull_a:    "Strength",
  legs_core: "Lower Body",
  cardio_day:"Conditioning",
  push_b:    "Hypertrophy",
  pull_b:    "Hypertrophy",
  day_7:     "Recovery",
};

const SESSION_DURATION = {
  push_a: 75, pull_a: 75, legs_core: 80,
  cardio_day: 55, push_b: 65, pull_b: 65, day_7: 30,
};

// ── Programme timing ──
const PROGRAMME_START = new Date("2026-03-25");
const today = new Date();
const msPerWeek = 7 * 24 * 60 * 60 * 1000;
const weekNum = Math.min(8, Math.max(1, Math.ceil((today - PROGRAMME_START) / msPerWeek + 0.01)));
const isDeload = weekNum === 7;

const dayOfWeek = today.getDay();
const sessionKey = DAY_TO_SESSION[dayOfWeek];
const label = SESSION_LABELS[sessionKey] || sessionKey;
const focus = SESSION_FOCUS[sessionKey] || "";
const duration = SESSION_DURATION[sessionKey] || 60;

// ── Try to load exercises from programme.json ──
let exercises = [];
try {
  const fm = FileManager.iCloud();
  const pFile = fm.joinPath(fm.documentsDirectory(), "programme.json");
  if (fm.fileExists(pFile)) {
    if (!fm.isFileDownloaded(pFile)) await fm.downloadFileFromiCloud(pFile);
    const prog = JSON.parse(fm.readString(pFile));
    const sess = prog.sessions[sessionKey];
    if (sess && sess.exercises) {
      exercises = sess.exercises;
    } else if (sess && sess.structure) {
      exercises = [
        { name: "Intervals", sets: "", reps: "20 min" },
        { name: "Steady State", sets: "", reps: "20 min" },
        { name: "Core Circuit", sets: "", reps: "10 min" },
      ];
    } else if (sess && sess.options) {
      exercises = sess.options.map(function(o) {
        return { name: o.option, sets: "", reps: o.duration_minutes ? o.duration_minutes + "m" : "" };
      });
    }
  }
} catch (e) {
  // No programme file — widget still works, just no exercise list
}

// ── Colors ──
const bg = new Color("#0a0a0a");
const violet = new Color("#8b5cf6");
const emerald = new Color("#34d399");
const white = new Color("#f0f0f0");
const muted = new Color("#6b7280");
const amber = new Color("#f59e0b");

// ── Build Widget ──
const w = new ListWidget();
w.backgroundColor = bg;
w.setPadding(14, 16, 14, 16);
w.url = APP_URL;

// Header: day + week
const header = w.addStack();
header.layoutHorizontally();
header.centerAlignContent();

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const dayText = header.addText(dayNames[dayOfWeek]);
dayText.font = Font.boldSystemFont(11);
dayText.textColor = violet;

header.addSpacer(6);

const focusBadge = header.addText(focus.toUpperCase());
focusBadge.font = Font.boldSystemFont(9);
focusBadge.textColor = emerald;

header.addSpacer();

const weekText = header.addText(isDeload ? "DELOAD" : "WK " + weekNum + "/8");
weekText.font = Font.mediumSystemFont(10);
weekText.textColor = isDeload ? amber : muted;

w.addSpacer(6);

// Session name
const title = w.addText(label);
title.font = Font.boldSystemFont(18);
title.textColor = white;
title.lineLimit = 1;

w.addSpacer(2);

// Duration
const durText = w.addText("~" + duration + " min");
durText.font = Font.mediumSystemFont(11);
durText.textColor = muted;

w.addSpacer(8);

// Exercise list
const maxShow = config.widgetFamily === "large" ? 10 : 5;
const showList = exercises.slice(0, maxShow);

for (let i = 0; i < showList.length; i++) {
  const ex = showList[i];
  if (!ex) continue;
  const exName = String(ex.name || ex.option || "Exercise");
  const row = w.addStack();
  row.layoutHorizontally();
  row.spacing = 4;

  const num = row.addText(String(i + 1) + ".");
  num.font = Font.monospacedSystemFont(10);
  num.textColor = muted;
  num.lineLimit = 1;

  const nameTxt = row.addText(exName);
  nameTxt.font = Font.mediumSystemFont(10);
  nameTxt.textColor = white;
  nameTxt.lineLimit = 1;

  row.addSpacer();

  const sets = ex.sets != null ? String(ex.sets) : "";
  const reps = ex.reps != null ? String(ex.reps) : "";
  const sr = sets + (sets && reps ? "×" : "") + reps;
  if (sr) {
    const srText = row.addText(sr);
    srText.font = Font.monospacedSystemFont(9);
    srText.textColor = muted;
    srText.lineLimit = 1;
  }
}

if (exercises.length > maxShow) {
  const more = w.addText("+" + (exercises.length - maxShow) + " more");
  more.font = Font.mediumSystemFont(9);
  more.textColor = muted;
}

w.addSpacer();

// Footer
const foot = w.addStack();
foot.layoutHorizontally();
const tap = foot.addText("Tap to open");
tap.font = Font.mediumSystemFont(9);
tap.textColor = violet;

if (isDeload) {
  foot.addSpacer();
  const dl = foot.addText("50% load this week");
  dl.font = Font.mediumSystemFont(9);
  dl.textColor = amber;
}

if (config.runsInWidget) {
  Script.setWidget(w);
} else {
  await w.presentMedium();
}

Script.complete();
