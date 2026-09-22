// 前端 API 客户端（本地认证 + 内容读取 + 图片上传）
const TOKEN_KEY = 'paper_admin_token';

export function getToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setToken(token: string): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers['x-session'] = token;

  const res = await fetch(path, { ...options, headers });
  const json = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || (json && (json as { error?: string }).error)) {
    throw new Error((json as { error?: string } | null)?.error ?? `请求失败 (HTTP ${res.status})`);
  }
  return json as T;
}

// ---------- 认证 ----------
export function login(username: string, password: string): Promise<{ token: string; username: string }> {
  return request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
}

export function logout(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/auth/logout', { method: 'POST' });
}

// ---------- 内容 ----------
export interface BookItem {
  id: number;
  title: string;
  series_name: string;
  price: string;
  isbn: string;
  brief: string;
  cover_img: string;
  pages: string[];
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
export interface ProductItem {
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
export interface ContentData {
  books: BookItem[];
  products: ProductItem[];
}

export function fetchContent(): Promise<ContentData> {
  return request<ContentData>('/api/content');
}
export function fetchBook(id: number): Promise<BookItem> {
  return request<BookItem>(`/api/books/${id}`);
}
export function fetchProduct(id: number): Promise<ProductItem> {
  return request<ProductItem>(`/api/products/${id}`);
}

// ---------- 管理 CRUD ----------
export function createBook(body: Record<string, unknown>): Promise<{ success: boolean; data: BookItem }> {
  return request('/api/admin/books', { method: 'POST', body: JSON.stringify(body) });
}
export function updateBook(id: number, body: Record<string, unknown>): Promise<{ success: boolean; data: BookItem }> {
  return request(`/api/admin/books/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}
export function deleteBook(id: number): Promise<{ success: boolean }> {
  return request(`/api/admin/books/${id}`, { method: 'DELETE' });
}
export function createProduct(body: Record<string, unknown>): Promise<{ success: boolean; data: ProductItem }> {
  return request('/api/admin/products', { method: 'POST', body: JSON.stringify(body) });
}
export function updateProduct(id: number, body: Record<string, unknown>): Promise<{ success: boolean; data: ProductItem }> {
  return request(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(body) });
}
export function deleteProduct(id: number): Promise<{ success: boolean }> {
  return request(`/api/admin/products/${id}`, { method: 'DELETE' });
}

// ---------- 图片上传（返回 /uploads/xxx 相对路径） ----------
export async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: token ? { 'x-session': token } : {},
    body: form,
  });
  const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (!res.ok || !json?.url) throw new Error(json?.error ?? `上传失败 (HTTP ${res.status})`);
  return json.url;
}