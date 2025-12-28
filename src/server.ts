// backend/src/server.ts
import { buildApp } from './app';

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    const app = await buildApp();

    await app.listen({ port: PORT, host: HOST });

    console.log(`
🚀 OMNI Platform Backend rodando!

📍 URL: http://localhost:${PORT}
📊 Health: http://localhost:${PORT}/health
📚 API: http://localhost:${PORT}/api/hrm/learning-paths

🔥 Ambiente: ${process.env.NODE_ENV || 'development'}
    `);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

start();
