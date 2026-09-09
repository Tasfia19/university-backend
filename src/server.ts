import app from './app';
import { config } from './config';
import prisma from './services/db';

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL Database via Prisma ORM');

    const server = app.listen(config.port, () => {
      console.log(`🚀 University Management System Server running on http://localhost:${config.port}`);
    });

    const exitHandler = () => {
      if (server) {
        server.close(async () => {
          console.log('Server closed');
          await prisma.$disconnect();
          process.exit(0);
        });
      } else {
        process.exit(0);
      }
    };

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      exitHandler();
    });

    process.on('unhandledRejection', (error) => {
      console.error('Unhandled Rejection:', error);
      exitHandler();
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received');
      exitHandler();
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
