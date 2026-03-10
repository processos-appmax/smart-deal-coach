import { supabase } from '@/integrations/supabase/client';
import { getSaasEmpresaId } from '@/lib/saas';
import type { Team } from '@/types';

// ─── Load all teams from saas.times ──────────────────────────────────────────
export async function loadTeams(): Promise<Team[]> {
  const empresaId = await getSaasEmpresaId();
  const { data, error } = await (supabase as any)
    .schema('saas')
    .from('times')
    .select('*')
    .eq('empresa_id', empresaId)
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('[teams] loadTeams error:', error);
    return [];
  }

  // Load member assignments (usuarios with time_id)
  const teamIds = (data || []).map((t: any) => t.id);
  let memberMap: Record<string, string[]> = {};

  if (teamIds.length > 0) {
    const { data: users } = await (supabase as any)
      .schema('saas')
      .from('usuarios')
      .select('id, time_id')
      .eq('empresa_id', empresaId)
      .in('time_id', teamIds);

    if (users) {
      for (const u of users) {
        if (!u.time_id) continue;
        if (!memberMap[u.time_id]) memberMap[u.time_id] = [];
        memberMap[u.time_id].push(u.id);
      }
    }
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    name: t.nome,
    supervisorId: t.supervisor_id || '',
    memberIds: memberMap[t.id] || [],
    companyId: empresaId,
    areaId: t.area_id || undefined,
    goal: t.meta ? Number(t.meta) : undefined,
    createdAt: t.criado_em ? new Date(t.criado_em).toISOString().slice(0, 10) : '',
  }));
}

// ─── Create a team ───────────────────────────────────────────────────────────
export async function createTeam(data: Partial<Team>): Promise<Team> {
  const empresaId = await getSaasEmpresaId();

  const { data: row, error } = await (supabase as any)
    .schema('saas')
    .from('times')
    .insert({
      empresa_id: empresaId,
      nome: data.name,
      supervisor_id: data.supervisorId || null,
      meta: data.goal ?? 40,
      area_id: data.areaId || null,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Erro ao criar time: ${error.message}`);

  // Assign members
  if (data.memberIds && data.memberIds.length > 0) {
    await assignMembers(row.id, data.memberIds, empresaId);
  }

  return {
    id: row.id,
    name: row.nome,
    supervisorId: row.supervisor_id || '',
    memberIds: data.memberIds || [],
    companyId: empresaId,
    areaId: row.area_id || undefined,
    goal: row.meta ? Number(row.meta) : undefined,
    createdAt: new Date(row.criado_em).toISOString().slice(0, 10),
  };
}

// ─── Update a team ───────────────────────────────────────────────────────────
export async function updateTeam(teamId: string, data: Partial<Team>): Promise<void> {
  const empresaId = await getSaasEmpresaId();
  const updates: Record<string, any> = { atualizado_em: new Date().toISOString() };

  if (data.name !== undefined) updates.nome = data.name;
  if (data.supervisorId !== undefined) updates.supervisor_id = data.supervisorId || null;
  if (data.goal !== undefined) updates.meta = data.goal;
  if (data.areaId !== undefined) updates.area_id = data.areaId || null;

  const { error } = await (supabase as any)
    .schema('saas')
    .from('times')
    .update(updates)
    .eq('id', teamId);

  if (error) throw new Error(`Erro ao atualizar time: ${error.message}`);

  // Update member assignments
  if (data.memberIds !== undefined) {
    await assignMembers(teamId, data.memberIds, empresaId);
  }
}

// ─── Delete a team ───────────────────────────────────────────────────────────
export async function deleteTeam(teamId: string): Promise<void> {
  const empresaId = await getSaasEmpresaId();

  // Remove team assignment from users first
  await (supabase as any)
    .schema('saas')
    .from('usuarios')
    .update({ time_id: null })
    .eq('empresa_id', empresaId)
    .eq('time_id', teamId);

  const { error } = await (supabase as any)
    .schema('saas')
    .from('times')
    .delete()
    .eq('id', teamId);

  if (error) throw new Error(`Erro ao excluir time: ${error.message}`);
}

// ─── Assign members to a team ────────────────────────────────────────────────
async function assignMembers(teamId: string, memberIds: string[], empresaId: string): Promise<void> {
  // Remove current members from this team
  await (supabase as any)
    .schema('saas')
    .from('usuarios')
    .update({ time_id: null })
    .eq('empresa_id', empresaId)
    .eq('time_id', teamId);

  // Assign new members
  if (memberIds.length > 0) {
    for (const userId of memberIds) {
      await (supabase as any)
        .schema('saas')
        .from('usuarios')
        .update({ time_id: teamId })
        .eq('id', userId)
        .eq('empresa_id', empresaId);
    }
  }
}
