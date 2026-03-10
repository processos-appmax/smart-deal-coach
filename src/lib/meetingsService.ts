/**
 * Service for loading meetings from the database.
 */
import { supabase } from '@/integrations/supabase/client';
import { getSaasEmpresaId } from '@/lib/saas';

export interface DbMeeting {
  id: string;
  titulo: string;
  data_reuniao: string;
  duracao_minutos: number;
  cliente_nome: string | null;
  cliente_email: string | null;
  link_meet: string | null;
  status: string;
  score: number | null;
  analisada_por_ia: boolean;
  participantes: { email: string; name?: string }[];
  transcricao: string | null;
  vendedor_nome?: string;
  vendedor_email?: string;
  google_event_id?: string;
}

export async function loadMeetingsFromDb(): Promise<DbMeeting[]> {
  const empresaId = await getSaasEmpresaId();

  const { data, error } = await (supabase as any)
    .schema('saas')
    .from('reunioes')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('data_reuniao', { ascending: false });

  if (error) {
    console.error('Failed to load meetings:', error);
    return [];
  }

  // Resolve vendedor_id → name/email
  const vendedorIds = [...new Set((data || []).map((r: any) => r.vendedor_id).filter(Boolean))];
  let vendedorMap: Record<string, { nome: string; email: string }> = {};

  if (vendedorIds.length > 0) {
    const { data: users } = await (supabase as any)
      .schema('saas')
      .from('usuarios')
      .select('id,nome,email')
      .in('id', vendedorIds);

    for (const u of users || []) {
      vendedorMap[u.id] = { nome: u.nome, email: u.email };
    }
  }

  return (data || []).map((r: any) => ({
    id: r.id,
    titulo: r.titulo || '',
    data_reuniao: r.data_reuniao,
    duracao_minutos: r.duracao_minutos || 0,
    cliente_nome: r.cliente_nome,
    cliente_email: r.cliente_email,
    link_meet: r.link_meet,
    status: r.status || 'agendada',
    score: r.score,
    analisada_por_ia: r.analisada_por_ia || false,
    participantes: Array.isArray(r.participantes) ? r.participantes : [],
    transcricao: r.transcricao || null,
    vendedor_nome: vendedorMap[r.vendedor_id]?.nome,
    vendedor_email: vendedorMap[r.vendedor_id]?.email,
    google_event_id: r.google_event_id,
  }));
}
