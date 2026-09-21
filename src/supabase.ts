import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

let configPromise: Promise<SupabaseConfig> | null = null;
let browserClient: SupabaseClient | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchConfig(): Promise<SupabaseConfig> {
  const res = await fetch('/api/supabase-config');
  if (!res.ok) throw new Error(`无法加载登录配置 (HTTP ${res.status})`);
  const data = (await res.json()) as Partial<SupabaseConfig> & { error?: string };
  if (!data.url || !data.anonKey) {
    throw new Error(data.error ?? '登录配置无效');
  }
  return { url: data.url, anonKey: data.anonKey };
}

/** 获取 Supabase 配置（带缓存） */
export function getSupabaseConfig(): Promise<SupabaseConfig> {
  if (configPromise === null) {
    configPromise = fetchConfig();
  }
  return configPromise;
}

/** 获取浏览器端 Supabase 客户端（逐步重试直到配置就绪） */
export async function getSupabaseBrowserClient(maxRetries = 4, retryInterval = 1200): Promise<SupabaseClient> {
  if (browserClient) return browserClient;

  let config: SupabaseConfig | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      config = await getSupabaseConfig();
      break;
    } catch {
      if (i < maxRetries - 1) await sleep(retryInterval);
    }
  }

  if (!config) throw new Error('Supabase 登录服务暂不可用，请稍后重试');

  browserClient = createClient(config.url, config.anonKey, {
    db: { timeout: 60000 },
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  });
  return browserClient;
}

/** 获取当前登录 token（x-session 使用） */
export async function getSessionToken(): Promise<string> {
  const supabase = await getSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? '';
}