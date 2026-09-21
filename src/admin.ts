import { getSupabaseBrowserClient, getSessionToken } from './supabase';
import type { SupabaseClient, Session } from '@supabase/supabase-js';

interface BookItem {
  id: number;
  title: string;
  en: string;
  author: string;
  desc: string | null;
  img: string;
}
interface ProductItem {
  id: number;
  name: string;
  price: string;
  emoji: string;
  tag: string;
}

let currentSession: Session | null = null;

async function api<T>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: unknown): Promise<T> {
  const token = await getSessionToken();
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-session': token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || (json && typeof json === 'object' && 'error' in json && (json as { error?: string }).error)) {
    throw new Error((json as { error?: string } | null)?.error ?? `请求失败 (HTTP ${res.status})`);
  }
  return json as T;
}

/** 后台主入口 */
export async function renderAdmin(app: HTMLElement): Promise<void> {
  window.scrollTo(0, 0);
  app.innerHTML = `
    <div class="min-h-screen paper-texture">
      <header class="border-b border-ink/8 bg-paper/90 backdrop-blur">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <button data-back class="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <span>←</span><span>返回网站</span>
          </button>
          <div class="text-right">
            <p class="serif-title text-lg font-bold">管理后台</p>
            <p id="adminStatus" class="text-xs text-ink-soft">正在加载…</p>
          </div>
        </div>
      </header>
      <main id="adminBody" class="mx-auto max-w-5xl px-6 py-10"></main>
    </div>`;

  const back = app.querySelector<HTMLElement>('[data-back]');
  back?.addEventListener('click', () => {
    window.location.hash = '#top';
  });

  const supabase = await getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  currentSession = data.session;

  if (currentSession) {
    await showDashboard(supabase);
  } else {
    showAuth();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    const status = app.querySelector('#adminStatus');
    if (status) status.textContent = session ? `已登录 · ${session.user.email ?? ''}` : '未登录';
  });
}

// ---------- 登录 / 注册 ----------
function showAuth(): void {
  const app = document.getElementById('adminBody') as HTMLElement;
  if (!app) return;
  app.innerHTML = `
    <div class="mx-auto max-w-md">
      <div class="rounded-3xl border border-ink/5 bg-paper p-8 shadow-paper">
        <h2 id="authTitle" class="serif-title text-2xl font-black">登录管理后台</h2>
        <p class="mt-1 text-sm text-ink-soft">只有你能修改网站内容</p>
        <form id="authForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-1 block text-sm text-ink-soft">邮箱</label>
            <input id="authEmail" type="email" required placeholder="you@example.com"
              class="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-ink-soft">密码</label>
            <input id="authPass" type="password" required placeholder="至少 6 位"
              class="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20" />
          </div>
          <div id="authPass2Wrap" class="hidden">
            <label class="mb-1 block text-sm text-ink-soft">确认密码</label>
            <input id="authPass2" type="password" class="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20" />
          </div>
          <p id="authError" class="hidden text-sm text-coral-deep"></p>
          <button type="submit" id="authSubmit" class="btn-coral w-full rounded-full bg-coral py-3 font-medium text-white">登录</button>
        </form>
        <p class="mt-4 text-center text-sm text-ink-soft">
          <button id="toggleMode" class="underline decoration-gold underline-offset-4 hover:text-ink">没有账号？去注册</button>
        </p>
      </div>
    </div>`;

  let isRegister = false;
  const title = app.querySelector<HTMLElement>('#authTitle');
  const submit = app.querySelector<HTMLButtonElement>('#authSubmit');
  const toggleMode = app.querySelector<HTMLButtonElement>('#toggleMode');
  const pass2Wrap = app.querySelector<HTMLElement>('#authPass2Wrap');
  const pass2 = app.querySelector<HTMLInputElement>('#authPass2');
  const authError = app.querySelector<HTMLElement>('#authError');

  const setMode = (reg: boolean): void => {
    isRegister = reg;
    if (title) title.textContent = reg ? '注册管理员账号' : '登录管理后台';
    if (submit) submit.textContent = reg ? '注册并登录' : '登录';
    if (toggleMode) toggleMode.textContent = reg ? '已有账号？去登录' : '没有账号？去注册';
    if (pass2Wrap) pass2Wrap.classList.toggle('hidden', !reg);
  };

  const showError = (msg: string): void => {
    if (authError) {
      authError.textContent = msg;
      authError.classList.remove('hidden');
    }
  };

  toggleMode?.addEventListener('click', () => setMode(!isRegister));

  document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('authEmail') as HTMLInputElement).value.trim();
    const password = (document.getElementById('authPass') as HTMLInputElement).value;
    if (authError) authError.classList.add('hidden');

    if (isRegister) {
      if (password.length < 6) {
        showError('密码至少需要 6 位');
        return;
      }
      if (password !== (pass2?.value ?? '')) {
        showError('两次输入的密码不一致');
        return;
      }
    }

    try {
      const supabase = await getSupabaseBrowserClient();
      if (isRegister) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw new Error(error.message);
        if (data.session) {
          currentSession = data.session;
          await showDashboard(supabase);
        } else {
          setMode(false);
          showError('注册成功，请前往邮箱完成验证后登录（或稍后直接登录）。');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error('邮箱或密码错误');
        currentSession = data.session;
        await showDashboard(supabase);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : '操作失败');
    }
  });
}

// ---------- 管理面板 ----------
async function loadContent(): Promise<{ books: BookItem[]; products: ProductItem[] }> {
  const data = await api<{ books: BookItem[]; products: ProductItem[] }>('/api/content', 'GET');
  return data;
}

async function showDashboard(supabase: SupabaseClient): Promise<void> {
  const app = document.getElementById('adminBody') as HTMLElement;
  if (!app) return;
  const status = document.querySelector('#adminStatus');
  if (status) status.textContent = `已登录 · ${currentSession?.user.email ?? ''}`;

  app.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="en-caption text-xs text-coral">content manager</p>
        <h2 class="serif-title text-3xl font-black">网站内容管理</h2>
        <p class="mt-1 text-sm text-ink-soft">在这里增删改绘本与文创，修改会同步显示到首页。</p>
      </div>
      <button id="logoutBtn" class="rounded-full border border-ink/20 px-5 py-2 text-sm transition-colors hover:border-coral hover:text-coral">退出登录</button>
    </div>

    <nav id="adminTabs" class="mt-8 flex gap-2"></nav>
    <div id="adminTabBody" class="mt-6"></div>`;

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    const yes = window.confirm('确定要退出登录吗？');
    if (!yes) return;
    await supabase.auth.signOut();
    currentSession = null;
    showAuth();
  });

  const tabs = [
    { key: 'books', label: '📚 绘本管理' },
    { key: 'products', label: '🎁 文创管理' },
  ];
  const tabNav = document.getElementById('adminTabs');

  let active = 'books';
  let books: BookItem[] = [];
  let products: ProductItem[] = [];

  const renderTabNav = (): void => {
    if (!tabNav) return;
    tabNav.innerHTML = tabs
      .map(
        (t) => `
        <button data-tab="${t.key}"
          class="rounded-full px-5 py-2 text-sm font-medium transition-all ${
            active === t.key ? 'bg-ink text-paper' : 'bg-paper-deep/70 text-ink-soft hover:text-ink'
          }">${t.label}</button>`,
      )
      .join('');
    tabNav.querySelectorAll<HTMLElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        active = btn.dataset.tab ?? 'books';
        renderTabNav();
        renderBody();
      });
    });
  };

  const renderBody = async (): Promise<void> => {
    const body = document.getElementById('adminTabBody') as HTMLElement;
    if (!body) return;
    try {
      const content = await loadContent();
      books = content.books;
      products = content.products;
      if (active === 'books') {
        body.innerHTML = renderBooks();
        bindBooks(body);
      } else {
        body.innerHTML = renderProducts();
        bindProducts(body);
      }
      (body.querySelector('[data-new]') as HTMLElement | null)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      body.innerHTML = `<p class="text-sm text-coral-deep">加载失败：${err instanceof Error ? err.message : '未知错误'}</p>`;
    }
  };

  renderTabNav();
  void renderBody();

  // ---------- 绘本 ----------
  const renderBooks = (): string => `
    <section>
      ${books
        .map(
          (b) => ` 
          <article class="mb-4 rounded-2xl border border-ink/5 bg-paper p-5 shadow-sm">
            <div class="flex flex-wrap gap-4">
              <img src="${b.img || ''}" alt="" class="h-24 w-16 rounded-lg bg-paper-deep object-cover" onerror="this.style.opacity=0.2" />
              <div class="min-w-[180px] flex-1">
                <div class="grid gap-2 sm:grid-cols-2">
                  ${fieldInput('title', '书名', b.title)}
                  ${fieldInput('en', '英文名', b.en)}
                  ${fieldInput('author', '作者', b.author)}
                  ${fieldInput('sort_order_book', '排序', String((b as unknown as { sort_order?: number }).sort_order ?? 0))}
                  ${fieldInput('img', '图片链接', b.img, true)}
                </div>
                <div class="mt-2">
                  <input data-field="desc" value="${escapeAttr(b.desc ?? '')}" placeholder="简介"
                    class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
                </div>
                <div class="mt-3 flex gap-2">
                  <button data-save-b="${b.id}" class="rounded-full bg-ink px-4 py-1.5 text-xs text-paper transition-colors hover:bg-ink/85">保存</button>
                  <button data-del-b="${b.id}" class="rounded-full border border-coral/30 px-4 py-1.5 text-xs text-coral-deep transition-colors hover:bg-coral/10">删除</button>
                </div>
              </div>
            </div>
          </article>`,
        )
        .join('')}

      <div class="mt-6 rounded-2xl border border-dashed border-coral/40 bg-coral/5 p-5">
        <h3 class="serif-title mb-3 font-bold">＋ 新增绘本</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          ${fieldInput('n_title', '书名', '')}
          ${fieldInput('n_en', '英文名', '')}
          ${fieldInput('n_author', '作者', '')}
          ${fieldInput('n_sort', '排序', '0')}
          ${fieldInput('n_img', '图片链接', '', true)}
        </div>
        <div class="mt-2">
          <input id="n_desc" placeholder="简介" class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
        </div>
        <button id="addBook" class="btn-coral mt-3 rounded-full bg-coral px-6 py-2 text-sm text-white">保存新绘本</button>
      </div>
    </section>`;

  const bindBooks = (body: HTMLElement): void => {
    body.querySelectorAll<HTMLElement>('[data-save-b]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.saveB);
        const card = btn.closest('article') as HTMLElement;
        if (!card) return;
        const payload = readFields(card);
        try {
          await api(`/api/admin/books/${id}`, 'PUT', payload);
          btn.textContent = '已保存 ✓';
          window.setTimeout(() => (btn.textContent = '保存'), 1200);
        } catch (err) {
          alert(err instanceof Error ? err.message : '保存失败');
        }
      });
    });
    body.querySelectorAll<HTMLElement>('[data-del-b]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.delB);
        if (!window.confirm('确定删除这本绘本吗？')) return;
        try {
          await api(`/api/admin/books/${id}`, 'DELETE');
          await renderBody();
        } catch (err) {
          alert(err instanceof Error ? err.message : '删除失败');
        }
      });
    });
    body.querySelector<HTMLElement>('#addBook')?.addEventListener('click', async () => {
      const title = valueOf('n_title');
      const en = valueOf('n_en');
      const author = valueOf('n_author');
      const sort_order = Number(valueOf('n_sort') || '0');
      const img = valueOf('n_img');
      const desc = valueOf('n_desc');
      if (!title) {
        alert('请填写书名');
        return;
      }
      try {
        await api('/api/admin/books', 'POST', { title, en, author, desc, img, sort_order });
        await renderBody();
      } catch (err) {
        alert(err instanceof Error ? err.message : '新增失败');
      }
    });
  };

  // ---------- 文创 ----------
  const renderProducts = (): string => `
    <section>
      ${products
        .map(
          (p) => `
          <article class="mb-4 rounded-2xl border border-ink/5 bg-paper p-5 shadow-sm">
            <div class="grid gap-2 sm:grid-cols-4">
              ${fieldInput('name', '名称', p.name)}
              ${fieldInput('price', '价格', p.price)}
              ${fieldInput('tag', '标签', p.tag)}
              ${fieldInput('sort_order_product', '排序', String((p as unknown as { sort_order?: number }).sort_order ?? 0))}
            </div>
            <div class="mt-2 flex items-center gap-2">
              <input data-field="emoji" value="${escapeAttr(p.emoji)}" placeholder="图标/emoji"
                class="w-40 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
              <button data-save-p="${p.id}" class="rounded-full bg-ink px-4 py-1.5 text-xs text-paper hover:bg-ink/85">保存</button>
              <button data-del-p="${p.id}" class="rounded-full border border-coral/30 px-4 py-1.5 text-xs text-coral-deep hover:bg-coral/10">删除</button>
            </div>
          </article>`,
        )
        .join('')}

      <div class="mt-6 rounded-2xl border border-dashed border-coral/40 bg-coral/5 p-5">
        <h3 class="serif-title mb-3 font-bold">＋ 新增文创</h3>
        <div class="grid gap-2 sm:grid-cols-4">
          ${fieldInput('np_name', '名称', '')}
          ${fieldInput('np_price', '价格', '')}
          ${fieldInput('np_tag', '标签', '')}
          ${fieldInput('np_sort', '排序', '0')}
        </div>
        <div class="mt-2">
          <input id="np_emoji" placeholder="图标/emoji" class="w-40 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
        </div>
        <button id="addProduct" class="btn-coral mt-3 rounded-full bg-coral px-6 py-2 text-sm text-white">保存新文创</button>
      </div>
    </section>`;

  const bindProducts = (body: HTMLElement): void => {
    body.querySelectorAll<HTMLElement>('[data-save-p]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.saveP);
        const card = btn.closest('article') as HTMLElement;
        if (!card) return;
        const payload = readFields(card);
        try {
          await api(`/api/admin/products/${id}`, 'PUT', payload);
          btn.textContent = '已保存 ✓';
          window.setTimeout(() => (btn.textContent = '保存'), 1200);
        } catch (err) {
          alert(err instanceof Error ? err.message : '保存失败');
        }
      });
    });
    body.querySelectorAll<HTMLElement>('[data-del-p]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.delP);
        if (!window.confirm('确定删除这件文创吗？')) return;
        try {
          await api(`/api/admin/products/${id}`, 'DELETE');
          await renderBody();
        } catch (err) {
          alert(err instanceof Error ? err.message : '删除失败');
        }
      });
    });
    body.querySelector<HTMLElement>('#addProduct')?.addEventListener('click', async () => {
      const name = valueOf('np_name');
      const price = valueOf('np_price');
      const tag = valueOf('np_tag');
      const sort_order = Number(valueOf('np_sort') || '0');
      const emoji = valueOf('np_emoji');
      if (!name) {
        alert('请填写名称');
        return;
      }
      try {
        await api('/api/admin/products', 'POST', { name, price, tag, emoji, sort_order });
        await renderBody();
      } catch (err) {
        alert(err instanceof Error ? err.message : '新增失败');
      }
    });
  };
}

// ---------- 小工具 ----------
function fieldInput(field: string, label: string, value: string, full = false): string {
  return `
    <label class="${full ? 'sm:col-span-2' : ''}">
      <span class="mb-1 block text-xs text-ink-soft">${label}</span>
      <input data-field="${field}" value="${escapeAttr(value)}"
        class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
    </label>`;
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readFields(root: HTMLElement): Record<string, string | number> {
  const result: Record<string, string | number> = {};
  root.querySelectorAll<HTMLElement>('[data-field]').forEach((input) => {
    const el = input as HTMLInputElement;
    const field = el.dataset.field ?? '';
    if (!field) return;
    const isSort = field.startsWith('sort_order');
    result[isSort ? 'sort_order' : field] = isSort ? Number(el.value || 0) : el.value;
  });
  return result;
}

function valueOf(id: string): string {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return el?.value ?? '';
}