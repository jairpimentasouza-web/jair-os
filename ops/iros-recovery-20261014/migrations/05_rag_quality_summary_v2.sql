-- IROS recovery 2026-10-15 — RAG answer quality summary uses the current criterion (approved: "Aprovo tudo").
-- Legacy `passed` (v1) failed 202/202 only because freshness_score is NULL for every row
-- (freshness is never measured), dragging overall_score to 0.75 < 0.9. The evaluator's
-- current criterion is passed_v2 / quality_score_v2 (186/202 pass).
-- Nothing is hidden: the legacy count stays available as passed_answers_legacy_v1.
-- No function, view or cron job consumes this view (checked 2026-10-15).
-- Rollback: recreate with count(*) FILTER (WHERE passed) AS passed_answers (original definition).
create or replace view jair_os.rag_answer_quality_summary with (security_invoker = true) as
select owner_id,
       count(*) as evaluated_answers,
       count(*) filter (where passed_v2) as passed_answers,
       avg(overall_score) as avg_overall,
       avg(groundedness_score) as avg_groundedness,
       avg(faithfulness_score) as avg_faithfulness,
       avg(citation_correctness_score) as avg_citation_correctness,
       avg(freshness_score) as avg_freshness,
       count(*) filter (where passed) as passed_answers_legacy_v1,
       avg(quality_score_v2) as avg_quality_v2,
       'passed_v2 (quality_score_v2); legacy v1 fails whenever freshness_score is NULL'::text as pass_criterion
from jair_os.rag_answer_eval_results
group by owner_id;
