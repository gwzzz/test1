import './index.css';
import { renderAdmin } from './admin';

interface Book {
  title: string;
  en: string;
  author: string;
  desc: string;
  img: string;
}
interface Product {
  name: string;
  price: string;
  emoji: string;
  tag: string;
}
interface ContentData {
  books: Book[];
  products: Product[];
}

// ---------- 默认素材（内容未从后端返回时兜底展示） ----------
const DEFAULT_BOOKS: Book[] = [
  { img: 'https://coze-coding-project.tos.coze.site/coze_storage_7687877259167825963/image/generate_image_fef078c8-5cfb-49b0-806a-27d208a13bd1.jpeg?sign=1821511797-da5922d401-0-e613406fb624512117b7225fddc3ef885ca25423f8f394e0e446f335100c5db3', title: '提灯的小狐狸', en: 'The Lantern Fox', author: '纸间 · 阿末', desc: '一只在雨夜里为迷路的旅人点亮灯笼的小狐狸，关于善意与陪伴的最温柔一课。' },
  { img: 'https://coze-coding-project.tos.coze.site/coze_storage_7687877259167825963/image/generate_image_36ee6414-0e61-410b-8ce4-404b40e559cd.jpeg?sign=1821511797-0880e54fa5-0-87513fec4e09bc4d10c4c2f4a2a454c7c02402eba751e777d3fd2a6383ea01ce', title: '鲸鱼的星空', en: 'The Star Whale', author: '纸间 · 苏黎', desc: '会唱歌的鲸鱼驮着满天星辰游过深海，教孩子看见黑暗里的光。' },
  { img: 'https://coze-coding-project.tos.coze.site/coze_storage_7687877259167825963/image/generate_image_65e87e22-89ba-4d2e-8b70-5162665d8ca9.jpeg?sign=1821511798-bb62f81047-0-cc9fd8d92ab54f3d07f1cebc719ad8c2ab69f264153b367b59fa6549616e03a5', title: '四季的茶杯', en: 'A Cup for Seasons', author: '纸间 · 十一', desc: '蜗牛与花草围着冒热气的茶杯，认真过好每一个小而具体的日子。' },
  { img: 'https://coze-coding-project.tos.coze.site/coze_storage_7687877259167825963/image/generate_image_8593f13e-7804-4c30-b617-50c2c6faca91.jpeg?sign=1821511797-fc4c5b4a1c-0-d3bb20fa787bccdecf7333260fe26a3fa10d1c077cf28568ed729dd099ba5588', title: '我想慢慢长大', en: 'Cloud, Please Wait', author: '纸间 · 阿末', desc: '不爱长高的小云朵和它的小男孩朋友，一场关于成长与告别的对话。' },
];
const DEFAULT_PRODUCTS: Product[] = [
  { name: '水彩帆布托特包', price: '¥68', emoji: '🎒', tag: '经典款' },
  { name: '四季明信片套组', price: '¥36', emoji: '💌', tag: '新上架' },
  { name: '搪瓷小狐狸徽章', price: '¥22', emoji: '📛', tag: '热销' },
  { name: '原木手账书签', price: '¥18', emoji: '🍃', tag: '手作' },
];
const IMG_HERO = 'https://coze-coding-project.tos.coze.site/coze_storage_7687877259167825963/image/generate_image_b595ff20-d6c9-443f-80d2-5dfb5fd90893.jpeg?sign=1821511797-08f03540c8-0-211f1aaab3bcc276add4fb261e6263baf185a96ee6665c350029df88d278ee98';
const IMG_CRAFT = 'https://coze-coding-project.tos.coze.site/coze_storage_7687877259167825963/image/generate_image_3a79aef6-6216-402b-9491-ca2620b92303.jpeg?sign=1821511798-8efcdc8724-0-2d59112af1a8534df42b2d4152c00d99c60b14e686cc73fc735065f4d0aadfde';
const IMG_WHALE = DEFAULT_BOOKS[1].img;

const BOOK_CARD_HTML = (b: Book): string => `
  <article class="grid-in">
    <div class="img-zoom card-lift overflow-hidden rounded-3xl shadow-paper">
      <img src="${b.img}" alt="${b.title}" class="aspect-[3/4] w-full object-cover" loading="lazy" onerror="this.style.opacity=0.25" />
    </div>
    <div class="mt-4 px-1">
      <p class="en-caption text-[11px] text-gold">${b.en}</p>
      <h3 class="serif-title mt-1 text-xl font-bold">${b.title}</h3>
      <p class="mt-1 text-xs text-ink-soft">${b.author}</p>
      <p class="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">${b.desc}</p>
    </div>
  </article>`;

const PRODUCT_CARD_HTML = (p: Product): string => `
  <div class="card-lift grid-in rounded-3xl border border-ink/5 bg-paper p-6 shadow-sm">
    <span class="mb-4 inline-block rounded-full bg-moss/15 px-3 py-1 text-xs font-medium text-moss">${p.tag}</span>
    <div class="mb-3 text-4xl">${p.emoji}</div>
    <h3 class="serif-title font-bold">${p.name}</h3>
    <div class="mt-4 flex items-center justify-between">
      <span class="text-lg font-bold text-coral">${p.price}</span>
      <button data-add="${p.name}" class="add-btn rounded-full border border-ink/15 px-4 py-1.5 text-xs font-medium transition-all hover:border-coral hover:bg-coral hover:text-white">放入篮子</button>
    </div>
  </div>`;

function buildLayout(books: Book[], products: Product[]): string {
  const features = [
    { icon: '🖌️', title: '手绘水彩', desc: '每一页都由插画师手工起稿、晕染上色，保留纸张与颜料的温度。' },
    { icon: '📖', title: '孩子气叙事', desc: '用孩子听得懂的语言，讲那些被大人忘记的、小而重要的心事。' },
    { icon: '♻️', title: '环保纸张', desc: '大豆油墨与环保用纸，故事温柔，对地球也一样温柔。' },
  ];
  const notes = [
    { en: 'i · paper', title: '一张纸的旅程', text: '从木浆到水彩，从草图到装帧，跟着一本书在工作室里旅行的三天。' },
    { en: 'ii · brush', title: '插画师的一周', text: '跟随阿末的画笔，看小狐狸如何从一抹橘色慢慢长出眼睛与尾巴。' },
    { en: 'iii · gift', title: '手作礼物课', text: '和孩子一起做一枚水彩书签，把喜欢的故事装进口袋。' },
  ];

  return `
  <div class="min-h-screen">
    <header id="siteNav" class="fixed inset-x-0 top-0 z-50 transition-all duration-500">
      <nav class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <a href="#top" class="flex items-center gap-2.5">
          <img src="/logo.jpg" alt="千遇文化 logo" class="h-9 w-9 object-contain md:h-11 md:w-auto" />
          <span class="serif-title text-lg font-bold tracking-wide text-ink">千遇文化</span>
        </a>
        <div class="hidden items-center gap-8 text-sm text-ink-soft md:flex">
          <a href="#about" class="transition-colors hover:text-ink">关于</a>
          <a href="#books" class="transition-colors hover:text-ink">绘本系列</a>
          <a href="#craft" class="transition-colors hover:text-ink">文创周边</a>
          <a href="#studio" class="transition-colors hover:text-ink">创作手记</a>
          <a href="#subscribe" class="rounded-full bg-ink px-5 py-2 text-paper transition-all hover:-translate-y-0.5 hover:shadow-paper">订阅来信</a>
        </div>
        <button id="menuBtn" class="text-2xl md:hidden" aria-label="打开菜单">☰</button>
      </nav>
      <div id="mobileMenu" class="hidden flex-col gap-4 border-t border-ink/5 bg-paper/95 px-6 py-4 text-ink-soft backdrop-blur md:hidden">
        <a href="#about" class="mobile-link">关于</a>
        <a href="#books" class="mobile-link">绘本系列</a>
        <a href="#craft" class="mobile-link">文创周边</a>
        <a href="#studio" class="mobile-link">创作手记</a>
        <a href="#subscribe" class="mobile-link">订阅来信</a>
      </div>
    </header>

    <main>
      <section id="top" class="relative overflow-hidden pt-28 md:pt-32">
        <div class="pointer-events-none absolute inset-0 paper-texture"></div>
        <div class="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-20 md:grid-cols-2 md:pb-28">
          <div class="space-y-7">
            <p class="en-caption text-xs text-coral">once upon a time · 纸间故事</p>
            <h1 class="serif-title text-4xl font-black leading-tight md:text-6xl">把故事揉进纸里，<br/>送给长大后的你</h1>
            <p class="max-w-md leading-relaxed text-ink-soft">我们是一家小小的绘本工作室，画温柔的水彩，做有温度的手作文创。愿每一本书，都像一盏床头小灯。</p>
            <div class="flex flex-wrap gap-4">
              <a href="#books" class="btn-coral rounded-full bg-coral px-7 py-3 font-medium text-white">逛逛绘本 →</a>
              <a href="#craft" class="rounded-full border border-ink/20 px-7 py-3 font-medium transition-colors hover:border-ink">看看文创</a>
            </div>
            <div class="flex items-center gap-6 pt-2 text-sm text-ink-soft">
              <span><b class="mr-1 text-lg text-ink">240+</b> 本绘本</span>
              <span class="h-4 w-px bg-ink/10"></span>
              <span><b class="mr-1 text-lg text-ink">18</b> 位插画师</span>
              <span class="h-4 w-px bg-ink/10"></span>
              <span><b class="mr-1 text-lg text-ink">12k</b> 位小读者</span>
            </div>
          </div>
          <div class="hero-scene relative">
            <div class="img-zoom overflow-hidden rounded-[2rem] shadow-lift">
              <img src="${IMG_HERO}" alt="街角的绘本书店" class="aspect-[3/2] w-full object-cover" fetchpriority="high" />
            </div>
            <div class="absolute -bottom-6 -left-6 rounded-2xl bg-paper px-5 py-4 shadow-paper">
              <p class="serif-title text-lg font-bold">"今夜想读哪一本？"</p>
              <p class="en-caption text-xs text-gold">story time</p>
            </div>
            <div class="absolute -right-5 top-6 animate-pulse text-2xl">✨</div>
          </div>
        </div>
      </section>

      <section id="about" class="paper-texture py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
          <div class="reveal mb-12 max-w-2xl">
            <p class="en-caption mb-3 text-xs text-coral">about the studio</p>
            <h2 class="serif-title text-3xl font-black md:text-4xl">一间只讲温柔话的工作室</h2>
            <p class="mt-4 leading-relaxed text-ink-soft">「纸间故事」诞生于一盏台灯和一摞水彩纸。我们相信，孩子值得拥有真挚的图画与句子，而大人心里，也永远住着那个愿意听故事的小孩。</p>
          </div>
          <div class="grid gap-6 md:grid-cols-3">
            ${features
              .map(
                (f, i) => `
              <div class="card-lift reveal reveal-delay-${i + 1} rounded-3xl border border-ink/5 bg-paper p-7 shadow-sm">
                <div class="mb-4 text-3xl">${f.icon}</div>
                <h3 class="serif-title mb-2 text-lg font-bold">${f.title}</h3>
                <p class="text-sm leading-relaxed text-ink-soft">${f.desc}</p>
              </div>`,
              )
              .join('')}
          </div>
        </div>
      </section>

      <section id="books" class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
          <div class="reveal mb-12 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p class="en-caption mb-3 text-xs text-coral">our picture books</p>
              <h2 class="serif-title text-3xl font-black md:text-4xl">本月绘本系列</h2>
            </div>
            <a href="#subscribe" class="text-sm text-ink-soft underline decoration-gold underline-offset-4 hover:text-ink">看全部收藏 →</a>
          </div>
          <div id="booksGrid" class="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">${books.map(BOOK_CARD_HTML).join('')}</div>
        </div>
      </section>

      <section id="craft" class="bg-paper-deep/60 py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
          <div class="reveal mb-12 max-w-2xl">
            <p class="en-caption mb-3 text-xs text-coral">paper goodies</p>
            <h2 class="serif-title text-3xl font-black md:text-4xl">把绘本穿在身上、带到日常</h2>
            <p class="mt-4 leading-relaxed text-ink-soft">从书页里走出来的小狐狸和小云朵，印进了帆布袋、明信片与徽章里。挑一件顺眼的，陪你去生活里走一走。</p>
          </div>
          <div class="reveal img-zoom mb-10 overflow-hidden rounded-[2rem] shadow-paper">
            <img src="${IMG_CRAFT}" alt="绘本文创产品陈列" class="max-h-[22rem] w-full object-cover" loading="lazy" />
          </div>
          <div id="craftGrid" class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">${products.map(PRODUCT_CARD_HTML).join('')}</div>
        </div>
      </section>

      <section id="studio" class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
          <div class="grid items-center gap-12 md:grid-cols-2">
            <div class="reveal space-y-6">
              <p class="en-caption text-xs text-coral">inside the studio</p>
              <h2 class="serif-title text-3xl font-black leading-tight md:text-4xl">创作手记与周末工坊</h2>
              <div class="space-y-5">
                ${notes
                  .map(
                    (n) => `
                  <div class="rounded-2xl border-l-2 border-gold bg-paper-deep/40 px-5 py-4">
                    <p class="en-caption mb-1 text-[11px] text-gold">${n.en}</p>
                    <h3 class="serif-title font-bold">${n.title}</h3>
                    <p class="mt-1 text-sm leading-relaxed text-ink-soft">${n.text}</p>
                  </div>`,
                  )
                  .join('')}
              </div>
            </div>
            <div class="reveal reveal-delay-1 space-y-5">
              <figure class="img-zoom overflow-hidden rounded-[2rem] shadow-paper">
                <img src="${IMG_WHALE}" alt="创作手记插画" class="aspect-[4/3] w-full object-cover" loading="lazy" />
              </figure>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div class="rounded-2xl bg-paper-deep/60 py-5"><p class="serif-title text-2xl font-black">36</p><p class="text-xs text-ink-soft">期手记</p></div>
                <div class="rounded-2xl bg-paper-deep/60 py-5"><p class="serif-title text-2xl font-black">8</p><p class="text-xs text-ink-soft">期工坊</p></div>
                <div class="rounded-2xl bg-paper-deep/60 py-5"><p class="serif-title text-2xl font-black">∞</p><p class="text-xs text-ink-soft">份童心</p></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="subscribe" class="py-20 md:py-28">
        <div class="mx-auto max-w-6xl px-6">
          <div class="reveal relative overflow-hidden rounded-[2.5rem] bg-ink px-8 py-14 text-paper md:px-16 md:py-20">
            <div class="pointer-events-none absolute -right-8 -top-8 text-8xl opacity-15">🌙</div>
            <div class="pointer-events-none absolute -bottom-10 left-1/4 text-7xl opacity-10">⭐</div>
            <div class="relative max-w-xl">
              <p class="en-caption mb-3 text-xs text-gold">letters from paperland</p>
              <h2 class="serif-title text-3xl font-black leading-tight md:text-4xl">每个月底，寄一封温柔的信给你</h2>
              <p class="mt-4 text-paper/70">新绘本预览、插画师幕后、限定的文创抽选——只写给愿意看信的你。</p>
              <form id="subForm" class="mt-8 flex flex-col gap-3 sm:flex-row">
                <input id="subEmail" type="email" required placeholder="请输入你的邮箱" class="flex-1 rounded-full bg-paper/10 px-6 py-3.5 text-sm outline-none ring-1 ring-paper/20 placeholder:text-paper/40 focus:ring-gold" />
                <button type="submit" class="btn-coral rounded-full bg-coral px-8 py-3.5 font-medium text-white">订阅来信</button>
              </form>
              <p id="subMsg" class="mt-3 hidden text-sm text-gold"></p>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-ink/5 py-12">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 text-center md:flex-row md:text-left">
        <div>
          <p class="serif-title text-lg font-bold">纸间故事 <span class="text-sm text-ink-soft">Paperland</span></p>
          <p class="en-caption mt-1 text-xs text-ink-soft">and they read happily ever after</p>
        </div>
        <div class="flex gap-5 text-sm text-ink-soft">
          <a href="#about" class="hover:text-ink">关于</a>
          <a href="#books" class="hover:text-ink">绘本</a>
          <a href="#craft" class="hover:text-ink">文创</a>
          <a href="#subscribe" class="hover:text-ink">联系</a>
        </div>
        <div class="flex flex-col items-center gap-2 text-xs text-ink-soft/70 md:text-right">
          <p>© 2024 纸间故事工作室 · 温柔出品</p>
          <a href="#/admin" class="text-[11px] text-ink-soft/50 underline decoration-dotted underline-offset-4 hover:text-coral">管理后台</a>
        </div>
      </div>
    </footer>
  </div>`;
}

// ---------- 交互绑定（事件委托，内容刷新后无需重绑） ----------
function bindGlobalInteractions(): void {
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.add-btn')) {
      const btn = target.closest<HTMLButtonElement>('.add-btn');
      if (!btn) return;
      const name = btn.dataset.add ?? '小物';
      btn.textContent = '已加入 ✓';
      btn.classList.add('bg-coral', 'text-white', 'border-coral');
      window.setTimeout(() => {
        btn.textContent = '放入篮子';
        btn.classList.remove('bg-coral', 'text-white', 'border-coral');
      }, 1400);
    }
  });
}

function bindSiteInteractions(): void {
  const nav = document.getElementById('siteNav');
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  const menuLinks = Array.from(document.querySelectorAll('.mobile-link'));

  const onScroll = (): void => {
    if (!nav) return;
    if (window.scrollY > 24) nav.classList.add('nav-glass', 'shadow-sm');
    else nav.classList.remove('nav-glass', 'shadow-sm');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  menuBtn?.addEventListener('click', () => mobileMenu?.classList.toggle('hidden'));
  menuLinks.forEach((link) => link.addEventListener('click', () => mobileMenu?.classList.add('hidden')));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('is-visible');
      });
    },
    { threshold: 0.12 },
  );
  document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => io.observe(el));

  document.getElementById('subForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = (document.getElementById('subEmail') as HTMLInputElement).value;
    const msg = document.getElementById('subMsg');
    if (msg) {
      msg.textContent = `已收到你的来信地址 ${email}，我们月底见 🌙`;
      msg.classList.remove('hidden');
      (e.target as HTMLFormElement).reset();
    }
  });
}

async function loadContent(): Promise<ContentData | null> {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) return null;
    const data = (await res.json()) as ContentData;
    return data;
  } catch {
    return null;
  }
}

function renderSite(app: HTMLElement): void {
  window.scrollTo(0, 0);
  app.innerHTML = buildLayout(DEFAULT_BOOKS, DEFAULT_PRODUCTS);
  bindSiteInteractions();
  bindGlobalInteractions();

  // 从后端刷新内容，保持与后台一致
  void loadContent().then((data) => {
    if (!data || (data.books.length === 0 && data.products.length === 0)) return;
    const booksGrid = document.getElementById('booksGrid');
    const craftGrid = document.getElementById('craftGrid');
    if (booksGrid && data.books.length > 0) {
      booksGrid.innerHTML = data.books.map(BOOK_CARD_HTML).join('');
    }
    if (craftGrid && data.products.length > 0) {
      craftGrid.innerHTML = data.products.map(PRODUCT_CARD_HTML).join('');
    }
  });
}

// ---------- 启动（路由） ----------
export function initApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App element not found');
    return;
  }
  bindGlobalInteractions();

  const route = (): void => {
    if (window.location.hash.startsWith('#/admin')) {
      void renderAdmin(app);
    } else {
      renderSite(app);
    }
  };

  window.addEventListener('hashchange', route);
  route();
}