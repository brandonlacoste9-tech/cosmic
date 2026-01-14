import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createHmac, timingSafeEqual } from 'crypto';
import { runCommand } from './AppEnforcer.js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// ... (imports)

// Load .env from backend directory explicitly
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.HMAC_SECRET;

// Frontend Build Path
const FRONTEND_PATH = path.join(__dirname, '../quantum-canvas/apps/quantum-canvas/dist');

if (!SECRET) {
    console.error("❌ FATAL: HMAC_SECRET Not Found. Check backend/.env");
    process.exit(1);
}

app.use(cors());

// We need the raw body to verify the HMAC signature accurately
app.use(bodyParser.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

// Serve Static Frontend
app.use(express.static(FRONTEND_PATH));

// HMAC MIDDLEWARE: The Gatekeeper
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();

  const signature = req.headers['x-hmac-signature'];
  if (!signature) {
      console.warn(`[SECURITY] Rejected request without signature.`);
      return res.status(401).json({ error: "No Signature" });
  }

  const hmac = createHmac('sha256', SECRET);
  const digest = hmac.update(req.rawBody).digest('hex');

  // Use timingSafeEqual to prevent timing attacks
  if (signature.length !== digest.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    console.warn(`[SECURITY] Invalid Signature detected.`);
    return res.status(401).json({ error: "Invalid Signature" });
  }
  next();
});

app.post('/api/enforce', async (req, res) => {
  // ... (handler logic)
    try {
    const { command, parameters } = req.body;
    console.log(`📡 [SECURE BRIDGE] Authenticated Directive: ${command}`);
    const result = await runCommand(command, parameters);
    res.json(result);
  } catch (err) {
    console.error(`❌ Execution Failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback for non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🔥 Monolith Server active on port ${PORT}`);
    console.log(`   - Neural Bridge: /api/enforce`);
    console.log(`   - Quantum Canvas: http://localhost:${PORT}`);
});
