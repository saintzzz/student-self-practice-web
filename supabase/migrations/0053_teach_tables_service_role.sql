-- CR-106 follow-up: 0052's `revoke all ... from public` stripped the
-- public-role grant that service_role inherits, leaving ops/service
-- tooling unable to even SELECT taught_marks / skill_lessons. Client
-- roles (anon/authenticated) stay deny-all; service_role regains the
-- standard full access it holds on every other practice table so admin
-- dashboards, audits and cleanup jobs keep working.
grant all on practice.taught_marks to service_role;
grant all on practice.skill_lessons to service_role;
