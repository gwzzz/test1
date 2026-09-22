// 环境配置：读取 .env，仅在服务端使用
let envLoaded = false;

/** 读取 .env（仅一次），必须在任何依赖环境变量的逻辑之前调用 */
export function ensureEnv(): void {
  if (envLoaded) return;
  try {
    require('dotenv').config();
  } catch {
    // dotenv not available
  }
  envLoaded = true;
}

export function isProd(): boolean {
  ensureEnv();
  return process.env.COZE_PROJECT_ENV === 'PROD';
}

/** 本地数据库连接串（生产/开发通用） */
export function getDatabaseUrl(): string {
  ensureEnv();
  return process.env.DATABASE_URL || 'postgres://postgres@127.0.0.1:5432/postgres';
}

/** 后台管理员账号（默认值主要用于单机部署快捷启动） */
export function getAdminCredentials(): { username: string; password: string } {
  ensureEnv();
  return {
    username: process.env.ADMIN_USER || 'admin',
    password: process.env.ADMIN_PASS || 'admin123',
  };
}

/** token 签名密钥 */
export function getTokenSecret(): string {
  ensureEnv();
  return process.env.TOKEN_SECRET || 'paper-story-local-secret';
}