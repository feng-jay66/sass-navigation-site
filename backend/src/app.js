import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { initializeDatabase } from './db.js';

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';
const uploadsDir = path.resolve(process.cwd(), 'backend/uploads');
const allowedUploadTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']);
const tokenBlocklist = new Set();

fs.mkdirSync(uploadsDir, { recursive: true });

const db = initializeDatabase();
const app = Fastify({ logger: true });

const nowIso = () => new Date().toISOString();
const sanitizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .trim();
};

const sanitizeNullableText = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return sanitizeText(value);
};

const normalizeInteger = (value, fallback = 0) => {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) ? number : fallback;
};

const normalizeBooleanNumber = (value, fallback = 0) => {
  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  if (value === 'true' || value === '1' || value === 1) {
    return 1;
  }

  if (value === 'false' || value === '0' || value === 0) {
    return 0;
  }

  return fallback;
};

const parseJsonSafe = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const slugify = (value, fallbackPrefix = 'item') => {
  const cleaned = sanitizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return cleaned || `${fallbackPrefix}-${Date.now()}`;
};

const getClientIp = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim().slice(0, 128);
  }
  return sanitizeText(request.ip || '');
};

const logVisit = db.prepare(`
  INSERT INTO visit_log (path, referrer, ip, user_agent, visited_at)
  VALUES (?, ?, ?, ?, ?)
`);

const touchUpdatedAt = (table, id) => {
  db.prepare(`UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(id);
};

app.decorate('db', db);
app.decorate('ok', (reply, data = null, message = 'ok') => reply.send({ code: 0, message, data }));
app.decorate('fail', (reply, statusCode = 400, message = 'Bad Request', data = null) =>
  reply.status(statusCode).send({ code: statusCode, message, data })
);

await app.register(cors, {
  origin: true,
  credentials: true
});

await app.register(jwt, {
  secret: jwtSecret
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1
  }
});


app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
    const authHeader = request.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || tokenBlocklist.has(token) || request.user?.role !== 'admin') {
      return app.fail(reply, 401, 'Unauthorized');
    }
  } catch {
    return app.fail(reply, 401, 'Unauthorized');
  }
});

app.decorate('siteAuthenticate', async (request, reply) => {
  try {
    await request.jwtVerify();
    const authHeader = request.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token || tokenBlocklist.has(token) || request.user?.role !== 'site') {
      return app.fail(reply, 401, 'Unauthorized');
    }
  } catch {
    return app.fail(reply, 401, 'Unauthorized');
  }
});

app.addHook('onRequest', async (request) => {
  if (request.method === 'GET' && request.url.startsWith('/api/site/')) {
    logVisit.run(
      request.routerPath || request.url.split('?')[0],
      sanitizeText(request.headers.referer || ''),
      getClientIp(request),
      sanitizeText(request.headers['user-agent'] || ''),
      nowIso()
    );
  }
});

const getSettingsMap = () => {
  const rows = db.prepare('SELECT setting_key, setting_value, description, updated_at FROM site_setting ORDER BY id ASC').all();
  return rows.reduce((acc, row) => {
    acc[row.setting_key] = {
      key: row.setting_key,
      value: parseJsonSafe(row.setting_value, row.setting_value),
      description: row.description,
      updatedAt: row.updated_at
    };
    return acc;
  }, {});
};

const getTagMapForLinks = () => {
  const rows = db.prepare(`
    SELECT nlt.link_id, nt.id, nt.name, nt.slug, nt.color
    FROM nav_link_tag nlt
    INNER JOIN nav_tag nt ON nt.id = nlt.tag_id
    ORDER BY nt.name ASC
  `).all();

  return rows.reduce((acc, row) => {
    if (!acc[row.link_id]) {
      acc[row.link_id] = [];
    }
    acc[row.link_id].push({
      id: row.id,
      name: row.name,
      slug: row.slug,
      color: row.color
    });
    return acc;
  }, {});
};

const serializeCategory = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description,
  icon: row.icon,
  sortOrder: row.sort_order,
  isVisible: !!row.is_visible,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  linkCount: row.link_count ?? undefined
});

const serializeTag = (row) => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  color: row.color,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  linkCount: row.link_count ?? undefined
});

const serializeAnnouncement = (row) => ({
  id: row.id,
  title: row.title,
  content: row.content,
  isPinned: !!row.is_pinned,
  isActive: !!row.is_active,
  sortOrder: row.sort_order,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const serializeFriendLink = (row) => ({
  id: row.id,
  name: row.name,
  url: row.url,
  description: row.description,
  avatar: row.avatar,
  sortOrder: row.sort_order,
  isActive: !!row.is_active,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const serializeLink = (row, tagsByLinkId = {}) => ({
  id: row.id,
  categoryId: row.category_id,
  categoryName: row.category_name,
  categorySlug: row.category_slug,
  title: row.title,
  url: row.url,
  description: row.description,
  favicon: row.favicon,
  coverImage: row.cover_image,
  sortOrder: row.sort_order,
  isFeatured: !!row.is_featured,
  isVisible: !!row.is_visible,
  clickCount: row.click_count,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  tags: tagsByLinkId[row.id] || []
});

const listCategories = () =>
  db.prepare(`
    SELECT c.*, COUNT(l.id) AS link_count
    FROM nav_category c
    LEFT JOIN nav_link l ON l.category_id = c.id
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.id ASC
  `).all();

const listTags = () =>
  db.prepare(`
    SELECT t.*, COUNT(lt.link_id) AS link_count
    FROM nav_tag t
    LEFT JOIN nav_link_tag lt ON lt.tag_id = t.id
    GROUP BY t.id
    ORDER BY t.name ASC, t.id ASC
  `).all();

const listLinks = (whereSql = '', params = []) => {
  const tagsByLinkId = getTagMapForLinks();
  const rows = db.prepare(`
    SELECT l.*, c.name AS category_name, c.slug AS category_slug
    FROM nav_link l
    INNER JOIN nav_category c ON c.id = l.category_id
    ${whereSql}
    ORDER BY c.sort_order ASC, l.sort_order ASC, l.id ASC
  `).all(...params);

  return rows.map((row) => serializeLink(row, tagsByLinkId));
};

const syncLinkTags = db.transaction((linkId, tagIds) => {
  db.prepare('DELETE FROM nav_link_tag WHERE link_id = ?').run(linkId);
  const stmt = db.prepare('INSERT INTO nav_link_tag (link_id, tag_id) VALUES (?, ?)');
  for (const tagId of tagIds) {
    stmt.run(linkId, tagId);
  }
});

const requireRecord = (table, id) => {
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
  return row || null;
};

app.get('/health', async (request, reply) => {
  const counts = {
    adminUsers: db.prepare('SELECT COUNT(*) AS count FROM admin_user').get().count,
    categories: db.prepare('SELECT COUNT(*) AS count FROM nav_category').get().count,
    links: db.prepare('SELECT COUNT(*) AS count FROM nav_link').get().count,
    tags: db.prepare('SELECT COUNT(*) AS count FROM nav_tag').get().count,
    announcements: db.prepare('SELECT COUNT(*) AS count FROM announcement').get().count,
    friendLinks: db.prepare('SELECT COUNT(*) AS count FROM friend_link').get().count,
    settings: db.prepare('SELECT COUNT(*) AS count FROM site_setting').get().count
  };

  return app.ok(reply, { status: 'running', counts });
});

app.get('/api/site/home', async (request, reply) => {
  const settings = getSettingsMap();
  const categories = listCategories()
    .filter((item) => item.is_visible === 1)
    .map((category) => ({
      ...serializeCategory(category),
      links: listLinks('WHERE l.category_id = ? AND l.is_visible = 1', [category.id])
    }));

  const featuredLinks = listLinks('WHERE l.is_visible = 1 AND l.is_featured = 1');
  const announcements = db.prepare(`
    SELECT * FROM announcement
    WHERE is_active = 1
      AND (starts_at IS NULL OR starts_at = '' OR starts_at <= ?)
      AND (ends_at IS NULL OR ends_at = '' OR ends_at >= ?)
    ORDER BY is_pinned DESC, sort_order ASC, id DESC
  `).all(nowIso(), nowIso()).map(serializeAnnouncement);

  const friendLinks = db.prepare(`
    SELECT * FROM friend_link
    WHERE is_active = 1
    ORDER BY sort_order ASC, id ASC
  `).all().map(serializeFriendLink);

  return app.ok(reply, {
    settings,
    featuredLinks,
    categories,
    announcements,
    friendLinks
  });
});

app.get('/api/site/search', async (request, reply) => {
  const keyword = sanitizeText(request.query.keyword || '');
  if (!keyword) {
    return app.ok(reply, { keyword: '', total: 0, items: [] });
  }

  const like = `%${keyword}%`;
  const items = listLinks(
    `WHERE l.is_visible = 1 AND (
      l.title LIKE ? OR l.description LIKE ? OR l.url LIKE ? OR c.name LIKE ? OR EXISTS (
        SELECT 1 FROM nav_link_tag nlt
        INNER JOIN nav_tag nt ON nt.id = nlt.tag_id
        WHERE nlt.link_id = l.id AND (nt.name LIKE ? OR nt.slug LIKE ?)
      )
    )`,
    [like, like, like, like, like, like]
  );

  return app.ok(reply, { keyword, total: items.length, items });
});

app.post('/api/site/link/:id/click', async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const link = requireRecord('nav_link', id);
  if (!link) {
    return app.fail(reply, 404, 'Link not found');
  }

  db.prepare('UPDATE nav_link SET click_count = click_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  logVisit.run(
    `/api/site/link/${id}/click`,
    sanitizeText(request.headers.referer || ''),
    getClientIp(request),
    sanitizeText(request.headers['user-agent'] || ''),
    nowIso()
  );

  const updated = requireRecord('nav_link', id);
  return app.ok(reply, { id, clickCount: updated.click_count, url: updated.url }, 'click tracked');
});

app.post('/api/admin/auth/login', async (request, reply) => {
  const username = sanitizeText(request.body?.username || '');
  const password = String(request.body?.password || '');

  if (!username || !password) {
    return app.fail(reply, 400, 'Username and password are required');
  }

  const user = db.prepare('SELECT * FROM admin_user WHERE username = ?').get(username);
  if (!user || user.status !== 1 || !bcrypt.compareSync(password, user.password_hash)) {
    return app.fail(reply, 401, 'Invalid username or password');
  }

  const token = await reply.jwtSign({ uid: user.id, username: user.username, role: 'admin' }, { expiresIn: '7d' });
  db.prepare('UPDATE admin_user SET last_login_at = ?, last_login_ip = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nowIso(), getClientIp(request), user.id);

  return app.ok(reply, {
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      email: user.email,
      lastLoginAt: nowIso()
    }
  }, 'login successful');
});

app.post('/api/site/auth/register', async (request, reply) => {
  const username = sanitizeText(request.body?.username || '');
  const password = String(request.body?.password || '');
  const nickname = sanitizeText(request.body?.nickname || username);
  const email = sanitizeText(request.body?.email || '');

  if (!username || !password) {
    return app.fail(reply, 400, 'Username and password are required');
  }
  if (username.length < 3) {
    return app.fail(reply, 400, 'Username must be at least 3 characters');
  }
  if (password.length < 6) {
    return app.fail(reply, 400, 'Password must be at least 6 characters');
  }

  const existing = db.prepare('SELECT id FROM site_user WHERE username = ?').get(username);
  if (existing) {
    return app.fail(reply, 409, 'Username already exists');
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO site_user (username, password_hash, nickname, email, status)
    VALUES (?, ?, ?, ?, 1)
  `).run(username, passwordHash, nickname, email);

  const user = db.prepare('SELECT id, username, nickname, avatar, email, bio, status, created_at, updated_at FROM site_user WHERE id = ?').get(result.lastInsertRowid);
  return app.ok(reply, {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    email: user.email,
    bio: user.bio,
    status: !!user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  }, 'register successful');
});

app.post('/api/site/auth/login', async (request, reply) => {
  const username = sanitizeText(request.body?.username || '');
  const password = String(request.body?.password || '');

  if (!username || !password) {
    return app.fail(reply, 400, 'Username and password are required');
  }

  const user = db.prepare('SELECT * FROM site_user WHERE username = ?').get(username);
  if (!user || user.status !== 1 || !bcrypt.compareSync(password, user.password_hash)) {
    return app.fail(reply, 401, 'Invalid username or password');
  }

  const token = await reply.jwtSign({ uid: user.id, username: user.username, role: 'site' }, { expiresIn: '7d' });
  db.prepare('UPDATE site_user SET last_login_at = ?, last_login_ip = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(nowIso(), getClientIp(request), user.id);

  return app.ok(reply, {
    token,
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      email: user.email,
      bio: user.bio,
      lastLoginAt: nowIso()
    }
  }, 'login successful');
});

app.get('/api/site/auth/me', { preHandler: app.siteAuthenticate }, async (request, reply) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, email, bio, last_login_at, last_login_ip, status, created_at, updated_at FROM site_user WHERE id = ?').get(request.user.uid);
  if (!user) {
    return app.fail(reply, 404, 'User not found');
  }

  return app.ok(reply, {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    email: user.email,
    bio: user.bio,
    lastLoginAt: user.last_login_at,
    lastLoginIp: user.last_login_ip,
    status: !!user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  });
});

app.post('/api/site/auth/logout', { preHandler: app.siteAuthenticate }, async (request, reply) => {
  const authHeader = request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    tokenBlocklist.add(token);
  }
  return app.ok(reply, null, 'logout successful');
});

app.get('/api/admin/auth/me', { preHandler: app.authenticate }, async (request, reply) => {
  const user = db.prepare('SELECT id, username, nickname, avatar, email, last_login_at, last_login_ip, status, created_at, updated_at FROM admin_user WHERE id = ?').get(request.user.uid);
  if (!user) {
    return app.fail(reply, 404, 'User not found');
  }

  return app.ok(reply, {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: user.avatar,
    email: user.email,
    lastLoginAt: user.last_login_at,
    lastLoginIp: user.last_login_ip,
    status: !!user.status,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  });
});

app.post('/api/admin/auth/logout', { preHandler: app.authenticate }, async (request, reply) => {
  const authHeader = request.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (token) {
    tokenBlocklist.add(token);
  }
  return app.ok(reply, null, 'logout successful');
});

app.get('/api/admin/categories', { preHandler: app.authenticate }, async (request, reply) => {
  return app.ok(reply, listCategories().map(serializeCategory));
});

app.post('/api/admin/categories', { preHandler: app.authenticate }, async (request, reply) => {
  const name = sanitizeText(request.body?.name || '');
  if (!name) {
    return app.fail(reply, 400, 'Category name is required');
  }

  const slug = slugify(request.body?.slug || name, 'category');
  const exists = db.prepare('SELECT id FROM nav_category WHERE slug = ?').get(slug);
  if (exists) {
    return app.fail(reply, 409, 'Category slug already exists');
  }

  const result = db.prepare(`
    INSERT INTO nav_category (name, slug, description, icon, sort_order, is_visible)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    slug,
    sanitizeText(request.body?.description || ''),
    sanitizeText(request.body?.icon || ''),
    normalizeInteger(request.body?.sortOrder, 0),
    normalizeBooleanNumber(request.body?.isVisible, 1)
  );

  return app.ok(reply, serializeCategory(requireRecord('nav_category', result.lastInsertRowid)), 'created');
});

app.put('/api/admin/categories/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const current = requireRecord('nav_category', id);
  if (!current) {
    return app.fail(reply, 404, 'Category not found');
  }

  const name = sanitizeText(request.body?.name || current.name);
  const slug = slugify(request.body?.slug || current.slug, 'category');
  const duplicated = db.prepare('SELECT id FROM nav_category WHERE slug = ? AND id != ?').get(slug, id);
  if (duplicated) {
    return app.fail(reply, 409, 'Category slug already exists');
  }

  db.prepare(`
    UPDATE nav_category
    SET name = ?, slug = ?, description = ?, icon = ?, sort_order = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name,
    slug,
    sanitizeText(request.body?.description ?? current.description),
    sanitizeText(request.body?.icon ?? current.icon),
    normalizeInteger(request.body?.sortOrder, current.sort_order),
    normalizeBooleanNumber(request.body?.isVisible, current.is_visible),
    id
  );

  return app.ok(reply, serializeCategory(requireRecord('nav_category', id)), 'updated');
});

app.delete('/api/admin/categories/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const existing = requireRecord('nav_category', id);
  if (!existing) {
    return app.fail(reply, 404, 'Category not found');
  }

  db.prepare('DELETE FROM nav_category WHERE id = ?').run(id);
  return app.ok(reply, { id }, 'deleted');
});

app.get('/api/admin/tags', { preHandler: app.authenticate }, async (request, reply) => {
  return app.ok(reply, listTags().map(serializeTag));
});

app.post('/api/admin/tags', { preHandler: app.authenticate }, async (request, reply) => {
  const name = sanitizeText(request.body?.name || '');
  if (!name) {
    return app.fail(reply, 400, 'Tag name is required');
  }

  const slug = slugify(request.body?.slug || name, 'tag');
  const duplicate = db.prepare('SELECT id FROM nav_tag WHERE slug = ? OR name = ?').get(slug, name);
  if (duplicate) {
    return app.fail(reply, 409, 'Tag already exists');
  }

  const result = db.prepare('INSERT INTO nav_tag (name, slug, color) VALUES (?, ?, ?)').run(
    name,
    slug,
    sanitizeText(request.body?.color || '#3b82f6')
  );

  return app.ok(reply, serializeTag(requireRecord('nav_tag', result.lastInsertRowid)), 'created');
});

app.put('/api/admin/tags/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const current = requireRecord('nav_tag', id);
  if (!current) {
    return app.fail(reply, 404, 'Tag not found');
  }

  const name = sanitizeText(request.body?.name || current.name);
  const slug = slugify(request.body?.slug || current.slug, 'tag');
  const duplicate = db.prepare('SELECT id FROM nav_tag WHERE (slug = ? OR name = ?) AND id != ?').get(slug, name, id);
  if (duplicate) {
    return app.fail(reply, 409, 'Tag already exists');
  }

  db.prepare('UPDATE nav_tag SET name = ?, slug = ?, color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    name,
    slug,
    sanitizeText(request.body?.color ?? current.color),
    id
  );

  return app.ok(reply, serializeTag(requireRecord('nav_tag', id)), 'updated');
});

app.delete('/api/admin/tags/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const current = requireRecord('nav_tag', id);
  if (!current) {
    return app.fail(reply, 404, 'Tag not found');
  }

  db.prepare('DELETE FROM nav_tag WHERE id = ?').run(id);
  return app.ok(reply, { id }, 'deleted');
});

app.get('/api/admin/links', { preHandler: app.authenticate }, async (request, reply) => {
  return app.ok(reply, listLinks());
});

app.post('/api/admin/links', { preHandler: app.authenticate }, async (request, reply) => {
  const title = sanitizeText(request.body?.title || '');
  const url = sanitizeText(request.body?.url || '');
  const categoryId = normalizeInteger(request.body?.categoryId, 0);
  const tagIds = ensureArray(request.body?.tagIds).map((id) => normalizeInteger(id, 0)).filter(Boolean);

  if (!title || !url || !categoryId) {
    return app.fail(reply, 400, 'Title, url and categoryId are required');
  }

  const category = requireRecord('nav_category', categoryId);
  if (!category) {
    return app.fail(reply, 400, 'Category does not exist');
  }

  const validTagIds = tagIds.filter((tagId) => requireRecord('nav_tag', tagId));
  const result = db.prepare(`
    INSERT INTO nav_link (
      category_id, title, url, description, favicon, cover_image, sort_order, is_featured, is_visible
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    categoryId,
    title,
    url,
    sanitizeText(request.body?.description || ''),
    sanitizeText(request.body?.favicon || ''),
    sanitizeText(request.body?.coverImage || ''),
    normalizeInteger(request.body?.sortOrder, 0),
    normalizeBooleanNumber(request.body?.isFeatured, 0),
    normalizeBooleanNumber(request.body?.isVisible, 1)
  );

  syncLinkTags(result.lastInsertRowid, validTagIds);
  return app.ok(reply, listLinks('WHERE l.id = ?', [result.lastInsertRowid])[0], 'created');
});

app.put('/api/admin/links/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const current = requireRecord('nav_link', id);
  if (!current) {
    return app.fail(reply, 404, 'Link not found');
  }

  const categoryId = normalizeInteger(request.body?.categoryId, current.category_id);
  if (!requireRecord('nav_category', categoryId)) {
    return app.fail(reply, 400, 'Category does not exist');
  }

  db.prepare(`
    UPDATE nav_link
    SET category_id = ?, title = ?, url = ?, description = ?, favicon = ?, cover_image = ?, sort_order = ?,
        is_featured = ?, is_visible = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    categoryId,
    sanitizeText(request.body?.title || current.title),
    sanitizeText(request.body?.url || current.url),
    sanitizeText(request.body?.description ?? current.description),
    sanitizeText(request.body?.favicon ?? current.favicon),
    sanitizeText(request.body?.coverImage ?? current.cover_image),
    normalizeInteger(request.body?.sortOrder, current.sort_order),
    normalizeBooleanNumber(request.body?.isFeatured, current.is_featured),
    normalizeBooleanNumber(request.body?.isVisible, current.is_visible),
    id
  );

  if (request.body?.tagIds !== undefined) {
    const tagIds = ensureArray(request.body.tagIds).map((tagId) => normalizeInteger(tagId, 0)).filter(Boolean);
    const validTagIds = tagIds.filter((tagId) => requireRecord('nav_tag', tagId));
    syncLinkTags(id, validTagIds);
  }

  return app.ok(reply, listLinks('WHERE l.id = ?', [id])[0], 'updated');
});

app.delete('/api/admin/links/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  if (!requireRecord('nav_link', id)) {
    return app.fail(reply, 404, 'Link not found');
  }

  db.prepare('DELETE FROM nav_link WHERE id = ?').run(id);
  return app.ok(reply, { id }, 'deleted');
});

app.get('/api/admin/announcements', { preHandler: app.authenticate }, async (request, reply) => {
  const items = db.prepare('SELECT * FROM announcement ORDER BY is_pinned DESC, sort_order ASC, id DESC').all().map(serializeAnnouncement);
  return app.ok(reply, items);
});

app.post('/api/admin/announcements', { preHandler: app.authenticate }, async (request, reply) => {
  const title = sanitizeText(request.body?.title || '');
  const content = sanitizeText(request.body?.content || '');
  if (!title || !content) {
    return app.fail(reply, 400, 'Title and content are required');
  }

  const result = db.prepare(`
    INSERT INTO announcement (title, content, is_pinned, is_active, sort_order, starts_at, ends_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    content,
    normalizeBooleanNumber(request.body?.isPinned, 0),
    normalizeBooleanNumber(request.body?.isActive, 1),
    normalizeInteger(request.body?.sortOrder, 0),
    sanitizeNullableText(request.body?.startsAt),
    sanitizeNullableText(request.body?.endsAt)
  );

  return app.ok(reply, serializeAnnouncement(requireRecord('announcement', result.lastInsertRowid)), 'created');
});

app.put('/api/admin/announcements/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const current = requireRecord('announcement', id);
  if (!current) {
    return app.fail(reply, 404, 'Announcement not found');
  }

  db.prepare(`
    UPDATE announcement
    SET title = ?, content = ?, is_pinned = ?, is_active = ?, sort_order = ?, starts_at = ?, ends_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sanitizeText(request.body?.title || current.title),
    sanitizeText(request.body?.content || current.content),
    normalizeBooleanNumber(request.body?.isPinned, current.is_pinned),
    normalizeBooleanNumber(request.body?.isActive, current.is_active),
    normalizeInteger(request.body?.sortOrder, current.sort_order),
    sanitizeNullableText(request.body?.startsAt ?? current.starts_at),
    sanitizeNullableText(request.body?.endsAt ?? current.ends_at),
    id
  );

  return app.ok(reply, serializeAnnouncement(requireRecord('announcement', id)), 'updated');
});

app.delete('/api/admin/announcements/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  if (!requireRecord('announcement', id)) {
    return app.fail(reply, 404, 'Announcement not found');
  }

  db.prepare('DELETE FROM announcement WHERE id = ?').run(id);
  return app.ok(reply, { id }, 'deleted');
});

app.get('/api/admin/friend-links', { preHandler: app.authenticate }, async (request, reply) => {
  const items = db.prepare('SELECT * FROM friend_link ORDER BY sort_order ASC, id ASC').all().map(serializeFriendLink);
  return app.ok(reply, items);
});

app.post('/api/admin/friend-links', { preHandler: app.authenticate }, async (request, reply) => {
  const name = sanitizeText(request.body?.name || '');
  const url = sanitizeText(request.body?.url || '');
  if (!name || !url) {
    return app.fail(reply, 400, 'Name and url are required');
  }

  const result = db.prepare(`
    INSERT INTO friend_link (name, url, description, avatar, sort_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    name,
    url,
    sanitizeText(request.body?.description || ''),
    sanitizeText(request.body?.avatar || ''),
    normalizeInteger(request.body?.sortOrder, 0),
    normalizeBooleanNumber(request.body?.isActive, 1)
  );

  return app.ok(reply, serializeFriendLink(requireRecord('friend_link', result.lastInsertRowid)), 'created');
});

app.put('/api/admin/friend-links/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  const current = requireRecord('friend_link', id);
  if (!current) {
    return app.fail(reply, 404, 'Friend link not found');
  }

  db.prepare(`
    UPDATE friend_link
    SET name = ?, url = ?, description = ?, avatar = ?, sort_order = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    sanitizeText(request.body?.name || current.name),
    sanitizeText(request.body?.url || current.url),
    sanitizeText(request.body?.description ?? current.description),
    sanitizeText(request.body?.avatar ?? current.avatar),
    normalizeInteger(request.body?.sortOrder, current.sort_order),
    normalizeBooleanNumber(request.body?.isActive, current.is_active),
    id
  );

  return app.ok(reply, serializeFriendLink(requireRecord('friend_link', id)), 'updated');
});

app.delete('/api/admin/friend-links/:id', { preHandler: app.authenticate }, async (request, reply) => {
  const id = normalizeInteger(request.params.id, 0);
  if (!requireRecord('friend_link', id)) {
    return app.fail(reply, 404, 'Friend link not found');
  }

  db.prepare('DELETE FROM friend_link WHERE id = ?').run(id);
  return app.ok(reply, { id }, 'deleted');
});

app.get('/api/admin/settings', { preHandler: app.authenticate }, async (request, reply) => {
  return app.ok(reply, getSettingsMap());
});

app.put('/api/admin/settings', { preHandler: app.authenticate }, async (request, reply) => {
  const body = request.body && typeof request.body === 'object' ? request.body : {};
  const current = getSettingsMap();
  const keys = Object.keys(body);
  if (keys.length === 0) {
    return app.ok(reply, current, 'no changes');
  }

  const stmt = db.prepare(`
    INSERT INTO site_setting (setting_key, setting_value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      description = CASE WHEN excluded.description = '' THEN site_setting.description ELSE excluded.description END,
      updated_at = CURRENT_TIMESTAMP
  `);

  for (const key of keys) {
    const value = body[key]?.value !== undefined ? body[key].value : body[key];
    const description = sanitizeText(body[key]?.description || current[key]?.description || '');
    stmt.run(sanitizeText(key), JSON.stringify(value ?? null), description);
  }

  return app.ok(reply, getSettingsMap(), 'updated');
});

app.get('/api/admin/dashboard/stats', { preHandler: app.authenticate }, async (request, reply) => {
  const today = new Date();
  const todayPrefix = today.toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const totals = {
    categories: db.prepare('SELECT COUNT(*) AS count FROM nav_category').get().count,
    links: db.prepare('SELECT COUNT(*) AS count FROM nav_link').get().count,
    tags: db.prepare('SELECT COUNT(*) AS count FROM nav_tag').get().count,
    announcements: db.prepare('SELECT COUNT(*) AS count FROM announcement').get().count,
    friendLinks: db.prepare('SELECT COUNT(*) AS count FROM friend_link').get().count,
    clicks: db.prepare('SELECT COALESCE(SUM(click_count), 0) AS count FROM nav_link').get().count,
    visits: db.prepare('SELECT COUNT(*) AS count FROM visit_log').get().count,
    todayVisits: db.prepare("SELECT COUNT(*) AS count FROM visit_log WHERE substr(visited_at, 1, 10) = ?").get(todayPrefix).count
  };

  const popularLinks = db.prepare(`
    SELECT l.id, l.title, l.url, l.click_count, c.name AS category_name
    FROM nav_link l
    INNER JOIN nav_category c ON c.id = l.category_id
    ORDER BY l.click_count DESC, l.id ASC
    LIMIT 10
  `).all();

  const recentVisits = db.prepare(`
    SELECT substr(visited_at, 1, 10) AS date, COUNT(*) AS count
    FROM visit_log
    WHERE visited_at >= ?
    GROUP BY substr(visited_at, 1, 10)
    ORDER BY date ASC
  `).all(weekAgo);

  return app.ok(reply, {
    totals,
    popularLinks,
    recentVisits
  });
});

app.post('/api/site/profile/avatar', async (request, reply) => {
  let part;
  try {
    part = await request.file();
  } catch (error) {
    return app.fail(reply, 400, error.message || 'Upload failed');
  }

  if (!part) {
    return app.fail(reply, 400, 'File is required');
  }

  if (!new Set(['image/jpeg', 'image/png', 'image/webp']).has(part.mimetype)) {
    return app.fail(reply, 400, '仅支持 JPG、PNG、WebP 图片');
  }

  const extension = path.extname(part.filename || '').toLowerCase() || ({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  }[part.mimetype] || '.jpg');

  const profileSetting = getSettingsMap().profile?.value || {};
  const previousAvatar = typeof profileSetting.avatar === 'string' ? profileSetting.avatar : '';
  const filename = `profile-avatar-${Date.now()}-${crypto.randomUUID()}${extension}`;
  const targetPath = path.join(uploadsDir, filename);

  try {
    await pipeline(part.file, fs.createWriteStream(targetPath));
  } catch (error) {
    fs.rmSync(targetPath, { force: true });
    return app.fail(reply, 400, error.message || 'Upload failed');
  }

  const publicPath = `/uploads/${filename}`;
  const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'https';
  const hostHeader = request.headers['x-forwarded-host'] || request.headers.host || '';
  const origin = hostHeader ? `${protocol}://${hostHeader}` : '';
  const url = origin ? `${origin}${publicPath}` : publicPath;

  const nextProfile = {
    ...profileSetting,
    avatar: publicPath
  };

  db.prepare(`
    INSERT INTO site_setting (setting_key, setting_value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      description = CASE WHEN excluded.description = '' THEN site_setting.description ELSE excluded.description END,
      updated_at = CURRENT_TIMESTAMP
  `).run('profile', JSON.stringify(nextProfile), '个人资料配置');

  if (previousAvatar.startsWith('/uploads/')) {
    const previousFilePath = path.join(uploadsDir, path.basename(previousAvatar));
    if (previousFilePath !== targetPath) {
      fs.rmSync(previousFilePath, { force: true });
    }
  }

  return app.ok(reply, {
    path: publicPath,
    url,
    size: fs.statSync(targetPath).size,
    mimetype: part.mimetype
  }, 'avatar updated');
});

app.delete('/api/site/profile/avatar', async (request, reply) => {
  const settings = getSettingsMap();
  const profileSetting = settings.profile?.value || {};
  const avatar = typeof profileSetting.avatar === 'string' ? profileSetting.avatar : '';

  const nextProfile = {
    ...profileSetting,
    avatar: ''
  };

  db.prepare(`
    INSERT INTO site_setting (setting_key, setting_value, description)
    VALUES (?, ?, ?)
    ON CONFLICT(setting_key) DO UPDATE SET
      setting_value = excluded.setting_value,
      description = CASE WHEN excluded.description = '' THEN site_setting.description ELSE excluded.description END,
      updated_at = CURRENT_TIMESTAMP
  `).run('profile', JSON.stringify(nextProfile), settings.profile?.description || '个人资料配置');

  if (avatar.startsWith('/uploads/')) {
    const targetPath = path.join(uploadsDir, path.basename(avatar));
    fs.rmSync(targetPath, { force: true });
  }

  return app.ok(reply, { avatar: '' }, 'avatar reset');
});

app.post('/api/admin/upload', { preHandler: app.authenticate }, async (request, reply) => {
  let part;
  try {
    part = await request.file();
  } catch (error) {
    return app.fail(reply, 400, error.message || 'Upload failed');
  }

  if (!part) {
    return app.fail(reply, 400, 'File is required');
  }

  if (!allowedUploadTypes.has(part.mimetype)) {
    return app.fail(reply, 400, 'Unsupported file type');
  }

  const extension = path.extname(part.filename || '').toLowerCase() || ({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  }[part.mimetype] || '');

  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const targetPath = path.join(uploadsDir, filename);

  try {
    await pipeline(part.file, fs.createWriteStream(targetPath));
  } catch (error) {
    fs.rmSync(targetPath, { force: true });
    return app.fail(reply, 400, error.message || 'Upload failed');
  }

  const publicPath = `/uploads/${filename}`;
  const protocol = request.headers['x-forwarded-proto'] || request.protocol || 'https';
  const hostHeader = request.headers['x-forwarded-host'] || request.headers.host || '';
  const origin = hostHeader ? `${protocol}://${hostHeader}` : '';
  const url = origin ? `${origin}${publicPath}` : publicPath;

  return app.ok(reply, {
    filename,
    mimetype: part.mimetype,
    size: fs.statSync(targetPath).size,
    path: publicPath,
    url
  }, 'uploaded');
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (error.code === 'FST_REQ_FILE_TOO_LARGE') {
    return reply.status(400).send({ code: 400, message: 'File too large', data: null });
  }

  reply.status(error.statusCode || 500).send({
    code: error.statusCode || 500,
    message: error.message || 'Internal Server Error',
    data: null
  });
});

const start = async () => {
  try {
    await app.listen({ host, port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

const close = async () => {
  try {
    await app.close();
  } finally {
    db.close();
  }
};

process.on('SIGINT', close);
process.on('SIGTERM', close);

start();

export default app;

