-- Remove reuniões internas da tabela operacional do SaaS
-- Regras baseadas em saas.meet_conferences.call_interna

delete from saas.reunioes r
using saas.meet_conferences mc
where r.google_event_id = mc.conference_key
  and coalesce(mc.call_interna, false) = true;
