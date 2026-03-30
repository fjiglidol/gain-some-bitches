// WorkoutWidget.js — Scriptable Home Screen Widget
// Shows today's recommended session at a glance
// Tap to open WorkoutEngine for logging
// Add as Scriptable widget: long-press home screen → add widget → Scriptable

const fm = FileManager.iCloud();
const baseDir = fm.documentsDirectory();
const programmeFile = fm.joinPath(baseDir, "programme.json");

if (!fm.isFileDownloaded(programmeFile)) {
  await fm.downloadFileFromiCloud(programmeFile);
}

const programme = JSON.parse(fm.readString(programmeFile));

// Map day of week (0=Sun) to recommended session
const dayMap = {
  1: "push_a",   // Monday
  2: "pull_a",   // Tuesday
  3: "legs_core", // Wednesday
  4: "cardio_day", // Thursday
  5: "push_b",   // Friday
  6: "pull_b",   // Saturday
  0: "day_7"     // Sunday
};

const today = new Date();
const dayOfWeek = today.getDay();
const sessionKey = dayMap[dayOfWeek];
const session = programme.sessions[sessionKey];

// Week number in programme
const startDate = new Date("2026-03-25");
const msPerWeek = 7 * 24 * 60 * 60 * 1000;
const weekNum = Math.min(8, Math.max(1, Math.ceil((today - startDate) / msPerWeek + 0.01)));

// Deload check
const isDeload = weekNum === 7;

// Colors
const bgColor = new Color("#1a1a2e");
const accentColor = new Color("#e94560");
const textColor = new Color("#eaeaea");
const subtleColor = new Color("#8a8a9a");

// Build widget
const widget = new ListWidget();
widget.backgroundColor = bgColor;
widget.setPadding(12, 14, 12, 14);

// Tap action: open WorkoutEngine
widget.url = "scriptable:///run/WorkoutEngine";

// Header row
const headerStack = widget.addStack();
headerStack.layoutHorizontally();
headerStack.centerAlignContent();

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const dayLabel = headerStack.addText(dayNames[dayOfWeek]);
dayLabel.font = Font.boldSystemFont(11);
dayLabel.textColor = accentColor;

headerStack.addSpacer();

const weekLabel = headerStack.addText(isDeload ? "DELOAD WK" : "WEEK " + weekNum + "/8");
weekLabel.font = Font.mediumSystemFont(10);
weekLabel.textColor = subtleColor;

widget.addSpacer(4);

// Session title
const label = session.label || sessionKey;
const shortLabel = label.replace(/Day \d+ — /, "");
const titleText = widget.addText(shortLabel);
titleText.font = Font.boldSystemFont(16);
titleText.textColor = textColor;
titleText.lineLimit = 1;

widget.addSpacer(2);

// Duration
const dur = session.estimated_duration_minutes;
if (dur) {
  const durText = widget.addText("~" + dur + " min");
  durText.font = Font.mediumSystemFont(11);
  durText.textColor = subtleColor;
}

widget.addSpacer(6);

// Exercise list (compact)
let exerciseList = [];
if (session.exercises) {
  exerciseList = session.exercises;
} else if (session.structure) {
  // Cardio day
  exerciseList = [
    { name: "Intervals", reps: "20 min" },
    { name: "Steady State", reps: "20 min" },
    { name: "Core Circuit", reps: "10 min" }
  ];
} else if (session.options) {
  exerciseList = session.options.map(function(o) {
    return { name: o.option, reps: o.duration_minutes ? o.duration_minutes + " min" : "" };
  });
}

// Show up to 6 exercises (widget space is limited)
const maxShow = config.widgetFamily === "large" ? 12 : 6;
const showList = exerciseList.slice(0, maxShow);

for (let i = 0; i < showList.length; i++) {
  const ex = showList[i];
  const row = widget.addStack();
  row.layoutHorizontally();
  row.spacing = 4;

  const num = row.addText((i + 1) + ".");
  num.font = Font.monospacedSystemFont(10);
  num.textColor = subtleColor;
  num.lineLimit = 1;

  const nameStr = ex.name;
  const nameTxt = row.addText(nameStr);
  nameTxt.font = Font.mediumSystemFont(10);
  nameTxt.textColor = textColor;
  nameTxt.lineLimit = 1;

  row.addSpacer();

  const setsReps = (ex.sets || "") + "x" + (ex.reps || "");
  if (setsReps !== "x") {
    const srTxt = row.addText(setsReps);
    srTxt.font = Font.monospacedSystemFont(9);
    srTxt.textColor = subtleColor;
    srTxt.lineLimit = 1;
  }
}

if (exerciseList.length > maxShow) {
  const moreText = widget.addText("+" + (exerciseList.length - maxShow) + " more");
  moreText.font = Font.mediumSystemFont(9);
  moreText.textColor = subtleColor;
}

widget.addSpacer();

// Footer
const footer = widget.addStack();
footer.layoutHorizontally();
const tapText = footer.addText("Tap to log");
tapText.font = Font.mediumSystemFont(9);
tapText.textColor = accentColor;

if (isDeload) {
  footer.addSpacer();
  const deloadText = footer.addText("50% load this week");
  deloadText.font = Font.mediumSystemFont(9);
  deloadText.textColor = new Color("#ffa500");
}

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();
