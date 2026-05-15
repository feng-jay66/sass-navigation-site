import { dbPath, initializeDatabase } from './db.js';

try {
  const db = initializeDatabase();
  const summary = {
    database: dbPath,
    adminUsers: db.prepare('SELECT COUNT(*) AS count FROM admin_user').get().count,
    categories: db.prepare('SELECT COUNT(*) AS count FROM nav_category').get().count,
    tags: db.prepare('SELECT COUNT(*) AS count FROM nav_tag').get().count,
    links: db.prepare('SELECT COUNT(*) AS count FROM nav_link').get().count,
    announcements: db.prepare('SELECT COUNT(*) AS count FROM announcement').get().count,
    friendLinks: db.prepare('SELECT COUNT(*) AS count FROM friend_link').get().count,
    settings: db.prepare('SELECT COUNT(*) AS count FROM site_setting').get().count
  };

  console.log('Database initialized successfully.');
  console.log(JSON.stringify(summary, null, 2));
  db.close();
} catch (error) {
  console.error('Database initialization failed.');
  console.error(error);
  process.exitCode = 1;
}
