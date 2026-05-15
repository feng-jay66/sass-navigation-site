import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const dataDir = path.resolve(process.cwd(), 'backend/data');
const dbPath = path.join(dataDir, 'app.db');

const defaultSeedData = {
  admin: {
    username: 'admin',
    password: 'admin123456',
    nickname: '站点管理员'
  },
  settings: [
    {
      setting_key: 'site',
      setting_value: JSON.stringify({
        siteName: 'Sass 导航站',
        siteSubtitle: '收集常用工具、社区与灵感来源',
        logoText: 'SASS NAV',
        description: '一个轻量、可扩展的个人导航站 MVP。',
        theme: 'system',
        icp: '',
        contactEmail: 'admin@example.com'
      }),
      description: '站点基础配置'
    },
    {
      setting_key: 'homepage',
      setting_value: JSON.stringify({
        heroTitle: '发现高效工具与优质资源',
        heroDescription: '整理开发、设计、学习与资讯类导航资源，打造你的专属起始页。',
        footerText: 'Powered by Fastify + Vue + SQLite'
      }),
      description: '首页展示配置'
    }
  ],
  categories: [
    { name: '开发工具', slug: 'dev-tools', icon: '💻', sort_order: 10, description: '代码托管、文档与开发常用工具' },
    { name: '设计灵感', slug: 'design', icon: '🎨', sort_order: 20, description: 'UI、配色与创意参考' },
    { name: '学习成长', slug: 'learning', icon: '📚', sort_order: 30, description: '技术学习与知识沉淀平台' },
    { name: '资讯社区', slug: 'community', icon: '📰', sort_order: 40, description: '前沿资讯与开发者社区' }
  ],
  tags: [
    { name: '推荐', slug: 'recommended', color: '#3b82f6' },
    { name: '常用', slug: 'daily', color: '#10b981' },
    { name: 'AI', slug: 'ai', color: '#8b5cf6' },
    { name: '设计', slug: 'design', color: '#f59e0b' }
  ],
  links: [
    {
      title: 'GitHub',
      url: 'https://github.com',
      description: '全球最大的代码托管与协作平台。',
      category_slug: 'dev-tools',
      tags: ['recommended', 'daily'],
      favicon: 'https://github.com/favicon.ico',
      sort_order: 10,
      is_featured: 1
    },
    {
      title: 'Vite',
      url: 'https://vite.dev',
      description: '新一代前端开发与构建工具。',
      category_slug: 'dev-tools',
      tags: ['daily'],
      favicon: 'https://vite.dev/logo.svg',
      sort_order: 20,
      is_featured: 1
    },
    {
      title: 'Dribbble',
      url: 'https://dribbble.com',
      description: '设计作品展示与灵感社区。',
      category_slug: 'design',
      tags: ['design'],
      favicon: 'https://dribbble.com/favicon.ico',
      sort_order: 10,
      is_featured: 0
    },
    {
      title: 'MDN Web Docs',
      url: 'https://developer.mozilla.org',
      description: '权威 Web 技术文档。',
      category_slug: 'learning',
      tags: ['recommended'],
      favicon: 'https://developer.mozilla.org/favicon-48x48.cbbd161b.png',
      sort_order: 10,
      is_featured: 1
    },
    {
      title: 'Hacker News',
      url: 'https://news.ycombinator.com',
      description: '技术创业与开发者资讯社区。',
      category_slug: 'community',
      tags: ['ai'],
      favicon: 'https://news.ycombinator.com/favicon.ico',
      sort_order: 10,
      is_featured: 0
    }
  ],
  announcements: [
    {
      title: '欢迎使用导航站 MVP',
      content: '后台默认账号为 admin / admin123456，请上线后及时修改密码。',
      is_pinned: 1,
      is_active: 1,
      sort_order: 10
    },
    {
      title: '支持快速扩展',
      content: '当前已内置分类、标签、链接、友链与公告基础数据。',
      is_pinned: 0,
      is_active: 1,
      sort_order: 20
    }
  ],
  friendLinks: [
    {
      name: 'Vue.js',
      url: 'https://vuejs.org',
      description: '渐进式 JavaScript 框架',
      avatar: 'https://vuejs.org/logo.svg',
      sort_order: 10,
      is_active: 1
    },
    {
      name: 'Fastify',
      url: 'https://fastify.dev',
      description: '高性能 Node.js Web 框架',
      avatar: 'https://fastify.dev/img/logos/fastify-black.svg',
      sort_order: 20,
      is_active: 1
    }
  ]
};

function ensureDataDir() {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createConnection() {
  ensureDataDir();
  return new Database(dbPath);
}

function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS admin_user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      last_login_at TEXT,
      last_login_ip TEXT,
      status INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nav_category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nav_link (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      favicon TEXT NOT NULL DEFAULT '',
      cover_image TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      click_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES nav_category(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS nav_tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#3b82f6',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS nav_link_tag (
      link_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (link_id, tag_id),
      FOREIGN KEY (link_id) REFERENCES nav_link(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES nav_tag(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      starts_at TEXT,
      ends_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS site_setting (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT NOT NULL UNIQUE,
      setting_value TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS friend_link (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      avatar TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS visit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      referrer TEXT NOT NULL DEFAULT '',
      ip TEXT NOT NULL DEFAULT '',
      user_agent TEXT NOT NULL DEFAULT '',
      visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_nav_category_sort_order ON nav_category(sort_order);
    CREATE INDEX IF NOT EXISTS idx_nav_link_category_id ON nav_link(category_id);
    CREATE INDEX IF NOT EXISTS idx_nav_link_sort_order ON nav_link(sort_order);
    CREATE INDEX IF NOT EXISTS idx_announcement_active ON announcement(is_active, is_pinned, sort_order);
    CREATE INDEX IF NOT EXISTS idx_friend_link_active ON friend_link(is_active, sort_order);
    CREATE INDEX IF NOT EXISTS idx_visit_log_visited_at ON visit_log(visited_at);
  `);
}

function seedAdminUser(db, admin = defaultSeedData.admin) {
  const existing = db.prepare('SELECT id FROM admin_user WHERE username = ?').get(admin.username);
  if (existing) {
    return existing.id;
  }

  const passwordHash = bcrypt.hashSync(admin.password, 10);
  const result = db
    .prepare(`
      INSERT INTO admin_user (username, password_hash, nickname, status)
      VALUES (?, ?, ?, 1)
    `)
    .run(admin.username, passwordHash, admin.nickname);

  return result.lastInsertRowid;
}

function seedSettings(db, settings = defaultSeedData.settings) {
  const stmt = db.prepare(`
    INSERT INTO site_setting (setting_key, setting_value, description)
    VALUES (@setting_key, @setting_value, @description)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      description = excluded.description,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const setting of settings) {
    stmt.run(setting);
  }
}

function seedCategories(db, categories = defaultSeedData.categories) {
  const stmt = db.prepare(`
    INSERT INTO nav_category (name, slug, icon, sort_order, description, is_visible)
    VALUES (@name, @slug, @icon, @sort_order, @description, 1)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      icon = excluded.icon,
      sort_order = excluded.sort_order,
      description = excluded.description,
      is_visible = 1,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const category of categories) {
    stmt.run(category);
  }
}

function seedTags(db, tags = defaultSeedData.tags) {
  const stmt = db.prepare(`
    INSERT INTO nav_tag (name, slug, color)
    VALUES (@name, @slug, @color)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      color = excluded.color,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const tag of tags) {
    stmt.run(tag);
  }
}

function seedLinks(db, links = defaultSeedData.links) {
  const getCategory = db.prepare('SELECT id FROM nav_category WHERE slug = ?');
  const getTag = db.prepare('SELECT id FROM nav_tag WHERE slug = ?');
  const getLink = db.prepare('SELECT id FROM nav_link WHERE url = ?');
  const insertLink = db.prepare(`
    INSERT INTO nav_link (
      category_id, title, url, description, favicon, sort_order, is_featured, is_visible
    ) VALUES (
      @category_id, @title, @url, @description, @favicon, @sort_order, @is_featured, 1
    )
  `);
  const updateLink = db.prepare(`
    UPDATE nav_link
    SET category_id = @category_id,
        title = @title,
        description = @description,
        favicon = @favicon,
        sort_order = @sort_order,
        is_featured = @is_featured,
        is_visible = 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);
  const clearLinkTags = db.prepare('DELETE FROM nav_link_tag WHERE link_id = ?');
  const insertLinkTag = db.prepare(`
    INSERT OR IGNORE INTO nav_link_tag (link_id, tag_id)
    VALUES (?, ?)
  `);

  for (const link of links) {
    const category = getCategory.get(link.category_slug);
    if (!category) {
      continue;
    }

    const payload = {
      category_id: category.id,
      title: link.title,
      url: link.url,
      description: link.description,
      favicon: link.favicon,
      sort_order: link.sort_order,
      is_featured: link.is_featured
    };

    const existing = getLink.get(link.url);
    const linkId = existing
      ? (updateLink.run({ ...payload, id: existing.id }), existing.id)
      : insertLink.run(payload).lastInsertRowid;

    clearLinkTags.run(linkId);

    for (const tagSlug of link.tags || []) {
      const tag = getTag.get(tagSlug);
      if (tag) {
        insertLinkTag.run(linkId, tag.id);
      }
    }
  }
}

function seedAnnouncements(db, announcements = defaultSeedData.announcements) {
  const getAnnouncement = db.prepare('SELECT id FROM announcement WHERE title = ?');
  const insertAnnouncement = db.prepare(`
    INSERT INTO announcement (title, content, is_pinned, is_active, sort_order)
    VALUES (@title, @content, @is_pinned, @is_active, @sort_order)
  `);
  const updateAnnouncement = db.prepare(`
    UPDATE announcement
    SET content = @content,
        is_pinned = @is_pinned,
        is_active = @is_active,
        sort_order = @sort_order,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  for (const item of announcements) {
    const existing = getAnnouncement.get(item.title);
    if (existing) {
      updateAnnouncement.run({ ...item, id: existing.id });
    } else {
      insertAnnouncement.run(item);
    }
  }
}

function seedFriendLinks(db, friendLinks = defaultSeedData.friendLinks) {
  const getFriendLink = db.prepare('SELECT id FROM friend_link WHERE url = ?');
  const insertFriendLink = db.prepare(`
    INSERT INTO friend_link (name, url, description, avatar, sort_order, is_active)
    VALUES (@name, @url, @description, @avatar, @sort_order, @is_active)
  `);
  const updateFriendLink = db.prepare(`
    UPDATE friend_link
    SET name = @name,
        description = @description,
        avatar = @avatar,
        sort_order = @sort_order,
        is_active = @is_active,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = @id
  `);

  for (const item of friendLinks) {
    const existing = getFriendLink.get(item.url);
    if (existing) {
      updateFriendLink.run({ ...item, id: existing.id });
    } else {
      insertFriendLink.run(item);
    }
  }
}

function initializeDatabase() {
  const db = createConnection();
  createSchema(db);

  const seed = db.transaction(() => {
    seedAdminUser(db);
    seedSettings(db);
    seedCategories(db);
    seedTags(db);
    seedLinks(db);
    seedAnnouncements(db);
    seedFriendLinks(db);
  });

  seed();
  return db;
}

export {
  createConnection,
  createSchema,
  dbPath,
  defaultSeedData,
  initializeDatabase,
  seedAdminUser,
  seedAnnouncements,
  seedCategories,
  seedFriendLinks,
  seedLinks,
  seedSettings,
  seedTags
};
