"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/server.ts
var import_http = require("http");
var import_express4 = __toESM(require("express"));

// server/routes/index.ts
var import_express2 = require("express");

// server/routes/cms.ts
var import_express = require("express");

// server/src/storage/database/supabase-client.ts
var import_supabase_js = require("@supabase/supabase-js");
var envLoaded = false;
function loadEnv() {
  if (envLoaded || process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    return;
  }
  try {
    require("dotenv").config();
  } catch {
  }
  envLoaded = true;
}
function getSupabaseCredentials() {
  loadEnv();
  const url = process.env.COZE_SUPABASE_URL;
  const anonKey = process.env.COZE_SUPABASE_ANON_KEY;
  if (!url) {
    throw new Error("COZE_SUPABASE_URL is not set");
  }
  if (!anonKey) {
    throw new Error("COZE_SUPABASE_ANON_KEY is not set");
  }
  return { url, anonKey };
}
function getSupabaseServiceRoleKey() {
  loadEnv();
  return process.env.COZE_SUPABASE_SERVICE_ROLE_KEY;
}
function getSupabaseClient(token) {
  const { url, anonKey } = getSupabaseCredentials();
  let key;
  if (token) {
    key = anonKey;
  } else {
    const serviceRoleKey = getSupabaseServiceRoleKey();
    key = serviceRoleKey ?? anonKey;
  }
  const globalOptions = {};
  if (token) {
    globalOptions.headers = { Authorization: `Bearer ${token}` };
  }
  return (0, import_supabase_js.createClient)(url, key, {
    global: globalOptions,
    db: {
      timeout: 6e4
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// server/routes/cms.ts
var router = (0, import_express.Router)();
function asError(err) {
  return err instanceof Error ? err : new Error(String(err));
}
async function getAuthUser(req) {
  const token = req.header("x-session");
  if (!token) return null;
  const client = getSupabaseClient(token);
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, email: data.user.email ?? "" };
}
router.get("/api/supabase-config", (_req, res) => {
  try {
    const { url, anonKey } = getSupabaseCredentials();
    res.json({ url, anonKey });
  } catch (error) {
    console.error("Failed to get supabase config:", error);
    res.status(500).json({ error: "Failed to get Supabase config" });
  }
});
router.get("/api/content", async (_req, res) => {
  try {
    const client = getSupabaseClient();
    const [booksRes, productsRes] = await Promise.all([
      client.from("books").select("id, title, en, author, desc, img").order("sort_order", { ascending: true }).order("id", { ascending: true }),
      client.from("products").select("*").order("sort_order", { ascending: true }).order("id", { ascending: true })
    ]);
    if (booksRes.error) throw new Error(`\u67E5\u8BE2\u7ED8\u672C\u5931\u8D25: ${booksRes.error.message}`);
    if (productsRes.error) throw new Error(`\u67E5\u8BE2\u6587\u521B\u5931\u8D25: ${productsRes.error.message}`);
    res.json({
      books: booksRes.data ?? [],
      products: productsRes.data ?? []
    });
  } catch (error) {
    console.error("Failed to load content:", error);
    res.status(500).json({ error: asError(error).message });
  }
});
router.post("/api/admin/books", async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
      return;
    }
    const body = req.body;
    const { data, error } = await auth.client.from("books").insert({
      title: body.title ?? "",
      en: body.en ?? "",
      author: body.author ?? "",
      desc: body.desc ?? "",
      img: body.img ?? "",
      sort_order: body.sort_order ?? 0
    }).select().single();
    if (error) throw new Error(`\u65B0\u589E\u7ED8\u672C\u5931\u8D25: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});
router.put("/api/admin/books/:id", async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
      return;
    }
    const id = Number(req.params.id);
    const body = req.body;
    const { data, error } = await auth.client.from("books").update({
      title: body.title,
      en: body.en,
      author: body.author,
      desc: body.desc,
      img: body.img,
      sort_order: body.sort_order
    }).eq("id", id).select().single();
    if (error) throw new Error(`\u66F4\u65B0\u7ED8\u672C\u5931\u8D25: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});
router.delete("/api/admin/books/:id", async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
      return;
    }
    const id = Number(req.params.id);
    const { error } = await auth.client.from("books").delete().eq("id", id);
    if (error) throw new Error(`\u5220\u9664\u7ED8\u672C\u5931\u8D25: ${error.message}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});
router.post("/api/admin/products", async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
      return;
    }
    const body = req.body;
    const { data, error } = await auth.client.from("products").insert({
      name: body.name ?? "",
      price: body.price ?? "",
      emoji: body.emoji ?? "",
      tag: body.tag ?? "",
      sort_order: body.sort_order ?? 0
    }).select().single();
    if (error) throw new Error(`\u65B0\u589E\u6587\u521B\u5931\u8D25: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});
router.put("/api/admin/products/:id", async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
      return;
    }
    const id = Number(req.params.id);
    const body = req.body;
    const { data, error } = await auth.client.from("products").update({
      name: body.name,
      price: body.price,
      emoji: body.emoji,
      tag: body.tag,
      sort_order: body.sort_order
    }).eq("id", id).select().single();
    if (error) throw new Error(`\u66F4\u65B0\u6587\u521B\u5931\u8D25: ${error.message}`);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});
router.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
      return;
    }
    const id = Number(req.params.id);
    const { error } = await auth.client.from("products").delete().eq("id", id);
    if (error) throw new Error(`\u5220\u9664\u6587\u521B\u5931\u8D25: ${error.message}`);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: asError(error).message });
  }
});
var cms_default = router;

// server/routes/index.ts
var router2 = (0, import_express2.Router)();
router2.use(cms_default);
router2.get("/api/hello", (req, res) => {
  res.json({
    message: "Hello from Express + Vite!",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router2.post("/api/data", (req, res) => {
  const requestData = req.body;
  res.json({
    success: true,
    data: requestData,
    receivedAt: (/* @__PURE__ */ new Date()).toISOString()
  });
});
router2.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    env: process.env.COZE_PROJECT_ENV,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var routes_default = router2;

// server/vite.ts
var import_express3 = __toESM(require("express"));
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_vite2 = require("vite");

// vite.config.ts
var import_vite = require("vite");
var vite_config_default = (0, import_vite.defineConfig)({
  server: {
    port: 5e3,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: {
      overlay: true,
      path: "/hot/vite-hmr",
      port: 6e3,
      clientPort: 443,
      timeout: 3e4
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  }
});

// server/vite.ts
var isDev = process.env.COZE_PROJECT_ENV !== "PROD";
async function setupViteMiddleware(app2) {
  const vite = await (0, import_vite2.createServer)({
    ...vite_config_default,
    server: {
      ...vite_config_default.server,
      middlewareMode: true
    },
    appType: "spa"
  });
  app2.use(vite.middlewares);
  console.log("\u{1F680} Vite dev server initialized");
}
function setupStaticServer(app2) {
  const distPath = import_path.default.resolve(process.cwd(), "dist");
  if (!import_fs.default.existsSync(distPath)) {
    console.error('\u274C dist folder not found. Please run "pnpm build" first.');
    process.exit(1);
  }
  app2.use(import_express3.default.static(distPath));
  app2.use((_req, res) => {
    res.sendFile(import_path.default.join(distPath, "index.html"));
  });
  console.log("\u{1F4E6} Serving static files from dist/");
}
async function setupVite(app2) {
  if (isDev) {
    await setupViteMiddleware(app2);
  } else {
    setupStaticServer(app2);
  }
}

// server/server.ts
var isDev2 = process.env.COZE_PROJECT_ENV !== "PROD";
var port = parseInt(process.env.DEPLOY_RUN_PORT || process.env.PORT || "5000", 10);
var hostname = process.env.HOSTNAME || "localhost";
var app = (0, import_express4.default)();
var server = (0, import_http.createServer)(app);
async function startServer() {
  if (isDev2) {
    app.use((req, res, next) => {
      const start = Date.now();
      res.on("finish", () => {
        const ms = Date.now() - start;
        console.log(`${req.method} ${req.url} - ${ms}ms`);
      });
      next();
    });
  }
  app.use(import_express4.default.json());
  app.use(import_express4.default.urlencoded({ extended: true }));
  app.use(routes_default);
  await setupVite(app);
  app.use((err, req, res) => {
    console.error("Server error:", err);
    const status = "status" in err ? err.status ?? 500 : 500;
    res.status(status).json({
      error: err.message || "Internal server error"
    });
  });
  server.once("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`
\u2728 Server running at http://${hostname}:${port}`);
    console.log(`\u{1F4DD} Environment: ${isDev2 ? "development" : "production"}
`);
  });
  return server;
}
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
