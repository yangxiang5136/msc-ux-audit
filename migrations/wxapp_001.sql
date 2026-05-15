-- =============================================================================
-- /wxapp/ 微信小程序改稿协作框架 · 数据库迁移 001
-- 创建：2026-05-15
-- 上下游：server.js → /api/wxapp/* · 前端 wxapp.html / wxapp-detail.html
-- 在 Supabase Dashboard → SQL Editor 直接粘贴执行一次
-- =============================================================================

-- 1. proposals：当前态改稿（每个 slug 一行）
create table if not exists wxapp_proposal (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,                                     -- URL 友好短码
  title               text not null,
  screen_name         text,                                                     -- 小程序里的页面名（例如「资产详情页」）
  flow_group          text,                                                     -- 分镜组：同一长流程拆出来的多条改稿共享 group
  status              text not null default 'draft'
                        check (status in ('draft','review','accepted','rejected','shipped')),
  device_target       text not null default 'both'
                        check (device_target in ('ios','android','both')),
  original_image_url  text,                                                     -- 原截图 URL
  redesign_html       text,                                                     -- 改稿正文 HTML（.wp- 前缀）
  redesign_css        text,                                                     -- 改稿专用 CSS
  rationale           text,                                                     -- 改稿理由 Markdown
  author_role         text,                                                     -- sean | uiux | eng | ceo
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists wxapp_proposal_status_idx      on wxapp_proposal(status);
create index if not exists wxapp_proposal_updated_idx     on wxapp_proposal(updated_at desc);
create index if not exists wxapp_proposal_flow_group_idx  on wxapp_proposal(flow_group);

-- 2. revisions：修订历史（append-only · 永不修改）
create table if not exists wxapp_proposal_revision (
  id            uuid primary key default gen_random_uuid(),
  proposal_id   uuid not null references wxapp_proposal(id) on delete cascade,
  redesign_html text,
  redesign_css  text,
  rationale     text,
  author_role   text,
  created_at    timestamptz default now()
);

create index if not exists wxapp_proposal_revision_pid_idx
  on wxapp_proposal_revision(proposal_id, created_at desc);

-- 3. comments：线性评论流（按改稿）
create table if not exists wxapp_comment (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references wxapp_proposal(id) on delete cascade,
  author_role  text not null,
  kind         text not null default 'note'
                 check (kind in ('note','approve','reject','block','idea')),
  body         text,
  created_at   timestamptz default now()
);

create index if not exists wxapp_comment_pid_idx
  on wxapp_comment(proposal_id, created_at asc);

-- 4. annotations：批注（画笔 + 锚定 + 文本 + 表态）
create table if not exists wxapp_annotation (
  id               uuid primary key default gen_random_uuid(),
  proposal_id      uuid not null references wxapp_proposal(id) on delete cascade,
  author_role      text not null,
  shape            text not null
                     check (shape in ('freehand','circle','arrow','rect','none')),
  svg_path         text,                          -- 序列化 SVG path · 坐标已百分比化
  target_selector  text,                          -- 可选：锚定到 Shadow DOM 内某元素的 selector
  device           text default 'ios'
                     check (device in ('ios','android')),
  anchor_x         numeric,                       -- 锚点 x （百分比 0-100）
  anchor_y         numeric,                       -- 锚点 y （百分比 0-100）
  comment          text,
  reaction         text
                     check (reaction in ('approve','reject','block','idea','note') or reaction is null),
  created_at       timestamptz default now()
);

create index if not exists wxapp_annotation_pid_idx
  on wxapp_annotation(proposal_id, created_at asc);

-- =============================================================================
-- Row Level Security
-- 所有访问通过 server.js 用 service_role key 中转。
-- service_role bypass RLS by default，所以 server.js 不受影响。
-- 开启 RLS + 不创建任何 policy = 默认拒绝所有 anon/authenticated 直接访问。
-- =============================================================================

alter table wxapp_proposal           enable row level security;
alter table wxapp_proposal_revision  enable row level security;
alter table wxapp_comment            enable row level security;
alter table wxapp_annotation         enable row level security;
