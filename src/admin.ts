import {
  getToken,
  setToken,
  login,
  logout,
  isLoggedIn,
  fetchContent,
  uploadImage,
  createBook,
  updateBook,
  deleteBook,
  createProduct,
  updateProduct,
  deleteProduct,
  downloadTemplate,
  importExcel,
  exportExcel,
  type ContentData,
  type BookItem,
  type ProductItem,
} from './api';

const AGE_GROUPS = ['大班', '中班', '小班'];
const NET_UNITS = ['包', '个', '片', '盒', '套', '支', '张', '本'];

// 可导出字段（key 与后端一致，label 为中文表头）
const BOOK_EXPORT_FIELDS: { key: string; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'title', label: '书名' },
  { key: 'series_name', label: '所属系列' },
  { key: 'price', label: '定价' },
  { key: 'isbn', label: '书号' },
  { key: 'brief', label: '简介' },
  { key: 'cover_img', label: '封面图' },
  { key: 'pages', label: '内页图片' },
  { key: 'format', label: '开本' },
  { key: 'barcode_img', label: '条形码图片' },
  { key: 'author', label: '署名' },
  { key: 'clc', label: '中图分类号' },
  { key: 'publish_date', label: '出版日期' },
  { key: 'age_group', label: '年龄段' },
  { key: 'publisher', label: '出版社' },
  { key: 'category', label: '分类' },
  { key: 'sort_order', label: '排序' },
];
const PRODUCT_EXPORT_FIELDS: { key: string; label: string }[] = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: '产品名' },
  { key: 'category', label: '类别' },
  { key: 'price', label: '定价' },
  { key: 'barcode_img', label: '条形码图片' },
  { key: 'barcode', label: '商品条码' },
  { key: 'brand', label: '商标名' },
  { key: 'net_unit', label: '净含量单位' },
  { key: 'cover_img', label: '封面图' },
  { key: 'sort_order', label: '排序' },
];

/** 后台主入口 */
export function renderAdmin(app: HTMLElement): void {
  window.scrollTo(0, 0);
  app.innerHTML = `
    <div class="min-h-screen paper-texture">
      <header class="border-b border-ink/8 bg-paper/90 backdrop-blur">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <button data-back class="flex items-center gap-2 text-sm text-ink-soft hover:text-ink">
            <span>←</span><span>返回网站</span>
          </button>
          <div class="text-right">
            <p class="serif-title text-lg font-bold">管理后台</p>
            <p id="adminStatus" class="text-xs text-ink-soft">正在加载…</p>
          </div>
        </div>
      </header>
      <main id="adminBody" class="mx-auto max-w-6xl px-6 py-10"></main>
    </div>`;

  const back = app.querySelector<HTMLElement>('[data-back]');
  back?.addEventListener('click', () => {
    window.location.hash = '#top';
  });

  if (isLoggedIn()) {
    void showDashboard();
  } else {
    showAuth();
  }
}

// ---------- 登录 ----------
function showAuth(): void {
  const body = document.getElementById('adminBody') as HTMLElement;
  if (!body) return;
  body.innerHTML = `
    <div class="mx-auto max-w-md">
      <div class="rounded-3xl border border-ink/5 bg-paper p-8 shadow-paper">
        <h2 class="serif-title text-2xl font-black">登录管理后台</h2>
        <p class="mt-1 text-sm text-ink-soft">请输入管理员账号</p>
        <form id="authForm" class="mt-6 space-y-4">
          <div>
            <label class="mb-1 block text-sm text-ink-soft">用户名</label>
            <input id="authUser" type="text" required placeholder="admin"
              class="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20" />
          </div>
          <div>
            <label class="mb-1 block text-sm text-ink-soft">密码</label>
            <input id="authPass" type="password" required placeholder="管理员密码"
              class="w-full rounded-xl border border-ink/15 px-4 py-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/20" />
          </div>
          <p id="authError" class="hidden text-sm text-coral-deep"></p>
          <button type="submit" class="btn-coral w-full rounded-full bg-coral py-3 font-medium text-white">登录</button>
        </form>
      </div>
    </div>`;

  const showError = (msg: string): void => {
    const el = document.getElementById('authError');
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
    }
  };

  document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = (document.getElementById('authUser') as HTMLInputElement).value.trim();
    const password = (document.getElementById('authPass') as HTMLInputElement).value;
    const err = document.getElementById('authError');
    if (err) err.classList.add('hidden');
    try {
      const res = await login(username, password);
      setToken(res.token);
      await showDashboard();
    } catch (ex) {
      showError(ex instanceof Error ? ex.message : '登录失败');
    }
  });
}

// ---------- 主面板 ----------
async function showDashboard(): Promise<void> {
  const body = document.getElementById('adminBody') as HTMLElement;
  const status = document.getElementById('adminStatus');
  if (status) status.textContent = '已登录';

  body.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p class="en-caption text-xs text-coral">content manager</p>
        <h2 class="serif-title text-3xl font-black">网站内容管理</h2>
        <p class="mt-1 text-sm text-ink-soft">增删改绘本与文创，修改会同步显示到首页。</p>
      </div>
      <button id="logoutBtn" class="rounded-full border border-ink/20 px-5 py-2 text-sm transition-colors hover:border-coral hover:text-coral">退出登录</button>
    </div>
    <nav id="adminTabs" class="mt-8 flex gap-2"></nav>
    <div id="adminTabBody" class="mt-6"></div>`;

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (!window.confirm('确定要退出登录吗？')) return;
    try {
      await logout();
    } catch {
      // ignore
    }
    setToken('');
    showAuth();
  });

  let active = 'books';
  let data: ContentData | null = null;

  const tabs = [
    { key: 'books', label: '📚 绘本管理' },
    { key: 'products', label: '🎁 文创管理' },
  ];

  const renderTabNav = (): void => {
    const nav = document.getElementById('adminTabs');
    if (!nav) return;
    nav.innerHTML = tabs
      .map(
        (t) => `
        <button data-tab="${t.key}"
          class="rounded-full px-5 py-2 text-sm font-medium transition-all ${
            active === t.key ? 'bg-ink text-paper' : 'bg-paper-deep/70 text-ink-soft hover:text-ink'
          }">${t.label}</button>`,
      )
      .join('');
    nav.querySelectorAll<HTMLElement>('[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        active = btn.dataset.tab ?? 'books';
        renderTabNav();
        void renderBody();
      });
    });
  };

  const renderBody = async (): Promise<void> => {
    data ??= await fetchContent();
    const tabBody = document.getElementById('adminTabBody') as HTMLElement;
    if (active === 'books') {
      const books = data.books;
      tabBody.innerHTML = `<section>${batchPanelHtml('books')}<div class="mb-6 flex justify-end"><button data-book-new class="btn-coral rounded-full bg-coral px-6 py-2 text-sm text-white">＋ 新增绘本</button></div><div id="bookList">${books.map(bookCard).join('')}</div></section>`;
      bindBatchPanel(tabBody, 'books');
      bindBookList(tabBody);
    } else {
      const products = data.products;
      tabBody.innerHTML = `<section>${batchPanelHtml('products')}<div class="mb-6 flex justify-end"><button data-product-new class="btn-coral rounded-full bg-coral px-6 py-2 text-sm text-white">＋ 新增文创</button></div><div id="productList">${products.map(productCard).join('')}</div></section>`;
      bindBatchPanel(tabBody, 'products');
      bindProductList(tabBody);
    }
  };

  renderTabNav();
  void renderBody()
    .catch((err) => {
      const tabBody = document.getElementById('adminTabBody');
      if (tabBody) tabBody.innerHTML = `<p class="text-sm text-coral-deep">加载失败：${err instanceof Error ? err.message : '未知错误'}</p>`;
    })
    .finally(() => {
      const page = document.getElementById('adminBody');
      page?.querySelector('[data-book-new]')?.scrollIntoView?.({ block: 'center' });
    });
}

// ---------- 批量管理面板（模板 / 导入 / 导出） ----------
function batchPanelHtml(kind: 'books' | 'products'): string {
  const fields = kind === 'books' ? BOOK_EXPORT_FIELDS : PRODUCT_EXPORT_FIELDS;
  const name = kind === 'books' ? '绘本' : '文创';
  return `
  <div class="mb-8 rounded-2xl border border-ink/8 bg-paper-deep/40 p-5">
    <p class="en-caption text-xs text-coral">batch tools</p>
    <h3 class="serif-title text-lg font-bold">${name} · 表格批量管理</h3>
    <p class="mt-1 text-xs leading-relaxed text-ink-soft">
      下载模板 → 在 Excel/WPS 中填写（新增留空 ID，填 ID 更新，操作列写 DELETE 删除）→ 上传导入；也可勾选字段导出。
    </p>
    <div class="mt-4 flex flex-wrap gap-3">
      <button data-tpl class="rounded-full border border-ink/20 px-4 py-2 text-xs hover:border-coral hover:text-coral">⬇ 下载导入模板</button>
      <button data-pick class="rounded-full border border-ink/20 px-4 py-2 text-xs hover:border-coral hover:text-coral">⬆ 上传 Excel 导入</button>
      <input data-file type="file" accept=".xlsx" class="hidden" />
      <button data-export class="rounded-full bg-ink px-4 py-2 text-xs text-paper hover:bg-ink/85">⬇ 导出所选字段</button>
      <button data-export-all class="rounded-full border border-ink/20 px-4 py-2 text-xs hover:border-coral hover:text-coral">⬇ 导出全部字段</button>
    </div>
    <div class="mt-4">
      <p class="mb-2 text-xs text-ink-soft">选择导出字段（不勾选点“导出全部”即可）：</p>
      <div class="flex flex-wrap gap-x-4 gap-y-1.5">
        ${fields
          .map(
            (f) => `
          <label class="flex items-center gap-1.5 text-xs text-ink-soft">
            <input type="checkbox" data-field="${f.key}" class="accent-coral" />${f.label}
          </label>`,
          )
          .join('')}
      </div>
    </div>
    <div data-import-msg class="mt-3 hidden text-xs leading-relaxed"></div>
  </div>`;
}

function bindBatchPanel(scope: HTMLElement, kind: 'books' | 'products'): void {
  const refresh = async (): Promise<void> => {
    // 导入后重新拉取最新数据并刷新当前标签
    const app = document.getElementById('adminTabBody');
    if (!app) return;
    // 重置 showDashboard 内部缓存不便访问，直接重渲染当前面板列表
    const fresh = await fetchContent();
    if (kind === 'books') {
      const list = app.querySelector<HTMLElement>('#bookList');
      if (list) {
        list.innerHTML = fresh.books.map(bookCard).join('');
        bindBookList(app);
      }
    } else {
      const list = app.querySelector<HTMLElement>('#productList');
      if (list) {
        list.innerHTML = fresh.products.map(productCard).join('');
        bindProductList(app);
      }
    }
  };

  const showMsg = (html: string, ok: boolean): void => {
    const el = scope.querySelector<HTMLElement>('[data-import-msg]');
    if (!el) return;
    el.classList.remove('hidden');
    el.classList.toggle('text-coral-deep', !ok);
    el.classList.toggle('text-moss', ok);
    el.innerHTML = html;
  };

  scope.querySelector<HTMLElement>('[data-tpl]')?.addEventListener('click', async () => {
    try {
      await downloadTemplate(kind);
    } catch (e) {
      showMsg(`模板下载失败：${e instanceof Error ? e.message : '未知错误'}`, false);
    }
  });

  const fileInput = scope.querySelector<HTMLInputElement>('[data-file]');
  scope.querySelector<HTMLElement>('[data-pick]')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    showMsg('正在导入，请稍候…', true);
    try {
      const r = await importExcel(kind, file);
      const detail =
        r.errors.length > 0 ? `<ul class="mt-1 list-disc pl-5">${r.errors.map((e) => `<li>${eat(e)}</li>`).join('')}</ul>` : '';
      const allOk = r.skipped === 0 && r.errors.length === 0;
      showMsg(
        `导入完成：新增 <b>${r.inserted}</b>，更新 <b>${r.updated}</b>，删除 <b>${r.deleted}</b>，跳过 <b>${r.skipped}</b>。${detail}`,
        allOk,
      );
      await refresh();
    } catch (e) {
      showMsg(`导入失败：${e instanceof Error ? e.message : '未知错误'}`, false);
    } finally {
      fileInput.value = '';
    }
  });

  scope.querySelector<HTMLElement>('[data-export]')?.addEventListener('click', async () => {
    const fields = Array.from(scope.querySelectorAll<HTMLInputElement>('[data-field]:checked')).map((c) => c.value);
    if (fields.length === 0) {
      showMsg('请先勾选要导出的字段，或直接点“导出全部字段”。', false);
      return;
    }
    try {
      await exportExcel(kind, fields);
    } catch (e) {
      showMsg(`导出失败：${e instanceof Error ? e.message : '未知错误'}`, false);
    }
  });

  scope.querySelector<HTMLElement>('[data-export-all]')?.addEventListener('click', async () => {
    try {
      await exportExcel(kind, []);
    } catch (e) {
      showMsg(`导出失败：${e instanceof Error ? e.message : '未知错误'}`, false);
    }
  });
}

// ---------- 绘本 ----------
function bookCard(b: BookItem): string {
  return `
    <article class="mb-5 flex flex-wrap gap-4 rounded-2xl border border-ink/5 bg-paper p-5 shadow-sm">
      <img src="${b.cover_img || ''}" alt="" class="h-28 w-20 rounded-lg bg-paper-deep object-cover" onerror="this.style.opacity=0.2" />
      <div class="min-w-[220px] flex-1">
        <div class="flex items-center justify-between gap-2">
          <h3 class="serif-title text-lg font-bold">${eat(b.title) || '（未命名）'}</h3>
          <span class="rounded-full bg-moss/15 px-3 py-0.5 text-xs text-moss">${eat(b.age_group) || '未分类'}</span>
        </div>
        <p class="mt-1 text-sm text-ink-soft">${eat(b.author)} · ${eat(b.publisher)} · ¥${eat(b.price)}</p>
        <div class="mt-3 flex gap-2">
          <button data-book-edit="${b.id}" class="rounded-full bg-ink px-4 py-1.5 text-xs text-paper hover:bg-ink/85">编辑</button>
          <button data-book-del="${b.id}" class="rounded-full border border-coral/30 px-4 py-1.5 text-xs text-coral-deep hover:bg-coral/10">删除</button>
        </div>
      </div>
    </article>`;
}

function bindBookList(root: HTMLElement): void {
  root.querySelector('[data-book-new]')?.addEventListener('click', () => openBookForm(null, () => void reloadBooks(root)));
  root.querySelectorAll<HTMLElement>('[data-book-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.bookEdit);
      const book = currentBooks.find((x) => x.id === id);
      if (book) openBookForm(book, () => void reloadBooks(root));
    });
  });
  root.querySelectorAll<HTMLElement>('[data-book-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.bookDel);
      if (!window.confirm('确定删除这本绘本吗？')) return;
      try {
        await deleteBook(id);
        await reloadBooks(root);
      } catch (err) {
        alert(err instanceof Error ? err.message : '删除失败');
      }
    });
  });
}

let currentBooks: BookItem[] = [];
async function reloadBooks(root: HTMLElement): Promise<void> {
  const data = await fetchContent();
  currentBooks = data.books;
  const list = document.getElementById('bookList');
  if (list) list.innerHTML = currentBooks.map(bookCard).join('');
  bindBookList(root);
}

// ---------- 文创 ----------
function productCard(p: ProductItem): string {
  return `
    <article class="mb-5 flex flex-wrap gap-4 rounded-2xl border border-ink/5 bg-paper p-5 shadow-sm">
      <img src="${p.cover_img || ''}" alt="" class="h-24 w-24 rounded-lg bg-paper-deep object-cover" onerror="this.style.opacity=0.2" />
      <div class="min-w-[220px] flex-1">
        <div class="flex items-center justify-between gap-2">
          <h3 class="serif-title text-lg font-bold">${eat(p.name) || '（未命名）'}</h3>
          <span class="rounded-full bg-coral/15 px-3 py-0.5 text-xs text-coral-deep">${eat(p.category) || '未分类'}</span>
        </div>
        <p class="mt-1 text-sm text-ink-soft">${eat(p.brand)} · ¥${eat(p.price)} · 净含量 ${eat(p.net_unit)}</p>
        <div class="mt-3 flex gap-2">
          <button data-product-edit="${p.id}" class="rounded-full bg-ink px-4 py-1.5 text-xs text-paper hover:bg-ink/85">编辑</button>
          <button data-product-del="${p.id}" class="rounded-full border border-coral/30 px-4 py-1.5 text-xs text-coral-deep hover:bg-coral/10">删除</button>
        </div>
      </div>
    </article>`;
}

function bindProductList(root: HTMLElement): void {
  root.querySelector('[data-product-new]')?.addEventListener('click', () => openProductForm(null, () => void reloadProducts(root)));
  root.querySelectorAll<HTMLElement>('[data-product-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.productEdit);
      const p = currentProducts.find((x) => x.id === id);
      if (p) openProductForm(p, () => void reloadProducts(root));
    });
  });
  root.querySelectorAll<HTMLElement>('[data-product-del]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.productDel);
      if (!window.confirm('确定删除这件文创吗？')) return;
      try {
        await deleteProduct(id);
        await reloadProducts(root);
      } catch (err) {
        alert(err instanceof Error ? err.message : '删除失败');
      }
    });
  });
}

let currentProducts: ProductItem[] = [];
async function reloadProducts(root: HTMLElement): Promise<void> {
  const data = await fetchContent();
  currentProducts = data.products;
  const list = document.getElementById('productList');
  if (list) list.innerHTML = currentProducts.map(productCard).join('');
  bindProductList(root);
}

// ---------- 表单 ----------
function modalShell(title: string): { wrap: HTMLElement; content: HTMLElement } {
  const body = document.getElementById('adminBody') as HTMLElement;
  const wrap = document.createElement('div');
  wrap.className = 'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm';
  wrap.innerHTML = `
    <div class="my-8 w-full max-w-3xl rounded-3xl border border-ink/5 bg-paper p-7 shadow-paper">
      <div class="mb-5 flex items-center justify-between">
        <h3 class="serif-title text-xl font-bold">${title}</h3>
        <button data-close class="rounded-full border border-ink/15 px-3 py-1 text-sm hover:border-coral hover:text-coral">关闭</button>
      </div>
      <div data-form-body></div>
    </div>`;
  body.appendChild(wrap);
  wrap.querySelector('[data-close]')?.addEventListener('click', () => wrap.remove());
  wrap.addEventListener('click', (e) => {
    if (e.target === wrap) wrap.remove();
  });
  return { wrap, content: wrap.querySelector<HTMLElement>('[data-form-body]') as HTMLElement };
}

/** 图片上传输入（单选图片，显示预览） */
function imageInput(field: string, label: string, value: string): string {
  return `
    <label>
      <span class="mb-1 block text-xs text-ink-soft">${label}</span>
      <div class="flex gap-3">
        <img data-img-preview data-hook="${field}" src="${value || ''}" alt=""
          class="h-20 w-16 rounded-lg bg-paper-deep object-cover" onerror="this.style.opacity=0.15" />
        <input data-hook="${field}" type="text" value="${eat(value)}" placeholder="图片地址（或点右侧上传）"
          class="flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
        <label class="cursor-pointer rounded-lg border border-ink/20 px-3 py-2 text-xs text-ink-soft hover:border-coral hover:text-coral">
          上传<input type="file" accept="image/*" data-upload data-hook="${field}" class="hidden" />
        </label>
      </div>
    </label>`;
}

function field(field: string, label: string, value: string, opts: { placeholder?: string; textarea?: boolean } = {}): string {
  if (opts.textarea) {
    return `
      <label class="sm:col-span-2">
        <span class="mb-1 block text-xs text-ink-soft">${label}</span>
        <textarea data-hook="${field}" rows="3" placeholder="${opts.placeholder ?? ''}"
          class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral">${eat(value)}</textarea>
      </label>`;
  }
  return `
    <label>
      <span class="mb-1 block text-xs text-ink-soft">${label}</span>
      <input data-hook="${field}" type="text" value="${eat(value)}" placeholder="${opts.placeholder ?? ''}"
        class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral" />
    </label>`;
}

function selectField(field: string, label: string, options: string[], value: string, placeholder = '请选择'): string {
  return `
    <label>
      <span class="mb-1 block text-xs text-ink-soft">${label}</span>
      <select data-hook="${field}"
        class="w-full rounded-lg border border-ink/15 px-3 py-2 text-sm outline-none focus:border-coral">
        <option value="">${placeholder}</option>
        ${options.map((o) => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
      </select>
    </label>`;
}

/** 多图上传编辑器（可变数量，如绘本内页） */
function multiImageEditor(field: string, label: string, urls: string[]): string {
  return `
    <label class="sm:col-span-2">
      <span class="mb-1 block text-xs text-ink-soft">${label}（可多张，点右上角 × 删除）</span>
      <div class="flex flex-wrap gap-3" data-multi="${field}">
        ${urls.map((u, i) => multiItem(field, u, i)).join('')}
      </div>
      <div class="mt-2 flex items-center gap-2">
        <label class="cursor-pointer rounded-lg border border-ink/20 px-4 py-2 text-xs text-ink-soft hover:border-coral hover:text-coral">
          ＋ 添加图片<input type="file" accept="image/*" multiple data-multi-add="${field}" class="hidden" />
        </label>
        <button type="button" data-multi-text-add="${field}" class="rounded-lg border border-ink/20 px-3 py-2 text-xs text-ink-soft hover:border-coral hover:text-coral">＋ 手动填地址</button>
      </div>
    </label>`;
}

function multiItem(field: string, url: string, idx: number): string {
  return `
    <div class="relative">
      <img src="${eat(url)}" alt="" class="${idx === 0 ? 'h-32 w-24' : 'h-24 w-20'} rounded-lg border border-ink/10 bg-paper-deep object-cover" onerror="this.style.opacity=0.15" />
      <input type="hidden" data-multi-val="${field}" value="${eat(url)}" />
      <button type="button" data-multi-remove="${field}" class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-[10px] text-paper">×</button>
    </div>`;
}

function bindUploads(form: HTMLElement, onChanged: () => void): void {
  form.querySelectorAll<HTMLInputElement>('[data-upload]').forEach((input) => {
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const field = input.dataset.hook ?? '';
      try {
        input.disabled = true;
        const url = await uploadImage(file);
        const text = form.querySelector<HTMLInputElement>(`input[data-hook="${field}"]`);
        const img = form.querySelector<HTMLImageElement>(`img[data-img-preview][data-hook="${field}"]`);
        if (text) text.value = url;
        if (img) img.src = url;
        onChanged();
      } catch (err) {
        alert(err instanceof Error ? err.message : '上传失败');
      } finally {
        input.disabled = false;
        input.value = '';
      }
    });
  });

  form.querySelectorAll<HTMLInputElement>('[data-multi-add]').forEach((input) => {
    input.addEventListener('change', async () => {
      const field = input.dataset.multiAdd ?? '';
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return;
      input.disabled = true;
      try {
        for (const file of files) {
          const url = await uploadImage(file);
          appendMultiItem(form, field, url);
        }
        onChanged();
      } catch (err) {
        alert(err instanceof Error ? err.message : '上传失败');
      } finally {
        input.disabled = false;
        input.value = '';
      }
    });
  });

  form.querySelectorAll<HTMLElement>('[data-multi-text-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const field = btn.dataset.multiTextAdd ?? '';
      const url = window.prompt('请输入图片地址（/uploads/xxx 或完整链接）');
      if (url) {
        appendMultiItem(form, field, url);
        onChanged();
      }
    });
  });

  form.querySelectorAll<HTMLElement>('[data-multi-remove]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.closest('.relative')?.remove();
      onChanged();
    });
  });
}

function appendMultiItem(form: HTMLElement, field: string, url: string): void {
  const container = form.querySelector<HTMLElement>(`[data-multi="${field}"]`);
  if (!container) return;
  container.insertAdjacentHTML('beforeend', multiItem(field, url, container.children.length));
  const addBtn = container.closest('label')?.querySelector(`[data-multi-add="${field}"]`);
  if (addBtn) {
    const input = addBtn as HTMLInputElement;
    const newInput = input.cloneNode() as HTMLInputElement;
    input.replaceWith(newInput);
    void initMultiAdd(newInput, field, onMultiAdd);
  }
}

let onMultiAdd: (form: HTMLElement, field: string) => void = () => undefined;
function initMultiAdd(input: HTMLInputElement, field: string, cb: (form: HTMLElement, field: string) => void): void {
  input.addEventListener('change', async () => {
    const files = Array.from(input.files ?? []);
    if (files.length === 0) return;
    const form = input.closest('form') as HTMLElement;
    input.disabled = true;
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        appendMultiItem(form, field, url);
      }
      cb(form, field);
    } catch (err) {
      alert(err instanceof Error ? err.message : '上传失败');
    } finally {
      input.disabled = false;
      input.value = '';
    }
  });
}

function readHooks(form: HTMLElement): Record<string, string> {
  const result: Record<string, string> = {};
  form.querySelectorAll<HTMLElement>('[data-hook]').forEach((el) => {
    const field = el.dataset.hook ?? '';
    if (!field || el.tagName === 'IMG') return;
    const input = el as HTMLInputElement;
    if (input.type !== 'file') result[field] = input.value;
  });
  return result;
}

function readMulti(form: HTMLElement, field: string): string[] {
  const vals = Array.from(form.querySelectorAll<HTMLInputElement>(`[data-multi-val="${field}"]`));
  return vals.map((v) => v.value).filter(Boolean);
}

function textOf(form: HTMLElement, field: string): string {
  const el = form.querySelector<HTMLInputElement>(`[data-hook="${field}"]`);
  return el ? el.value.trim() : '';
}

// ---------- 绘本编辑表单 ----------
function openBookForm(book: BookItem | null, afterSave: () => void): void {
  const { wrap, content } = modalShell(book ? '编辑绘本' : '新增绘本');

  const cover = book?.cover_img ?? '';
  const barcode = book?.barcode_img ?? '';
  const pages = book?.pages ?? [];

  content.innerHTML = `
    <form class="grid gap-3 sm:grid-cols-2">
      ${field('title', '书名', book?.title ?? '', { placeholder: '绘本书名' })}
      ${field('series_name', '所属系列名', book?.series_name ?? '', { placeholder: '系列名，单本填「单本」' })}
      ${field('price', '定价', book?.price ?? '', { placeholder: '如 28.00' })}
      ${field('isbn', '书号', book?.isbn ?? '', { placeholder: 'ISBN' })}
      ${field('author', '署名（作者）', book?.author ?? '')}
      ${field('publisher', '出版社', book?.publisher ?? '')}
      ${field('publish_date', '出版日期', book?.publish_date ?? '', { placeholder: '如 2024-05' })}
      ${field('clc', '中图分类号', book?.clc ?? '', { placeholder: '如 J228' })}
      ${field('format', '开本信息', book?.format ?? '', { placeholder: '如 16开 / 1/16' })}
      ${field('category', '分类', book?.category ?? '', { placeholder: '如 绘本/童书' })}
      ${field('sort_order', '排序（小在前）', String(book?.sort_order ?? 0))}
      ${selectField('age_group', '年龄段', AGE_GROUPS, book?.age_group ?? '', '请选择年龄段')}
      ${field('brief', '简介', book?.brief ?? '', { textarea: true, placeholder: '绘本简介' })}
      ${imageInput('cover_img', '封面图', cover)}
      ${imageInput('barcode_img', '条形码图片', barcode)}
      ${multiImageEditor('pages', '内页展示（多图）', pages)}
      <div class="sm:col-span-2 mt-2 flex gap-3">
        <button type="submit" class="btn-coral flex-1 rounded-full bg-coral py-3 text-white">保存</button>
        <button type="button" data-cancel class="rounded-full border border-ink/20 px-6 py-3 text-sm">取消</button>
      </div>
    </form>`;

  const form = content.querySelector('form') as HTMLElement;
  bindUploads(form, () => undefined);
  content.querySelector('[data-cancel]')?.addEventListener('click', () => wrap.remove());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body: Record<string, unknown> = readHooks(form);
    body.pages = readMulti(form, 'pages');
    body.sort_order = Number(body.sort_order || 0);
    if (!body.title) {
      alert('请填写书名');
      return;
    }
    try {
      if (book) await updateBook(book.id, body);
      else await createBook(body);
      wrap.remove();
      afterSave();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    }
  });
}

// ---------- 文创编辑表单 ----------
function openProductForm(product: ProductItem | null, afterSave: () => void): void {
  const { wrap, content } = modalShell(product ? '编辑文创' : '新增文创');

  content.innerHTML = `
    <form class="grid gap-3 sm:grid-cols-2">
      ${field('name', '产品名', product?.name ?? '', { placeholder: '文创名称' })}
      ${field('category', '类别', product?.category ?? '', { placeholder: '如 文具/生活' })}
      ${field('price', '定价', product?.price ?? '', { placeholder: '如 36.00' })}
      ${field('barcode', '商品条码', product?.barcode ?? '', { placeholder: '条码数字' })}
      ${field('brand', '商标名', product?.brand ?? '')}
      ${selectField('net_unit', '净含量单位', NET_UNITS, product?.net_unit ?? '', '请选择单位（包/个/片…）')}
      ${field('sort_order', '排序（小在前）', String(product?.sort_order ?? 0))}
      ${imageInput('cover_img', '产品图片', product?.cover_img ?? '')}
      ${imageInput('barcode_img', '条形码图片', product?.barcode_img ?? '')}
      <div class="sm:col-span-2 mt-2 flex gap-3">
        <button type="submit" class="btn-coral flex-1 rounded-full bg-coral py-3 text-white">保存</button>
        <button type="button" data-cancel class="rounded-full border border-ink/20 px-6 py-3 text-sm">取消</button>
      </div>
    </form>`;

  const form = content.querySelector('form') as HTMLElement;
  bindUploads(form, () => undefined);
  content.querySelector('[data-cancel]')?.addEventListener('click', () => wrap.remove());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body: Record<string, unknown> = readHooks(form);
    body.sort_order = Number(body.sort_order || 0);
    if (!body.name) {
      alert('请填写产品名');
      return;
    }
    try {
      if (product) await updateProduct(product.id, body);
      else await createProduct(body);
      wrap.remove();
      afterSave();
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败');
    }
  });
}

// ---------- 工具 ----------
function eat(value: string | null | undefined): string {
  if (!value) return '';
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}