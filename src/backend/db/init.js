import { getDB } from './index.js';
import fs from 'fs';
import path from 'path';

async function init() {
  try {
    const db = await getDB();
    const schemaPath = path.join('./src/backend/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');

    await db.exec(schema);
    console.log('Database initialized successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
}

init();
