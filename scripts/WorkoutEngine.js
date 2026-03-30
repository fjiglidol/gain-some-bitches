// WorkoutEngine.js — Scriptable Workout Logger
// Works with PPL A/B programme (Option C)
// Place in: iCloud Drive/Scriptable/

async function main() {
  const fm = FileManager.iCloud();
  const baseDir = fm.documentsDirectory();
  const programmeFile = fm.joinPath(baseDir, "programme.json");

  // Ensure file is downloaded from iCloud
  if (!fm.isFileDownloaded(programmeFile)) {
    await fm.downloadFileFromiCloud(programmeFile);
  }

  const raw = fm.readString(programmeFile);
  if (!raw) {
    Script.setShortcutOutput("ERROR: Could not read programme.json");
    return;
  }

  const programme = JSON.parse(raw);

  // ── SESSION SELECTION ──────────────────────────────────────

  const sessionKeys = Object.keys(programme.sessions);
  const sessionLabels = sessionKeys.map(k => {
    const s = programme.sessions[k];
    const dur = s.estimated_duration_minutes || "";
    const label = s.label || k;
    return dur ? label + " (~" + dur + " min)" : label;
  });

  const sessionAlert = new Alert();
  sessionAlert.title = "Workout Logger";
  sessionAlert.message = "Which session today?";
  sessionLabels.forEach(l => sessionAlert.addAction(l));
  sessionAlert.addCancelAction("Cancel");
  const sessionIdx = await sessionAlert.presentSheet();

  if (sessionIdx === -1) {
    Script.setShortcutOutput("CANCELLED");
    return;
  }

  const sessionKey = sessionKeys[sessionIdx];
  const session = programme.sessions[sessionKey];

  if (!session) {
    Script.setShortcutOutput("ERROR: No session for key " + sessionKey);
    return;
  }

  // ── COLLECT EXERCISES ──────────────────────────────────────

  let exercises = [];

  if (session.exercises) {
    exercises = session.exercises.slice(); // copy
  } else if (session.structure) {
    // Cardio day — flatten blocks
    const struct = session.structure;
    if (struct.warm_up) {
      exercises.push({
        name: "Warm-up",
        type: "cardio",
        reps: struct.warm_up.duration_minutes + " min",
        sets: 1,
        notes: struct.warm_up.description || ""
      });
    }
    if (struct.block_1_intervals) {
      const outdoor = struct.block_1_intervals.outdoor_option || {};
      const gym = struct.block_1_intervals.gym_option || {};
      exercises.push({
        name: "Intervals: " + (outdoor.exercise || "Run") + " OR " + (gym.exercise || "Machine"),
        type: "cardio",
        reps: struct.block_1_intervals.duration_minutes + " min",
        sets: 1,
        notes: outdoor.protocol || ""
      });
    }
    if (struct.block_2_steady_state) {
      const outdoor = struct.block_2_steady_state.outdoor_option || {};
      exercises.push({
        name: "Steady State: " + (outdoor.exercise || "Easy cardio"),
        type: "cardio",
        reps: struct.block_2_steady_state.duration_minutes + " min",
        sets: 1,
        notes: outdoor.intensity || ""
      });
    }
    if (struct.block_3_core_circuit && struct.block_3_core_circuit.exercises) {
      struct.block_3_core_circuit.exercises.forEach(function(ex) {
        exercises.push({
          name: ex.name,
          type: ex.type || "bodyweight",
          reps: ex.reps ? String(ex.reps) : (ex.duration_seconds + "s"),
          sets: 3,
          notes: ex.notes || "Core circuit"
        });
      });
    }
    if (struct.cool_down) {
      exercises.push({
        name: "Cool-down",
        type: "cardio",
        reps: struct.cool_down.duration_minutes + " min",
        sets: 1,
        notes: struct.cool_down.description || ""
      });
    }
  } else if (session.options) {
    // Rest day
    const optAlert = new Alert();
    optAlert.title = "Rest Day";
    optAlert.message = "What did you do?";
    session.options.forEach(function(o) { optAlert.addAction(o.option); });
    optAlert.addCancelAction("Skip");
    const optIdx = await optAlert.presentSheet();
    if (optIdx >= 0) {
      const opt = session.options[optIdx];
      if (opt.option === "Full Rest") {
        // Nothing to log — just record it
        exercises.push({
          name: "Full Rest",
          type: "cardio",
          reps: "rest day",
          sets: "",
          notes: opt.notes || "Recovery day"
        });
      } else {
        exercises.push({
          name: opt.option + (opt.exercise ? ": " + opt.exercise : ""),
          type: "cardio",
          reps: opt.duration_minutes ? (opt.duration_minutes + " min") : "done",
          sets: 1,
          notes: opt.notes || ""
        });
      }
    }
  }

  // Add post-workout cardio if present
  if (session.post_workout_cardio && session.post_workout_cardio.exercise) {
    const pwc = session.post_workout_cardio;
    exercises.push({
      name: "Post-workout: " + pwc.exercise,
      type: "cardio",
      reps: pwc.duration_minutes + " min",
      sets: 1,
      notes: pwc.intensity || pwc.notes || ""
    });
  }

  if (exercises.length === 0) {
    Script.setShortcutOutput("NO_EXERCISES");
    return;
  }

  // ── WORKOUT PREVIEW ────────────────────────────────────────

  const previewAlert = new Alert();
  previewAlert.title = session.label || sessionKey;

  let previewMsg = "";
  let currentSS = null;
  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    if (ex.superset_group) {
      const grp = ex.superset_group.charAt(0);
      if (grp !== currentSS) {
        if (currentSS) previewMsg += "\n";
        previewMsg += "[Superset " + grp + "]\n";
        currentSS = grp;
      }
    } else if (currentSS) {
      currentSS = null;
      previewMsg += "\n";
    }

    const sets = ex.sets || "";
    const reps = ex.reps || (ex.duration_seconds ? (ex.duration_seconds + "s") : "");
    previewMsg += (i + 1) + ". " + ex.name + " — " + sets + "x" + reps + "\n";
  }

  if (session.estimated_duration_minutes) {
    previewMsg += "\nEstimated: ~" + session.estimated_duration_minutes + " min";
  }

  previewAlert.message = previewMsg;
  previewAlert.addAction("Start Logging");
  previewAlert.addCancelAction("Just Viewing");
  const startChoice = await previewAlert.presentAlert();

  if (startChoice === -1) {
    Script.setShortcutOutput("VIEWED_ONLY");
    return;
  }

  // ── LOG EACH EXERCISE ──────────────────────────────────────

  const now = new Date();
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");
  const dy = String(now.getDate()).padStart(2, "0");
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dateCSV = yr + "-" + mo + "-" + dy + " (" + dayNames[now.getDay()] + ")";
  const startTime = String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");

  const loggedEntries = [];

  for (let i = 0; i < exercises.length; i++) {
    const ex = exercises[i];
    const exAlert = new Alert();

    const ssLabel = ex.superset_group ? " [" + ex.superset_group + "]" : "";
    exAlert.title = (i + 1) + "/" + exercises.length + ": " + ex.name + ssLabel;

    const targetSets = ex.sets || "";
    const targetReps = ex.reps || (ex.duration_seconds ? (ex.duration_seconds + "s") : "");
    exAlert.message = "Target: " + targetSets + " x " + targetReps;
    if (ex.notes) exAlert.message += "\n" + ex.notes;

    if (ex.type === "weight") {
      exAlert.addTextField("Weight (kg)", "");
      exAlert.addTextField("Sets completed", String(targetSets));
      exAlert.addTextField("Reps achieved", String(targetReps));
      exAlert.addTextField("Notes (optional)", "");
    } else if (ex.type === "timed") {
      exAlert.addTextField("Duration achieved", String(targetReps));
      exAlert.addTextField("Sets completed", String(targetSets));
      exAlert.addTextField("Notes (optional)", "");
    } else if (ex.type === "cardio") {
      exAlert.addTextField("Duration", String(targetReps));
      exAlert.addTextField("Notes (optional)", "");
    } else {
      exAlert.addTextField("Sets completed", String(targetSets));
      exAlert.addTextField("Reps achieved", String(targetReps));
      exAlert.addTextField("Notes (optional)", "");
    }

    exAlert.addAction("Log");
    exAlert.addAction("Skip");
    exAlert.addCancelAction("Done (stop here)");

    const choice = await exAlert.presentAlert();
    if (choice === -1) break;
    if (choice === 1) continue;

    let entry = { name: ex.name, weight: "", sets: "", reps: "", notes: "" };

    if (ex.type === "weight") {
      entry.weight = exAlert.textFieldValue(0);
      entry.sets = exAlert.textFieldValue(1);
      entry.reps = exAlert.textFieldValue(2);
      entry.notes = exAlert.textFieldValue(3);
    } else if (ex.type === "timed") {
      entry.reps = exAlert.textFieldValue(0);
      entry.sets = exAlert.textFieldValue(1);
      entry.notes = exAlert.textFieldValue(2);
    } else if (ex.type === "cardio") {
      entry.reps = exAlert.textFieldValue(0);
      entry.notes = exAlert.textFieldValue(1);
    } else {
      entry.sets = exAlert.textFieldValue(0);
      entry.reps = exAlert.textFieldValue(1);
      entry.notes = exAlert.textFieldValue(2);
    }

    loggedEntries.push(entry);
  }

  // ── FORMAT CSV ─────────────────────────────────────────────

  const endNow = new Date();
  const endTime = String(endNow.getHours()).padStart(2, "0") + ":" + String(endNow.getMinutes()).padStart(2, "0");

  if (loggedEntries.length === 0) {
    Script.setShortcutOutput("NO_DATA");
    return;
  }

  // Clean session label for CSV
  const sessionTypeCSV = session.label
    ? session.label.replace(/Day \d+ — /, "").split(" (")[0].trim()
    : sessionKey;

  const csvRows = loggedEntries.map(function(e) {
    let notes = (e.notes || "").replace(/"/g, '""');
    if (notes.indexOf(",") >= 0) notes = '"' + notes + '"';
    return [dateCSV, sessionTypeCSV, e.name, e.weight, e.sets, e.reps, notes].join(",");
  });

  const metaRow = [dateCSV, sessionTypeCSV, "SESSION_META", "", "", "", "Session " + startTime + "-" + endTime].join(",");
  const output = csvRows.join("\n") + "\n" + metaRow;

  // ── SUMMARY ────────────────────────────────────────────────

  const durationMin = Math.round((endNow - now) / 60000);
  const summaryAlert = new Alert();
  summaryAlert.title = "Workout Complete";
  summaryAlert.message = loggedEntries.length + " exercises logged\nDuration: " + durationMin + " min (" + startTime + " - " + endTime + ")\nSession: " + sessionTypeCSV;
  summaryAlert.addAction("Save");
  summaryAlert.addCancelAction("Discard");
  const saveChoice = await summaryAlert.presentAlert();

  if (saveChoice === -1) {
    Script.setShortcutOutput("DISCARDED");
    return;
  }

  Script.setShortcutOutput(output);
}

await main();
Script.complete();
