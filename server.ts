import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDB } from './server/config/db';
import apiRouter from './server/routes/api';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true });

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Connect to DB before accepting traffic
  try {
    const connected = await connectDB();
    if (!connected && isProduction && process.env.ALLOW_LOCAL_FALLBACK !== 'true') {
      console.error('FATAL: Could not connect to MongoDB Atlas in production. Halting startup.');
      process.exit(1);
    }
  } catch (err: any) {
    console.error('⚠️ Database initial connection warning:', err.message);
    if (isProduction && process.env.ALLOW_LOCAL_FALLBACK !== 'true') {
      process.exit(1);
    }
  }

  // Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // API Routes
  app.use('/api', apiRouter);

  if (!isProduction) {
    // Vite Dev Server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    // Production static file serving
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EventHub server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
