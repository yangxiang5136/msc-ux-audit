-- =============================================================================
-- /wxapp/ Migration 005 · proposal 级状态简化到 3 档 · 2026-05-15
--
-- 之前: proposal.status 与 annotation.status 共享 5 档 (draft/review/accepted/rejected/shipped)
-- 现在:
--   proposal.status   = 全局总览 3 档: draft / in_progress / done
--   annotation.status = 单条反馈细分 5 档: 不变
-- 这两个概念在 UI 上彻底分开
--
-- 顺序必须是: ① 先 drop 旧约束 → ② 再 update 把值映射到新枚举 → ③ 最后 add 新约束
-- 不能反过来 (会触发旧约束拒绝新值)
-- =============================================================================

-- ① 先脱掉旧约束 · 让 update 不被旧枚举挡住
alter table wxapp_proposal drop constraint if exists wxapp_proposal_status_check;

-- ② 把旧值映射到新值
update wxapp_proposal set status = case status
  when 'review'    then 'in_progress'
  when 'accepted'  then 'done'
  when 'rejected'  then 'done'
  when 'shipped'   then 'done'
  else status
end
where status in ('review','accepted','rejected','shipped');

-- ③ 添加新约束 · 只允许 3 档
alter table wxapp_proposal add constraint wxapp_proposal_status_check
  check (status in ('draft','in_progress','done'));

-- annotation.status 的 check 约束**不变**, 保持 5 档不变
