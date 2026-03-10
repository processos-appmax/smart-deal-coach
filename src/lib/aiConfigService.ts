import { supabase } from '@/integrations/supabase/client';
import { getSaasEmpresaId } from '@/lib/saas';
import type { EvalCriteria } from '@/pages/AIConfigPage';

export interface AIModuleConfig {
  criterios: EvalCriteria[];
  prompt_sistema: string;
}

/**
 * Load AI config (criteria + prompt) for a module from DB.
 * Returns null if not found (caller should use defaults).
 */
export async function loadAIConfig(moduloCodigo: string): Promise<AIModuleConfig | null> {
  try {
    const empresaId = await getSaasEmpresaId();
    const { data, error } = await (supabase as any)
      .schema('saas')
      .from('configuracoes_ia')
      .select('criterios, prompt_sistema')
      .eq('empresa_id', empresaId)
      .eq('modulo_codigo', moduloCodigo)
      .maybeSingle();

    if (error || !data) return null;
    return {
      criterios: Array.isArray(data.criterios) ? data.criterios : [],
      prompt_sistema: data.prompt_sistema || '',
    };
  } catch {
    return null;
  }
}

/**
 * Save AI config (criteria + prompt) for a module to DB.
 */
export async function saveAIConfig(
  moduloCodigo: string,
  criterios: EvalCriteria[],
  promptSistema: string,
): Promise<void> {
  const empresaId = await getSaasEmpresaId();

  await (supabase as any)
    .schema('saas')
    .from('configuracoes_ia')
    .upsert(
      {
        empresa_id: empresaId,
        modulo_codigo: moduloCodigo,
        criterios: JSON.parse(JSON.stringify(criterios)),
        prompt_sistema: promptSistema,
        atualizado_em: new Date().toISOString(),
      },
      { onConflict: 'empresa_id,modulo_codigo' },
    );
}
