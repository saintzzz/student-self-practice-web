-- CR-67: allow service_role to link questions to assets for the bulk
-- generation pipeline (qb_question_assets) and read qb_assets.
grant select on practice.qb_assets to service_role;
grant insert on practice.qb_question_assets to service_role;
grant insert on practice.qb_assets to service_role;
