// LiftOff.js — Scriptable launcher for LiftOff workout tracker
// Opens the web app served from your Mac on the same network
// Place in: iCloud Drive/Scriptable/

// ── CONFIGURATION ──────────────────────────────────────
// Set this to your Mac's local IP address (find it in System Settings > Wi-Fi > Details)
// Or use the hostname if Bonjour is working: "http://keifs-macbook.local:3000"
const SERVER_URL = "http://192.168.1.XXX:3000";
// ───────────────────────────────────────────────────────

async function main() {
  // Try to reach the server first
  const req = new Request(SERVER_URL);
  req.timeoutInterval = 5;

  try {
    await req.load();
    // Server is reachable — open in Safari
    Safari.open(SERVER_URL);
  } catch (e) {
    // Server not reachable
    const alert = new Alert();
    alert.title = "LiftOff";
    alert.message = "Can't reach the server at " + SERVER_URL + "\n\nMake sure:\n1. Your Mac is running (npm start)\n2. Both devices are on the same Wi-Fi\n3. The IP address is correct";
    alert.addAction("Open Settings");
    alert.addCancelAction("OK");
    const choice = await alert.presentAlert();

    if (choice === 0) {
      // Let user update the IP
      const ipAlert = new Alert();
      ipAlert.title = "Update Server IP";
      ipAlert.message = "Enter your Mac's local IP address:";
      ipAlert.addTextField("IP Address", SERVER_URL.replace("http://", "").replace(":3000", ""));
      ipAlert.addAction("Save & Open");
      ipAlert.addCancelAction("Cancel");
      const ipChoice = await ipAlert.presentAlert();

      if (ipChoice === 0) {
        const newIP = ipAlert.textFieldValue(0);
        const newURL = "http://" + newIP + ":3000";
        Safari.open(newURL);
      }
    }
  }
}

await main();
Script.complete();
