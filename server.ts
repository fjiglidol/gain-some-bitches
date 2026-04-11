import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Server as OscServer } from 'node-osc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const ICLOUD_SHORTCUTS_DIR = path.join(
  os.homedir(),
  'Library/Mobile Documents/iCloud~is~workflow~my~workflows/Documents'
);
const CSV_FILE = path.join(ICLOUD_SHORTCUTS_DIR, 'Workout_History.csv');
const LOCAL_CSV = path.join(__dirname, 'data', 'Workout_History.csv');
const CSV_HEADER = 'Date,Session_Type,Exercise,Weight_kg,Sets,Reps,Notes';

function appendToCSV(filePath: string, newRows: string) {
  if (fs.existsSync(filePath)) {
    let existing = fs.readFileSync(filePath, 'utf-8');
    if (!existing.endsWith('\n')) existing += '\n';
    fs.writeFileSync(filePath, existing + newRows, 'utf-8');
  } else {
    // Ensure parent directory exists
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, CSV_HEADER + '\n' + newRows, 'utf-8');
  }
}

app.post('/api/save-workout', (req, res) => {
  const { csv } = req.body;
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Missing csv data' });
  }

  const lines = csv.split('\n').filter((l: string) => l.trim() !== '' && l !== CSV_HEADER);
  if (lines.length === 0) {
    return res.status(400).json({ error: 'No data rows' });
  }

  const newRows = lines.join('\n') + '\n';

  try {
    // Save to iCloud Shortcuts folder
    if (fs.existsSync(ICLOUD_SHORTCUTS_DIR)) {
      appendToCSV(CSV_FILE, newRows);
      console.log(`Appended ${lines.length} rows to iCloud: ${CSV_FILE}`);
    } else {
      console.warn('iCloud Shortcuts folder not found, saving locally only');
    }

    // Always save a local copy for redundancy
    appendToCSV(LOCAL_CSV, newRows);
    console.log(`Appended ${lines.length} rows to local: ${LOCAL_CSV}`);

    res.json({ ok: true, rows: lines.length });
  } catch (err: any) {
    console.error('Save error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get workout history
app.get('/api/history', (_req, res) => {
  try {
    const csvPath = fs.existsSync(CSV_FILE) ? CSV_FILE : LOCAL_CSV;
    if (!fs.existsSync(csvPath)) {
      return res.json({ sessions: [] });
    }
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim() !== '');
    if (lines.length <= 1) return res.json({ sessions: [] });

    // Parse CSV rows (skip header), group by date+session
    const rows = lines.slice(1).map(line => {
      // Handle quoted CSV fields
      const fields: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { fields.push(current); current = ''; continue; }
        current += ch;
      }
      fields.push(current);
      return {
        date: fields[0] || '',
        sessionType: fields[1] || '',
        exercise: fields[2] || '',
        weight: fields[3] || '',
        sets: fields[4] || '',
        reps: fields[5] || '',
        notes: fields[6] || '',
      };
    });

    // Group by date + sessionType
    const grouped: { [key: string]: typeof rows } = {};
    for (const row of rows) {
      const key = `${row.date}|${row.sessionType}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    // Convert to array sorted by date descending
    const sessions = Object.entries(grouped)
      .map(([key, exercises]) => {
        const [date, sessionType] = key.split('|');
        return { date, sessionType, exercises };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    icloud: fs.existsSync(ICLOUD_SHORTCUTS_DIR),
    csvExists: fs.existsSync(CSV_FILE),
  });
});

const PORT = 3001;
const OSC_PORT = 8001; // iKeleton OSC sends to this port

// ─── HTTP + WebSocket server ─────────────────────────────────────────────────
const httpServer = createServer(app);

const wss = new WebSocketServer({ server: httpServer, path: '/pose-ws' });

const wsClients = new Set<WebSocket>();
wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
  console.log(`[WS] Client connected (${wsClients.size} total)`);
});

function broadcast(msg: string) {
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(msg);
  }
}

// ─── OSC receiver (iKeleton → server → WebSocket → browser) ─────────────────
const oscServer = new OscServer(OSC_PORT, '0.0.0.0', () => {
  console.log(`[OSC] Listening for iKeleton on UDP port ${OSC_PORT}`);
});

oscServer.on('message', (msg) => {
  // msg is [address, ...args]
  // iKeleton sends e.g. ['/pose', count, x0,y0,z0,v0, x1,y1,z1,v1, ...]
  const [address, ...args] = msg;
  broadcast(JSON.stringify({ address, args }));
});

oscServer.on('error', (err: Error) => {
  console.error('[OSC] Error:', err.message);
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`LiftOff API  → http://localhost:${PORT}`);
  console.log(`Pose WS      → ws://localhost:${PORT}/pose-ws`);
  console.log(`iKeleton OSC → UDP port ${OSC_PORT}  (set this in the iOS app)`);
  console.log(`iCloud path  → ${CSV_FILE}`);
  console.log(`Local path   → ${LOCAL_CSV}`);
});
