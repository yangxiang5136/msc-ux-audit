const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'feedback.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '{}');

app.use(express.json());

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Read feedback data
function readFB() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return {}; }
}

// Write feedback data
function writeFB(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET all feedback
app.get('/api/feedback', (req, res) => {
  res.json(readFB());
});

// GET feedback for a specific page
app.get('/api/feedback/:page', (req, res) => {
  const all = readFB();
  const page = req.params.page;
  res.json(all[page] || {});
});

// POST feedback for a specific item
// Body: { page: "chatA", id: "1.1", choice: "a", note: "..." }
app.post('/api/feedback', (req, res) => {
  const { page, id, choice, note } = req.body;
  if (!page || !id) return res.status(400).json({ error: 'page and id required' });

  const all = readFB();
  if (!all[page]) all[page] = {};
  
  const existing = all[page][id] || {};
  if (choice !== undefined) existing.c = choice;
  if (note !== undefined) existing.n = note;
  existing.t = new Date().toISOString();
  all[page][id] = existing;

  writeFB(all);
  res.json({ ok: true });
});

// Export feedback as text
app.get('/api/export', (req, res) => {
  const all = readFB();
  const pageNames = {
    chatA: '维度1-信任安全',
    chatB: '维度2+3-空状态反馈',
    chatC: '维度4+5-卡片金额',
    chatD: '维度6+7+8-确认留存异常'
  };
  let txt = 'MSC.AI CEO反馈汇总\n导出时间：' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '\n';
  txt += '═'.repeat(40) + '\n\n';
  
  Object.entries(all).forEach(([page, items]) => {
    txt += `【${pageNames[page] || page}】\n` + '─'.repeat(30) + '\n';
    Object.entries(items).forEach(([id, v]) => {
      const cls = v.c === 'a' ? '✅同意' : v.c === 'd' ? '💬需讨论' : v.c === 'x' ? '❌不同意' : '未选择';
      txt += `  [${id}] ${cls}`;
      if (v.n) txt += `\n    留言：${v.n}`;
      if (v.t) txt += `\n    时间：${v.t}`;
      txt += '\n';
    });
    txt += '\n';
  });

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(txt);
});

app.listen(PORT, () => {
  console.log(`MSC.AI Audit Site running on port ${PORT}`);
});
