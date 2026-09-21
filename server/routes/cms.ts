import { Router, type Request, type Response } from 'express';
import { getSupabaseClient, getSupabaseCredentials } from '../src/storage/database/supabase-client';

const router = Router();

interface BookRow {
  id: number;
  title: string;
  en: string;
  author: string;
  desc: string | null;
  img: string;
  sort_order: number;
  created_at: string;
}
interface ProductRow {
  id: number;
  name: string;
  price: string;
  emoji: string;
  tag: string;
  sort_order: number;
  created_at: string;
}

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/** 从 x-session 取当前登录用户，未登录返回 null */
async function getAuthUser(req: Request): Promise<{ client: ReturnType<typeof getSupabaseClient>; email: string } | null> {
  const token = req.header('x-session');
  if (!token) return null;
  const client = getSupabaseClient(token);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, email: data.user.email ?? '' };
}

// ---------- 公开接口 ----------
router.get('/api/supabase-config', (_req: Request, res: Response) => {
  try {
    const { url, anonKey } = getSupabaseCredentials();
    res.json({ url, anonKey });
  } catch (error) {
    console.error('Failed to get supabase config:', error);
    res.status(500).json({ error: 'Failed to get Supabase config' });
  }
});

router.get('/api/content', async (_req: Request, res: Response) => {
  try {
    const client = getSupabaseClient();
    const [booksRes, productsRes] = await Promise.all([
      client
        .from('books')
        .select('id, title, en, author, desc, img')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true }),
      client
        .from('products')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('id', { ascending: true }),
    ]);

    if (booksRes.error) throw new Error(`查询绘本失败: ${booksRes.error.message}`);
    if (productsRes.error) throw new Error(`查询文创失败: ${productsRes.error.message}`);

    res.json({
      books: (booksRes.data ?? []) as BookRow[],
      products: (productsRes.data ?? []) as ProductRow[],
    });
  } catch (error) {
    console.error('Failed to load content:', error);
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 绘本管理（需登录） ----------
router.post('/api/admin/books', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const body = req.body as Partial<BookRow>;
    const { data, error } = await auth.client
      .from('books')
      .insert({
        title: body.title ?? '',
        en: body.en ?? '',
        author: body.author ?? '',
        desc: body.desc ?? '',
        img: body.img ?? '',
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) throw new Error(`新增绘本失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.put('/api/admin/books/:id', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    const body = req.body as Partial<BookRow>;
    const { data, error } = await auth.client
      .from('books')
      .update({
        title: body.title,
        en: body.en,
        author: body.author,
        desc: body.desc,
        img: body.img,
        sort_order: body.sort_order,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新绘本失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.delete('/api/admin/books/:id', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    const { error } = await auth.client.from('books').delete().eq('id', id);
    if (error) throw new Error(`删除绘本失败: ${error.message}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

// ---------- 文创管理（需登录） ----------
router.post('/api/admin/products', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const body = req.body as Partial<ProductRow>;
    const { data, error } = await auth.client
      .from('products')
      .insert({
        name: body.name ?? '',
        price: body.price ?? '',
        emoji: body.emoji ?? '',
        tag: body.tag ?? '',
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();
    if (error) throw new Error(`新增文创失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.put('/api/admin/products/:id', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    const body = req.body as Partial<ProductRow>;
    const { data, error } = await auth.client
      .from('products')
      .update({
        name: body.name,
        price: body.price,
        emoji: body.emoji,
        tag: body.tag,
        sort_order: body.sort_order,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`更新文创失败: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

router.delete('/api/admin/products/:id', async (req: Request, res: Response) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: '请先登录' });
      return;
    }
    const id = Number(req.params.id);
    const { error } = await auth.client.from('products').delete().eq('id', id);
    if (error) throw new Error(`删除文创失败: ${error.message}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});

export default router;