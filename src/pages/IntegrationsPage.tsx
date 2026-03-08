import { useState } from 'react';
import { MOCK_INTEGRATIONS } from '@/data/mockData';
import type { Integration } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plug2, CheckCircle2, XCircle, AlertCircle, Settings2, RefreshCcw,
  Eye, EyeOff, Save, Zap, ExternalLink, Calendar, MessageSquare,
  Brain, Workflow
} from 'lucide-react';
import { cn } from '@/lib/utils';

const INTEGRATION_META: Record<string, { icon: string; color: string; desc: string; docs?: string }> = {
  google_calendar: { icon: '📅', color: 'hsl(var(--info))', desc: 'Sincroniza reuniões automaticamente do Google Calendar' },
  google_meet: { icon: '🎥', color: 'hsl(var(--success))', desc: 'Captura dados de chamadas do Google Meet' },
  hubspot: { icon: '🧡', color: 'hsl(38 92% 50%)', desc: 'CRM — sincronize contatos, empresas e negócios' },
  openai: { icon: '🤖', color: 'hsl(var(--primary))', desc: 'IA para análise de reuniões e conversas' },
  evolution_api: { icon: '💬', color: 'hsl(var(--accent))', desc: 'WhatsApp Business via Evolution API' },
  n8n: { icon: '⚡', color: 'hsl(270 80% 65%)', desc: 'Orquestração de automações e fluxos' },
};

function IntegrationCard({ integration, onConfig }: { integration: Integration; onConfig: (i: Integration) => void }) {
  const meta = INTEGRATION_META[integration.type];
  const statusConfig = {
    connected: { icon: CheckCircle2, class: 'text-success', label: 'Conectado' },
    disconnected: { icon: XCircle, class: 'text-muted-foreground', label: 'Desconectado' },
    error: { icon: AlertCircle, class: 'text-destructive', label: 'Erro' },
  }[integration.status];

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${meta.color}20` }}>
            {meta.icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{integration.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <statusConfig.icon className={cn('w-3 h-3', statusConfig.class)} />
              <span className={cn('text-xs', statusConfig.class)}>{statusConfig.label}</span>
            </div>
          </div>
        </div>
        <button onClick={() => onConfig(integration)} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center transition-colors">
          <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{meta.desc}</p>
      <div className="flex items-center gap-2">
        {integration.status === 'connected' ? (
          <Button size="sm" variant="outline" className="text-xs h-7 border-border flex-1">
            <RefreshCcw className="w-3 h-3 mr-1" /> Sincronizar
          </Button>
        ) : (
          <Button size="sm" className="text-xs h-7 bg-gradient-primary flex-1">
            <Plug2 className="w-3 h-3 mr-1" /> Conectar
          </Button>
        )}
        {integration.configuredAt && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(integration.configuredAt).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}

function ConfigPanel({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const [showKey, setShowKey] = useState(false);
  const [key, setKey] = useState('');

  const fields: Record<string, { label: string; placeholder: string; fields: { key: string; label: string; placeholder: string; type?: string }[] }> = {
    openai: { label: 'OpenAI API', placeholder: 'sk-...', fields: [{ key: 'api_key', label: 'API Key', placeholder: 'sk-proj-...' }] },
    evolution_api: { label: 'Evolution API', placeholder: '', fields: [{ key: 'url', label: 'URL da API', placeholder: 'https://api.evolution.com' }, { key: 'token', label: 'API Token', placeholder: 'Token de autenticação' }] },
    n8n: { label: 'N8N', placeholder: '', fields: [{ key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://n8n.meudominio.com/webhook/...' }, { key: 'api_key', label: 'API Key (opcional)', placeholder: 'Bearer token' }] },
    hubspot: { label: 'HubSpot', placeholder: '', fields: [{ key: 'access_token', label: 'Access Token', placeholder: 'pat-...' }] },
    google_calendar: { label: 'Google Calendar', placeholder: '', fields: [{ key: 'client_id', label: 'Client ID', placeholder: 'xxx.apps.googleusercontent.com' }, { key: 'client_secret', label: 'Client Secret', placeholder: 'GOCSPX-...' }] },
    google_meet: { label: 'Google Meet', placeholder: '', fields: [{ key: 'same', label: 'Usa as mesmas credenciais do Google Calendar', placeholder: '' }] },
  };

  const config = fields[integration.type];

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold">Configurar {integration.name}</h3>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Fechar</button>
      </div>
      <div className="space-y-3">
        {config?.fields.map(f => (
          <div key={f.key}>
            <label className="text-xs font-medium block mb-1.5">{f.label}</label>
            <div className="relative">
              <Input type={showKey ? 'text' : 'password'} placeholder={f.placeholder} className="h-8 text-xs bg-secondary border-border pr-8" />
              <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">⚠️ As credenciais são armazenadas com criptografia e nunca expostas no frontend.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1 text-xs bg-gradient-primary h-8">
            <Save className="w-3 h-3 mr-1" /> Salvar
          </Button>
          <Button size="sm" variant="outline" className="text-xs border-border h-8">
            Testar Conexão
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [configuring, setConfiguring] = useState<Integration | null>(null);

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Integrações</h1>
          <p className="text-sm text-muted-foreground">Conecte ferramentas à Appmax</p>
        </div>
      </div>

      {/* N8N Automations Banner */}
      <div className="glass-card p-5 mb-6 border-primary/20" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)/0.08), hsl(var(--accent)/0.05))' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-display font-semibold">Automações N8N</p>
              <p className="text-xs text-muted-foreground">Dispare fluxos automáticos a partir de eventos na plataforma</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="text-xs h-8 border-primary/30 text-primary">
              <Zap className="w-3 h-3 mr-1" /> Iniciar Automação WhatsApp
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 border-primary/30 text-primary">
              <Brain className="w-3 h-3 mr-1" /> Analisar Conversa
            </Button>
            <Button size="sm" variant="outline" className="text-xs h-8 border-primary/30 text-primary">
              <Workflow className="w-3 h-3 mr-1" /> Fluxo de Vendas
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MOCK_INTEGRATIONS.map(i => (
          <IntegrationCard key={i.id} integration={i} onConfig={setConfiguring} />
        ))}
      </div>

      {configuring && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfiguring(null)}>
          <div className="w-full max-w-md" onClick={e => e.stopPropagation()}>
            <ConfigPanel integration={configuring} onClose={() => setConfiguring(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
