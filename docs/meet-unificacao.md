# Unificacao SaaS + Meet Collector

## Objetivo
Centralizar SaaS e Meet Collector no mesmo repositorio `appmax`, usando um banco unico no Supabase com fluxo automatizado para a aba Meetings.

## Estrutura
- Frontend SaaS: `src/`
- Collector: `services/meet-collector/`
- Gateway interno: `supabase/functions/meet-gateway/`
- Banco unico: schema `saas` (sem dependencia de `appmax.*` no fluxo ativo)

## Fluxo automatico (fim a fim)
1. Collector descobre conferencias e grava em `saas.meet_conferences`.
2. Trigger `saas.trg_sync_reuniao_from_meet_conference` executa a funcao `saas.sincronizar_reuniao_meet(...)`.
3. A funcao faz upsert em `saas.reunioes` (linkando por `google_event_id = conference_key`).
4. Quando a transcricao chega (`status=TRANSCRIPT_DONE` + `transcript_text`), o mesmo trigger atualiza `saas.reunioes.transcricao` automaticamente.
5. O frontend continua chamando somente `meet-gateway`, sem expor segredos no browser.

## Tabelas principais
- `saas.meet_conferences`: fonte de verdade das conferencias e transcricoes.
- `saas.run_conference_api_logs`: auditoria de chamadas `run-conference`/`transcript`.
- `saas.reunioes`: visao operacional no SaaS para listagem/analise.

## Seguranca
- Token/URL do collector ficam no backend (Edge Function Secrets / VM env).
- Frontend nao deve usar token sensivel.
- Campos sensiveis podem ser exibidos somente para admin no frontend.

## Operacao
- Coleta automatica: cron no collector (intervalo padrao 30 min).
- Sincronizacao de Meetings: automatica via trigger no banco (sem RPC manual obrigatoria).
