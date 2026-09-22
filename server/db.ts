// 本地 PostgreSQL 数据访问层（替代云端 Supabase）
// 提供连接池、鉴权 token 签发/校验、books/products 完整字段读写与初始化
import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import crypto from 'crypto';
import { getDatabaseUrl, getAdminCredentials, getTokenSecret, ensureEnv } from './env';

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: false,
});

ensureEnv();

/** 通用查询 */
export async function query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params as never[]);
}

/** 初始化表结构 + 管理员账号（幂等） */
export async function initDatabase(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS books (
      id            SERIAL PRIMARY KEY,
      title         VARCHAR(255) NOT NULL,
      series_name   VARCHAR(255) DEFAULT '' NOT NULL,
      price         VARCHAR(64) DEFAULT '' NOT NULL,
      isbn          VARCHAR(128) DEFAULT '' NOT NULL,
      brief         TEXT DEFAULT '',
      cover_img     VARCHAR(1024) DEFAULT '',
      pages         TEXT DEFAULT '',
      format        VARCHAR(128) DEFAULT '' NOT NULL,
      barcode_img   VARCHAR(1024) DEFAULT '',
      author        VARCHAR(255) DEFAULT '' NOT NULL,
      clc           VARCHAR(64) DEFAULT '' NOT NULL,
      publish_date  VARCHAR(64) DEFAULT '' NOT NULL,
      age_group     VARCHAR(64) DEFAULT '' NOT NULL,
      publisher     VARCHAR(255) DEFAULT '' NOT NULL,
      category      VARCHAR(255) DEFAULT '' NOT NULL,
      sort_order    INTEGER DEFAULT 0 NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS books_sort_idx ON books(sort_order);`);
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id            SERIAL PRIMARY KEY,
      name          VARCHAR(255) NOT NULL,
      category      VARCHAR(128) DEFAULT '' NOT NULL,
      price         VARCHAR(64) DEFAULT '' NOT NULL,
      barcode_img   VARCHAR(1024) DEFAULT '',
      barcode       VARCHAR(128) DEFAULT '' NOT NULL,
      brand         VARCHAR(255) DEFAULT '' NOT NULL,
      net_unit      VARCHAR(64) DEFAULT '' NOT NULL,
      cover_img     VARCHAR(1024) DEFAULT '',
      sort_order    INTEGER DEFAULT 0 NOT NULL,
      created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS products_sort_idx ON products(sort_order);`);

  // 会话表（本地认证）
  await query(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token       VARCHAR(128) PRIMARY KEY,
      username    VARCHAR(255) NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL
    );
  `);
}

// ---------- 本地认证 ----------
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 天

function sha256(input: string): string {
  return crypto.createHmac('sha256', getTokenSecret()).update(input).digest('hex');
}

/** 校验管理员账号密码 */
export function verifyAdmin(username: string, password: string): boolean {
  const creds = getAdminCredentials();
  return username === creds.username && password === creds.password;
}

/** 签发新的会话 token（存入数据库） */
export async function createSession(username: string): Promise<string> {
  const raw = `${username}.${Date.now()}.${crypto.randomBytes(16).toString('hex')}`;
  const token = sha256(raw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await query(
    `INSERT INTO admin_sessions (token, username, expires_at) VALUES ($1, $2, $3)`,
    [token, username, expiresAt],
  );
  return token;
}

/** 校验 token 是否有效（存在且未过期） */
export async function verifySession(token: string): Promise<{ username: string } | null> {
  if (!token) return null;
  const res = await query<{ username: string; expires_at: string }>(
    `SELECT username, expires_at FROM admin_sessions WHERE token = $1 AND expires_at > now()`,
    [token],
  );
  if (res.rowCount === 0) return null;
  return { username: res.rows[0].username };
}

/** 注销会话 */
export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await query(`DELETE FROM admin_sessions WHERE token = $1`, [token]);
}

// ---------- 数据读取 ----------
export interface BookRow {
  id: number;
  title: string;
  series_name: string;
  price: string;
  isbn: string;
  brief: string;
  cover_img: string;
  pages: string;
  format: string;
  barcode_img: string;
  author: string;
  clc: string;
  publish_date: string;
  age_group: string;
  publisher: string;
  category: string;
  sort_order: number;
  created_at: string;
}

export interface ProductRow {
  id: number;
  name: string;
  category: string;
  price: string;
  barcode_img: string;
  barcode: string;
  brand: string;
  net_unit: string;
  cover_img: string;
  sort_order: number;
  created_at: string;
}

/** 解析 pages JSON（兼容字符串数组 / 单串 / 空） */
export function parsePages(pages: string | null | undefined): string[] {
  if (!pages) return [];
  try {
    const parsed = JSON.parse(pages as string);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    if (typeof parsed === 'string') return [parsed];
  } catch {
    return [];
  }
  return [];
}

export async function getBooks(): Promise<BookRow[]> {
  const res = await query<BookRow>(`SELECT * FROM books ORDER BY sort_order ASC, id ASC`);
  return res.rows;
}

export async function getProducts(): Promise<ProductRow[]> {
  const res = await query<ProductRow>(`SELECT * FROM products ORDER BY sort_order ASC, id ASC`);
  return res.rows;
}

/** 构建 upsert 使用的数据（books），缺失值回退为空 */
export function normalizeBook(body: Record<string, unknown>): Record<string, unknown> {
  const pages = Array.isArray(body.pages) ? JSON.stringify(body.pages) : body.pages ?? '';
  return {
    title: String(body.title ?? ''),
    series_name: String(body.series_name ?? ''),
    price: String(body.price ?? ''),
    isbn: String(body.isbn ?? ''),
    brief: String(body.brief ?? ''),
    cover_img: String(body.cover_img ?? ''),
    pages: String(pages ?? ''),
    format: String(body.format ?? ''),
    barcode_img: String(body.barcode_img ?? ''),
    author: String(body.author ?? ''),
    clc: String(body.clc ?? ''),
    publish_date: String(body.publish_date ?? ''),
    age_group: String(body.age_group ?? ''),
    publisher: String(body.publisher ?? ''),
    category: String(body.category ?? ''),
    sort_order: Number(body.sort_order ?? 0),
  };
}

export function normalizeProduct(body: Record<string, unknown>): Record<string, unknown> {
  return {
    name: String(body.name ?? ''),
    category: String(body.category ?? ''),
    price: String(body.price ?? ''),
    barcode_img: String(body.barcode_img ?? ''),
    barcode: String(body.barcode ?? ''),
    brand: String(body.brand ?? ''),
    net_unit: String(body.net_unit ?? ''),
    cover_img: String(body.cover_img ?? ''),
    sort_order: Number(body.sort_order ?? 0),
  };
}

export default pool;