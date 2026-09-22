// Excel（.xlsx）模板下载 / 批量导入（增改删）/ 按字段导出
import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import {
  query,
  normalizeBook,
  normalizeProduct,
  parsePages,
  getBooks,
  getProducts,
  verifySession,
} from '../db';

export const excelRouter = Router();

// 全部 /api/admin/* 接口都需要管理员登录（仅拦截 admin 前缀，避免误伤前台页面与公开接口）
excelRouter.use('/api/admin', async (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('x-session');
  if (!token) {
    res.status(401).json({ error: '请先登录' });
    return;
  }
  const session = await verifySession(token);
  if (!session) {
    res.status(401).json({ error: '登录已失效，请重新登录' });
    return;
  }
  next();
});

// 中文表头 <-> 数据库字段
interface ColDef {
  header: string;
  key: string;
}

const BOOK_COLS: ColDef[] = [
  { header: 'ID', key: 'id' },
  { header: '书名', key: 'title' },
  { header: '所属系列', key: 'series_name' },
  { header: '定价', key: 'price' },
  { header: '书号', key: 'isbn' },
  { header: '简介', key: 'brief' },
  { header: '封面图', key: 'cover_img' },
  { header: '内页图片', key: 'pages' },
  { header: '开本', key: 'format' },
  { header: '条形码图片', key: 'barcode_img' },
  { header: '署名', key: 'author' },
  { header: '中图分类号', key: 'clc' },
  { header: '出版日期', key: 'publish_date' },
  { header: '年龄段', key: 'age_group' },
  { header: '出版社', key: 'publisher' },
  { header: '分类', key: 'category' },
  { header: '排序', key: 'sort_order' },
];

const PRODUCT_COLS: ColDef[] = [
  { header: 'ID', key: 'id' },
  { header: '产品名', key: 'name' },
  { header: '类别', key: 'category' },
  { header: '定价', key: 'price' },
  { header: '条形码图片', key: 'barcode_img' },
  { header: '商品条码', key: 'barcode' },
  { header: '商标名', key: 'brand' },
  { header: '净含量单位', key: 'net_unit' },
  { header: '封面图', key: 'cover_img' },
  { header: '排序', key: 'sort_order' },
];

const AGE_GROUPS = ['大班', '中班', '小班'];
const NET_UNITS = ['包', '个', '片', '张', '盒', '本', '套'];

function sendWorkbook(res: Response, wb: XLSX.WorkBook, filename: string): void {
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(buf);
}

// ---------- 模板下载 ----------
excelRouter.get('/api/admin/:kind/template', async (req: Request, res: Response) => {
  const kind = req.params.kind;
  const isBook = kind === 'books';
  const cols = isBook ? BOOK_COLS : PRODUCT_COLS;
  const name = isBook ? '绘本' : '文创';

  // 模板：仅表头 + 一行示例（示例 ID 留空表示新增）
  const header = cols.map((c) => c.header);
  const example: Record<string, string> = {};
  if (isBook) {
    Object.assign(example, {
      ID: '',
      书名: '示例绘本（请删除此行再正式填写）',
      所属系列: '单本',
      定价: '28.00',
      书号: '978-7-0000-0000-0',
      简介: '一句话简介',
      封面图: '/uploads/xxx.jpg',
      内页图片: '/uploads/p1.jpg|/uploads/p2.jpg',
      开本: '16开',
      条形码图片: '/uploads/barcode.jpg',
      署名: '作者名',
      中图分类号: 'J228.2',
      出版日期: '2024-05',
      年龄段: '大班',
      出版社: '千遇文化',
      分类: '儿童绘本',
      排序: '1',
    });
  } else {
    Object.assign(example, {
      ID: '',
      产品名: '示例文创（请删除此行再正式填写）',
      类别: '文具',
      定价: '18.00',
      条形码图片: '/uploads/barcode.jpg',
      商品条码: '6900000000000',
      商标名: '千遇文化',
      净含量单位: '个',
      封面图: '/uploads/cover.jpg',
      排序: '1',
    });
  }
  const rows = [header, header.map((h) => example[h] ?? '')];

  // 说明 sheet
  const notes: string[][] = [
    ['填写说明'],
    ['1. ID 列：新增产品时留空；填写已有 ID 则更新该行；在“操作”列填 DELETE 并带 ID 则删除。'],
    ['2. 内页图片：多张图片用英文竖线 | 分隔，图片可填已上传的 /uploads 路径。'],
    ['3. 年龄段：只能填 大班 / 中班 / 小班 其中之一。'],
    ['4. 净含量单位：如 包 / 个 / 片 / 张 / 盒 / 本 / 套。'],
    ['5. 请勿改动第一行表头文字，否则无法识别列。'],
    ['6. 填完保存为 .xlsx，在后台“表格导入”处上传。'],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = cols.map((c) => ({ wch: Math.max(12, c.header.length * 2 + 6) }));
  XLSX.utils.book_append_sheet(wb, ws, name);
  const noteWs = XLSX.utils.aoa_to_sheet(notes);
  noteWs['!cols'] = [{ wch: 80 }];
  XLSX.utils.book_append_sheet(wb, noteWs, '填写说明');
  sendWorkbook(res, wb, `${name}导入模板.xlsx`);
});

// ---------- 导出（支持字段选择） ----------
excelRouter.get('/api/admin/:kind/export', async (req: Request, res: Response) => {
  try {
    const kind = req.params.kind;
    const isBook = kind === 'books';
    const cols = isBook ? BOOK_COLS : PRODUCT_COLS;
    const allRows = isBook ? await getBooks() : await getProducts();

    // 字段选择：?fields=title,isbn；默认全部
    const wanted = typeof req.query.fields === 'string' ? req.query.fields.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const useCols = wanted.length > 0 ? cols.filter((c) => wanted.includes(c.key)) : cols;

    const data = allRows.map((row) => {
      const obj: Record<string, unknown> = {};
      for (const c of useCols) {
        let v = (row as unknown as Record<string, unknown>)[c.key];
        if (c.key === 'pages') v = parsePages(String(v ?? '')).join('|');
        obj[c.header] = v ?? '';
      }
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: useCols.map((c) => c.header) });
    ws['!cols'] = useCols.map((c) => ({ wch: Math.max(12, c.header.length * 2 + 6) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, isBook ? '绘本' : '文创');
    sendWorkbook(res, wb, `${isBook ? '绘本' : '文创'}数据导出.xlsx`);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// ---------- 导入 ----------
const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

interface ImportResult {
  inserted: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
}

excelRouter.post(
  '/api/admin/:kind/import',
  xlsxUpload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const kind = req.params.kind;
      const isBook = kind === 'books';
      const cols = isBook ? BOOK_COLS : PRODUCT_COLS;
      if (!req.file) {
        res.status(400).json({ error: '请上传 .xlsx 文件' });
        return;
      }

      const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = isBook ? '绘本' : '文创';
      const ws = wb.Sheets[wb.SheetNames.includes(sheetName) ? sheetName : wb.SheetNames[0]];
      if (!ws) {
        res.status(400).json({ error: '未找到数据工作表' });
        return;
      }

      // 用表头行映射，避免列顺序变化出错
      const matrix: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (matrix.length < 2) {
        res.status(400).json({ error: '表格没有数据行' });
        return;
      }
      const headerCells = matrix[0].map((c) => String(c ?? '').trim());
      const headerToKey = new Map<string, string>();
      for (const c of cols) headerToKey.set(c.header, c.key);
      // 也允许出现“操作”列
      const opIndex = headerCells.indexOf('操作');

      const colIndex: { key: string; idx: number }[] = [];
      headerCells.forEach((h, idx) => {
        const key = headerToKey.get(h);
        if (key) colIndex.push({ key, idx });
      });
      const idIdx = headerCells.indexOf('ID');

      const result: ImportResult = { inserted: 0, updated: 0, deleted: 0, skipped: 0, errors: [] };
      const table = isBook ? 'books' : 'products';

      for (let r = 1; r < matrix.length; r++) {
        const line = matrix[r];
        // 跳过整行空 / 示例提示行
        const isBlank = line.every((c) => String(c ?? '').trim() === '');
        if (isBlank) continue;

        const record: Record<string, unknown> = {};
        for (const { key, idx } of colIndex) {
          let v = line[idx];
          record[key] = v === undefined || v === null ? '' : v;
        }
        // pages：| 分隔 -> 数组
        if (isBook && record.pages !== undefined) {
          const arr = String(record.pages).split('|').map((s) => s.trim()).filter(Boolean);
          record.pages = arr;
        }

        const operation = opIndex >= 0 ? String(line[opIndex] ?? '').trim().toUpperCase() : '';
        const idVal = idIdx >= 0 ? line[idIdx] : '';
        const id = Number(idVal);
        const hasId = idVal !== '' && idVal !== null && idVal !== undefined && !Number.isNaN(id);

        // 名称字段，用于空值校验
        const nameField = isBook ? String(record.title ?? '').trim() : String(record.name ?? '').trim();

        try {
          if (operation === 'DELETE' || operation === '删除') {
            if (!hasId) {
              result.errors.push(`第${r + 1}行：删除操作必须填写 ID`);
              continue;
            }
            await query(`DELETE FROM ${table} WHERE id=$1`, [id]);
            result.deleted++;
            continue;
          }

          // 校验年龄段
          if (isBook && record.age_group !== undefined && String(record.age_group).trim() !== '') {
            if (!AGE_GROUPS.includes(String(record.age_group).trim())) {
              result.errors.push(`第${r + 1}行：年龄段“${record.age_group}”无效，只能填 大班/中班/小班，已跳过`);
              result.skipped++;
              continue;
            }
          }
          // 校验净含量单位（非空时给提示但不阻断，避免自定义单位）
          if (!isBook && record.net_unit !== undefined && String(record.net_unit).trim() !== '') {
            if (!NET_UNITS.includes(String(record.net_unit).trim())) {
              result.errors.push(`第${r + 1}行：净含量单位“${record.net_unit}”不在常见列表（${NET_UNITS.join('/')}），仍按原值导入`);
            }
          }

          if (hasId) {
            // 更新：读取现有值后合并，保证未填列不被清空
            const existing = await query(`SELECT * FROM ${table} WHERE id=$1`, [id]);
            if (existing.rows.length === 0) {
              result.errors.push(`第${r + 1}行：ID=${id} 不存在，已跳过`);
              result.skipped++;
              continue;
            }
            const merged: Record<string, unknown> = { ...existing.rows[0] };
            for (const [k, v] of Object.entries(record)) {
              if (k === 'id') continue;
              // 空单元格不覆盖原值
              if (v === '' || (Array.isArray(v) && v.length === 0)) continue;
              merged[k] = v;
            }
            const norm = isBook ? normalizeBook(merged) : normalizeProduct(merged);
            const keys = Object.keys(norm);
            const sets = keys.map((k, i) => `${k}=$${i + 1}`).join(', ');
            await query(`UPDATE ${table} SET ${sets} WHERE id=$${keys.length + 1}`, [...keys.map((k) => norm[k]), id]);
            result.updated++;
          } else {
            // 新增
            if (!nameField) {
              result.errors.push(`第${r + 1}行：缺少${isBook ? '书名' : '产品名'}，已跳过`);
              result.skipped++;
              continue;
            }
            const norm = isBook ? normalizeBook(record) : normalizeProduct(record);
            const keys = Object.keys(norm);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            await query(
              `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
              keys.map((k) => norm[k]),
            );
            result.inserted++;
          }
        } catch (err) {
          result.errors.push(`第${r + 1}行：${err instanceof Error ? err.message : String(err)}`);
          result.skipped++;
        }
      }

      res.json({ success: true, result });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : String(e) });
    }
  },
);
