import { createApp } from './app.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const app = createApp();
  app.listen(env.PORT, () => {
    console.log(`AI Web Augmenter API running on port ${env.PORT}`);
  });
}

void bootstrap().catch((error) => {
  console.error('Failed to bootstrap server', error);
  process.exit(1);
});