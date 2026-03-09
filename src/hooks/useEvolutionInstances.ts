import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSaasEmpresaId } from '@/lib/saas';

const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || '';
const EVOLUTION_API_TOKEN = import.meta.env.VITE_EVOLUTION_API_TOKEN || '';

export interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: string; // "open" | "close" | "connecting"
  ownerJid?: string;
  profileName?: string;
  profilePicUrl?: string;
  _count?: { Message: number; Contact: number; Chat: number };
}

const STATUS_TO_DB: Record<string, string> = {
  open: 'conectada',
  close: 'desconectada',
  connecting: 'conectando',
};

const STATUS_FROM_DB: Record<string, string> = {
  conectada: 'open',
  desconectada: 'close',
  conectando: 'connecting',
};

async function syncInstancesToDb(apiInstances: EvolutionInstance[]) {
  try {
    const empresaId = await getSaasEmpresaId();
    for (const inst of apiInstances) {
      const dbStatus = STATUS_TO_DB[inst.connectionStatus] || 'desconectada';
      await supabase
        .schema('saas')
        .from('instancias_whatsapp')
        .upsert(
          {
            empresa_id: empresaId,
            nome: inst.name,
            telefone: inst.ownerJid?.replace('@s.whatsapp.net', '') || null,
            status: dbStatus,
            owner_jid: inst.ownerJid || null,
            ultimo_evento_em: new Date().toISOString(),
          },
          { onConflict: 'empresa_id,nome' },
        );
    }
  } catch (e) {
    console.warn('[sync] Falha ao sincronizar instâncias no banco:', e);
  }
}

async function loadInstancesFromDb(): Promise<EvolutionInstance[]> {
  const empresaId = await getSaasEmpresaId();
  const { data, error } = await supabase
    .schema('saas')
    .from('instancias_whatsapp')
    .select('id,nome,telefone,status,owner_jid')
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true });

  if (error) throw error;

  return (data || []).map((row) => ({
    id: row.id,
    name: row.nome,
    connectionStatus: STATUS_FROM_DB[row.status] || 'close',
    ownerJid: row.owner_jid || undefined,
    profileName: row.nome,
  }));
}

export function useEvolutionInstances() {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // First: load from database so UI shows instantly
      const dbInstances = await loadInstancesFromDb();
      if (dbInstances.length > 0) {
        setInstances(dbInstances);
      }

      // Then: fetch live data from Evolution API and sync
      if (EVOLUTION_API_URL && EVOLUTION_API_TOKEN) {
        const res = await window.fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          headers: { apikey: EVOLUTION_API_TOKEN, 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const apiData = await res.json();
          const apiInstances: EvolutionInstance[] = Array.isArray(apiData) ? apiData : [];
          setInstances(apiInstances);
          // Sync live data back to database in background
          syncInstancesToDb(apiInstances);
        }
      } else if (dbInstances.length === 0) {
        throw new Error('Evolution API não configurada e nenhuma instância encontrada no banco.');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { instances, loading, error, refetch: fetchAll };
}

// localStorage helpers — chave compartilhada entre UsersPage e IntegrationsPage
export const getInstanceForUser = (userId: string) =>
  localStorage.getItem(`wa_instance_${userId}`) || '';

export const setInstanceForUser = (userId: string, instanceName: string) => {
  if (instanceName) localStorage.setItem(`wa_instance_${userId}`, instanceName);
  else localStorage.removeItem(`wa_instance_${userId}`);
};
