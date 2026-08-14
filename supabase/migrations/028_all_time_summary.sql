-- 028: All-time summary function for the owner dashboard.
-- Sums every visit/expense/penalty in the database in one query, so the
-- API never hits the 1,000-row limit as history grows.
-- include_demo = true keeps TEST* staff rows (local/demo mode only).

create or replace function owner_all_time_summary(include_demo boolean default false)
returns json
language sql
stable
as $$
  with kept_visits as (
    select v.total_ngn, v.tip_ngn, v.payment_method, v.visit_date
    from visits v
    left join users u on u.id = v.staff_id
    where include_demo or u.name is null or upper(u.name) not like 'TEST%'
  ),
  kept_commission as (
    select vs.commission_ngn
    from visit_services vs
    left join users u on u.id = vs.staff_id
    where include_demo or u.name is null or upper(u.name) not like 'TEST%'
  ),
  kept_penalties as (
    select a.penalty_ngn
    from attendance a
    left join users u on u.id = a.staff_id
    where include_demo or u.name is null or upper(u.name) not like 'TEST%'
  )
  select json_build_object(
    'revenue',        coalesce((select sum(total_ngn) from kept_visits), 0),
    'tips',           coalesce((select sum(tip_ngn) from kept_visits), 0),
    'visits',         (select count(*) from kept_visits),
    'cash',           coalesce((select sum(total_ngn) from kept_visits where payment_method = 'cash'), 0),
    'transfer',       coalesce((select sum(total_ngn) from kept_visits where payment_method = 'transfer'), 0),
    'pos',            coalesce((select sum(total_ngn) from kept_visits where payment_method = 'pos'), 0),
    'commission',     coalesce((select sum(commission_ngn) from kept_commission), 0),
    'expenses',       coalesce((select sum(amount_ngn) from expenses), 0),
    'penalties',      coalesce((select sum(penalty_ngn) from kept_penalties), 0),
    'variance',       coalesce((select sum(variance_ngn) from cash_reconciliations), 0),
    'first_visit_date', (select min(visit_date) from kept_visits)
  );
$$;
