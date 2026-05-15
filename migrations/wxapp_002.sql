-- =============================================================================
-- /wxapp/ Migration 002 · 反馈工作流重构（基于 Will UIUX 原则 + Sean 2026-05-15 反馈）
-- 关键变化：
--   1. annotation 成为决策对象 · 自带 status 生命周期
--   2. annotation 可被拖拽/缩放/旋转 · transform_data 持久化
--   3. comment 可挂到具体 annotation 上 · 形成 threaded 评论
--   4. 新增 screenshot 表 · 任何角色都能上传辅助截图
--
-- 全部 alter 都是向后兼容的 · 旧数据不丢
-- 在 Supabase Dashboard → SQL Editor 直接粘贴跑一次
-- =============================================================================

-- 1. annotation: 加 status 字段（每条反馈自带生命周期）
alter table wxapp_annotation
  add column if not exists status text default 'draft'
    check (status in ('draft','review','accepted','rejected','shipped'));

-- 2. annotation: 加 transform_data jsonb（持久化拖拽/缩放/旋转）
-- 结构：{ "tx": number, "ty": number, "scale": number, "rotation": number }
-- 所有值都是相对 svg_path 原始坐标系的偏移
alter table wxapp_annotation
  add column if not exists transform_data jsonb default '{}'::jsonb;

-- 3. comment: 加 annotation_id（可空 · 全局评论保持 null）
alter table wxapp_comment
  add column if not exists annotation_id uuid references wxapp_annotation(id) on delete cascade;

create index if not exists wxapp_comment_annotation_idx
  on wxapp_comment(annotation_id, created_at asc)
  where annotation_id is not null;

-- 4. screenshot 上传表（任何角色都能贡献辅助截图）
-- 用 data URI 存 base64，500KB 上限在 server.js 强制
create table if not exists wxapp_screenshot (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references wxapp_proposal(id) on delete cascade,
  data_uri     text not null,           -- "data:image/png;base64,xxx"
  mime_type    text default 'image/png',
  caption      text,                    -- 上传者备注（可空）
  author_role  text,
  byte_size    integer,                 -- 解码后字节数（便于审计 + 总量统计）
  created_at   timestamptz default now()
);

create index if not exists wxapp_screenshot_pid_idx
  on wxapp_screenshot(proposal_id, created_at desc);

-- 5. 索引: annotation 按状态筛选（右侧 status filter 用）
create index if not exists wxapp_annotation_status_idx
  on wxapp_annotation(proposal_id, status);

-- 6. RLS（按现有 wxapp_* 表惯例 · 默认 deny anon · service_role bypass）
alter table wxapp_screenshot enable row level security;

-- =============================================================================
-- 现有数据迁移说明：
--   - 旧 annotation 的 status 默认 'draft' · 旧的 reaction 字段保留兼容但 UI 不再写入
--   - 旧 annotation 的 transform_data 为 '{}'，等同 identity transform
--   - 旧 comment 的 annotation_id 为 null，等同全局评论
--   - 这次 migration 不删除任何字段 · 后续如要清理可单独跑
-- =============================================================================
