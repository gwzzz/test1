# 项目上下文

## 技术栈

- **核心**: Vite 7, TypeScript, Express
- **UI**: Tailwind CSS

## 目录结构

```
├── scripts/            # 构建与启动脚本
│   ├── build.sh        # 构建脚本
│   ├── dev.sh          # 开发环境启动脚本
│   ├── prepare.sh      # 预处理脚本
│   └── start.sh        # 生产环境启动脚本
├── server/             # 服务端逻辑
│   ├── db.ts           # 本地 PostgreSQL 数据访问层（连接池 + 完整字段读写 + 本地认证 token）
│   ├── env.ts          # 环境变量读取（DATABASE_URL / ADMIN_USER / ADMIN_PASS / TOKEN_SECRET）
│   ├── routes/         # API 路由（cms.ts）
│   ├── server.ts       # Express 服务入口
│   └── vite.ts         # Vite 中间件集成
├── src/                # 前端源码
│   ├── index.css       # 全局样式
│   ├── index.ts        # 客户端入口
│   ├── api.ts          # 前端 API 封装（登录/登出/CRUD/图片上传）
│   ├── admin.ts        # 后台管理系统（#/admin）
│   └── main.ts         # 前台展示（列表 + 详情页 hash 路由）
├── index.html          # 入口 HTML
├── package.json        # 项目依赖管理
├── tsconfig.json       # TypeScript 配置
└── vite.config.ts      # Vite 配置
```

## 数据库（本地 PostgreSQL）

- 使用 `pg` 连接池，连接串由 `DATABASE_URL` 环境变量提供。
- 表：`books`（绘本完整字段 + 内页多图 `pages` 存 JSON 字符串）、`products`（文创完整字段）、`admin_sessions`（本地认证会话）。
- **数据访问已从云端 Supabase 迁移到本地 PostgreSQL**，不再依赖 Supabase。
- 认证：本地管理员账号（`ADMIN_USER` / `ADMIN_PASS`）登录，服务端用 HMAC 签发 token 存 `admin_sessions`，前端通过 `x-session` header 携带。

## 图片上传

- 使用 `multer`，仅允许图片（png/jpg/jpeg/gif/webp），存到服务器本地 `uploads/` 目录，通过 `/uploads` 静态访问。
- 生产环境上传目录：`C:\app\uploads`；开发环境：项目根 `uploads/`。

## 环境变量（.env）

- `COZE_PROJECT_ENV=PROD` 表示生产模式（静态服务 dist/，不加载 Vite）。
- `DEPLOY_RUN_PORT`：服务监听端口（生产为 80）。
- `DATABASE_URL`：PostgreSQL 连接串（密码含 `#` 需 URL 编码为 `%23`）。
- `ADMIN_USER` / `ADMIN_PASS`：后台管理员登录账号。
- `TOKEN_SECRET`：token 签名密钥。

## 部署

- 前端：`pnpm vite build` → `dist/`。
- 后端：`pnpm tsup server/server.ts ...` → `dist-server/server.js`，在服务器上重命名为 `server.cjs` 使用。
- 线上服务：NSSM 注册的 `PaperStory` 服务（node server.cjs，端口 80）；PostgreSQL 为 Windows 服务（`PostgreSQL`）。
- 初始化：开发环境 `initDatabase()` 全量建表自举；生产环境仅幂等创建 `admin_sessions`（业务表由部署 SQL 创建）。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- 使用 Tailwind CSS 进行样式开发

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、Express `req`/`res`、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。
