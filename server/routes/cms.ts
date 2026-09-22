// CMS 内容管理与本地认证接口（替代云端 Supabase）
import { Router, type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import {
  initDatabase,
  verifyAdmin,
  createSession,
  verifySession,
  destroySession,
  getBooks,
  getProducts,
  normalizeBook,
  normalizeProduct,
  parsePages,
  type BookRow,
  type ProductRow,
} from '../db';

const router = Router();

interface BookPayload extends Partial<BookRow> {}
interface ProductPayload extends Partial<ProductRow> {}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/** 上传目录（开发/生产通用，生产在 C:\app\uploads） */
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase();
    const name = `${Date.now()}-${Math.round(Math.random() * 1e8)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('仅支持图片文件'));
  },
});

/** 校验管理员登录 token */
async function requireAdmin(req: Request): Promise<boolean> {
  const token = req.header('x-session');
  if (!token) return false;
  const session = await verifySession(token);
  return !!session;
}

// ---------- 认证（本地） ----------
router.get('/api/auth/status', async (_req: Request, res: Response) => {
  try {
    const logged = await requireAdmin(_req);
    res.json({ logged });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = (req.body ?? {}) as { username?: string; password?: string };
    if (!verifyAdmin(String(username ?? ''), String(password ?? ''))) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }
    const token = await createSession(String(username));
    res.json({ success: true, token, username });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    await destroySession(req.header('x-session') ?? '');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 图片上传（需登录） ----------
router.post('/api/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: '未收到文件' });
      return;
    }
    res.json({ success: true, url: `/uploads/${req.file.filename}` });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 公开接口（前台展示） ----------
router.get('/api/content', async (_req: Request, res: Response) => {
  try {
    const [books, products] = await Promise.all([getBooks(), getProducts()]);
    res.json({
      books: books.map((b) => ({ ...b, pages: parsePages(b.pages) })),
      products,
    });
  } catch (error) {
    console.error('Failed to load content:', error);
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 单项公开详情 ----------
router.get('/api/books/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: '无效 ID' });
      return;
    }
    const books = await getBooks();
    const book = books.find((b) => b.id === id);
    if (!book) {
      res.status(404).json({ error: '绘本不存在' });
      return;
    }
    res.json({ ...book, pages: parsePages(book.pages) });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const products = await getProducts();
    const product = products.find((p) => p.id === id);
    if (!product) {
      res.status(404).json({ error: '文创不存在' });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 绘本管理（需登录） ----------
router.get('/api/admin/books', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const books = await getBooks();
    res.json({ books });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.post('/api/admin/books', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const body = normalizeBook((req.body ?? {}) as Record<string, unknown>);
    const r = await (await import('../db')).query<{ id: number }>(
      `INSERT INTO books (title, series_name, price, isbn, brief, cover_img, pages, format, barcode_img, author, clc, publish_date, age_group, publisher, category, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        body.title, body.series_name, body.price, body.isbn, body.brief,
        body.cover_img, body.pages, body.format, body.barcode_img, body.author,
        body.clc, body.publish_date, body.age_group, body.publisher, body.category,
        body.sort_order,
      ],
    );
    const id = Number(r.rows[0].id);
    const books = await getBooks();
    res.json({ success: true, data: books.find((b) => b.id === id) });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.put('/api/admin/books/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    // 仅更新请求体中提供的字段，未提供的保留原值（部分更新）
    const sets: string[] = [];
    const vals: unknown[] = [];
    const add = (col: string, v: unknown) => {
      if (v === undefined || v === null) return;
      if (col === 'pages' && Array.isArray(v)) v = JSON.stringify(v);
      sets.push(`${col}=$${vals.length + 1}`);
      vals.push(v);
    };
    add('title', body.title);
    add('series_name', body.series_name);
    add('price', body.price);
    add('isbn', body.isbn);
    add('brief', body.brief);
    add('cover_img', body.cover_img);
    add('pages', body.pages);
    add('format', body.format);
    add('barcode_img', body.barcode_img);
    add('author', body.author);
    add('clc', body.clc);
    add('publish_date', body.publish_date);
    add('age_group', body.age_group);
    add('publisher', body.publisher);
    add('category', body.category);
    add('sort_order', body.sort_order);
    if (sets.length > 0) {
      vals.push(id);
      await (await import('../db')).query(
        `UPDATE books SET ${sets.join(', ')} WHERE id=$${vals.length}`,
        vals,
      );
    }
    const books = await getBooks();
    res.json({ success: true, data: books.find((b) => b.id === id) });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.delete('/api/admin/books/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    await (await import('../db')).query(`DELETE FROM books WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 文创管理（需登录） ----------
router.get('/api/admin/products', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const products = await getProducts();
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.post('/api/admin/products', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const body = normalizeProduct((req.body ?? {}) as Record<string, unknown>);
    const r = await (await import('../db')).query<{ id: number }>(
      `INSERT INTO products (name, category, price, barcode_img, barcode, brand, net_unit, cover_img, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [body.name, body.category, body.price, body.barcode_img, body.barcode, body.brand, body.net_unit, body.cover_img, body.sort_order],
    );
    const id = Number(r.rows[0].id);
    const products = await getProducts();
    res.json({ success: true, data: products.find((p) => p.id === id) });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.put('/api/admin/products/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const sets: string[] = [];
    const vals: unknown[] = [];
    const add = (col: string, v: unknown) => {
      if (v === undefined || v === null) return;
      sets.push(`${col}=$${vals.length + 1}`);
      vals.push(v);
    };
    add('name', body.name);
    add('category', body.category);
    add('price', body.price);
    add('barcode_img', body.barcode_img);
    add('barcode', body.barcode);
    add('brand', body.brand);
    add('net_unit', body.net_unit);
    add('cover_img', body.cover_img);
    add('sort_order', body.sort_order);
    if (sets.length > 0) {
      vals.push(id);
      await (await import('../db')).query(
        `UPDATE products SET ${sets.join(', ')} WHERE id=$${vals.length}`,
        vals,
      );
    }
    const products = await getProducts();
    res.json({ success: true, data: products.find((p) => p.id === id) });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.delete('/api/admin/products/:id', async (req: Request, res: Response) => {
  try {
    if (!(await requireAdmin(req))) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    await (await import('../db')).query(`DELETE FROM products WHERE id=$1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

// 初始化：开发环境全量建表自举；生产环境仅确保会话表存在（业务表由部署 SQL 创建）
(async () => {
  const { isProd } = await import('../env');
  const db = await import('../db');
  try {
    if (isProd()) {
      // 生产：仅幂等创建本地认证所需的会话表
      await db.query(
        `CREATE TABLE IF NOT EXISTS admin_sessions (
          token       VARCHAR(128) PRIMARY KEY,
          username    VARCHAR(255) NOT NULL,
          created_at  TIMESTAMPTZ DEFAULT now() NOT NULL,
          expires_at  TIMESTAMPTZ NOT NULL
        );`,
      );
    } else {
      await db.initDatabase();
    }
  } catch (err) {
    console.error('Failed to init database:', (err as Error).message);
  }
})();

export default router;