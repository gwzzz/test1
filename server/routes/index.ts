import { Router } from 'express';
import cmsRouter from './cms';
import { excelRouter } from './excel';

const router = Router();

// CMS 内容管理与认证接口
router.use(cmsRouter);

// Excel 模板下载 / 批量导入 / 字段导出
router.use(excelRouter);

// API 路由示例
router.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from Express + Vite!',
    timestamp: new Date().toISOString(),
  });
});

router.post('/api/data', (req, res) => {
  const requestData = req.body;
  res.json({
    success: true,
    data: requestData,
    receivedAt: new Date().toISOString(),
  });
});

// 健康检查接口
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.COZE_PROJECT_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;
