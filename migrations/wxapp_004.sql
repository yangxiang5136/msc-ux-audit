-- =============================================================================
-- /wxapp/ Migration 004 · annotation 绑定到具体 screenshot · 2026-05-15
--
-- 之前: 标记只关联 proposal + section → 切换截图时同一批标记在所有截图上都显示
-- 现在: annotation 加 screenshot_id 外键 → 每条标记跟着特定截图走
--
-- screenshot_id 可空: null 表示标记在 redesign_html 上 (不关联任何截图)
-- ON DELETE CASCADE: 删截图时, 该截图上的标记也一起删
-- =============================================================================

alter table wxapp_annotation
  add column if not exists screenshot_id uuid references wxapp_screenshot(id) on delete cascade;

create index if not exists wxapp_annotation_screenshot_idx
  on wxapp_annotation(screenshot_id) where screenshot_id is not null;
