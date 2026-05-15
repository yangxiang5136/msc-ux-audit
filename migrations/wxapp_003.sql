-- =============================================================================
-- /wxapp/ Migration 003 · 子项 (section) 支持 · 2026-05-15
--
-- 一个 proposal 内可以并行多个子项 (section), 例如:
--   烟雾测试.注册任务     · 烟雾测试.AI 确权     · 烟雾测试.提现流程
-- 每个 annotation / screenshot / comment 都打 section 标签, UI 按 section 过滤
-- 空字符串 '' 表示「默认子项」 (兼容旧数据)
-- =============================================================================

alter table wxapp_annotation add column if not exists section text default '';
alter table wxapp_screenshot add column if not exists section text default '';
alter table wxapp_comment    add column if not exists section text default '';

create index if not exists wxapp_annotation_section_idx on wxapp_annotation(proposal_id, section);
create index if not exists wxapp_screenshot_section_idx on wxapp_screenshot(proposal_id, section);
create index if not exists wxapp_comment_section_idx    on wxapp_comment(proposal_id, section);

-- 注: 不在 proposal 表本身存子项列表, 而是从子表 distinct 出来动态计算
-- 这样新建/重命名/删除子项不需要额外同步, 数据更内聚
