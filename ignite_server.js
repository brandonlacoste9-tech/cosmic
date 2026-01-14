// ignite_server.js
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { runCommand } from './src/managers/AppEnforcer.js';
import { log } from 'console';

const app = express();
const PORT = process.env.BRIDGE_PORT || 4000;

// Trust Electron’s IPC origin (localhost) so we can cross‑origin
app.use(cors({ origin: '*' })); // Allow all for demo purposes
app.use(bodyParser.json());

// Health check – useful for the dashboard
app.get('/health', (_, res) => res.status(200).json({ up: true }));

// /api/enforce – main command endpoint
app.post('/api/enforce', async (req, res) => {
  const { command, parameters } = req.body;

  console.log(`📡 [NEURAL BRIDGE] Receiving Signal: ${command}`);

  if (!command) {
    return res.status(400).json({ error: 'Missing command' });
  }

  try {
    const result = await runCommand(command, parameters);
    res.json({
      ok: true,
      command,
      ...result,
    });
  } catch (e) {
    log(`ERROR: ${e.message}`);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.listen(PORT, () => {
    console.log(`\n🌉 NEURAL BRIDGE ACTIVE.`);
    console.log(`🔥 ignite_server listening on http://localhost:${PORT}`);
    console.log(`👉 The 3D HUD can now command the machine.`);
});
