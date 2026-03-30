import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Filter, ChevronDown, MoreHorizontal,
  Calendar, User, AlertCircle, Ticket,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Pipeline {
  id: string;
  name: string;
  stages: { id: string; name: string; color: string }[];
}

interface TicketItem {
  id: string;
  name: string;
  stageId: string;
  owner: string;
  platform: string;
  pipelineId: string;
  openDays: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
}

const PIPELINES: Pipeline[] = [
  {
    id: 'pre-vendas',
    name: 'Pré-vendas Inbound',
    stages: [
      { id: 'new',           name: 'Novo',                 color: 'hsl(var(--primary))' },
      { id: 'contact',       name: 'Tentativa de contato', color: 'hsl(var(--warning))' },
      { id: 'connected',     name: 'Conectado',            color: 'hsl(var(--accent))' },
      { id: 'qualified',     name: 'Qualificado',          color: 'hsl(var(--success))' },
      { id: 'meeting',       name: 'Reunião agendada',     color: 'hsl(var(--success))' },
      { id: 'disqualified',  name: 'Desqualificado',       color: 'hsl(var(--destructive))' },
    ],
  },
  {
    id: 'suporte-ativo',
    name: 'Suporte Ativo',
    stages: [
      { id: 'sa-open',       name: 'Aberto',           color: 'hsl(var(--primary))' },
      { id: 'sa-progress',   name: 'Em andamento',     color: 'hsl(var(--warning))' },
      { id: 'sa-waiting',    name: 'Aguardando',       color: 'hsl(var(--muted-foreground))' },
      { id: 'sa-resolved',   name: 'Resolvido',        color: 'hsl(var(--success))' },
    ],
  },
  {
    id: 'suporte-retencao',
    name: 'Suporte Retenção',
    stages: [
      { id: 'sr-new',        name: 'Novo',             color: 'hsl(var(--primary))' },
      { id: 'sr-analysis',   name: 'Em análise',       color: 'hsl(var(--warning))' },
      { id: 'sr-retained',   name: 'Retido',           color: 'hsl(var(--success))' },
      { id: 'sr-churned',    name: 'Churned',          color: 'hsl(var(--destructive))' },
    ],
  },
];

const PRIORITY_CONFIG: Record<TicketItem['priority'], { label: string; class: string }> = {
  low:    { label: 'Baixa',   class: 'bg-muted text-muted-foreground' },
  medium: { label: 'Média',   class: 'bg-warning/15 text-warning' },
  high:   { label: 'Alta',    class: 'bg-destructive/15 text-destructive' },
  urgent: { label: 'Urgente', class: 'bg-destructive/20 text-destructive font-semibold' },
};

const TAG_COLORS: Record<string, string> = {
  'Conta Criada': 'bg-success/15 text-success border-success/30',
  'Integrado': 'bg-success/15 text-success border-success/30',
  'Cadência não cumprida': 'bg-destructive/15 text-destructive border-destructive/30',
  'Leads frios forum': 'bg-muted text-muted-foreground border-border',
};

function generateTickets(pipelineId: string, stages: Pipeline['stages']): TicketItem[] {
  const names = ['Appmax <> Texas Farm', 'TRANSAÇÃO APROVADA', 'Isabela - Parcerias', 'Via Máfia', 'Shopinfo', 'Appmax & América', 'Appmax <> Ballena', '[Onb] voeazul.com', 'Luiz - Mídias Sociais', '[WA] digitalegacy'];
  return stages.flatMap((stage, si) =>
    Array.from({ length: Math.max(2, Math.floor(Math.random() * 5) + 1) }, (_, di) => ({
      id: `${pipelineId}-${stage.id}-${di}`,
      name: names[(si * 3 + di) % names.length],
      stageId: stage.id,
      owner: ['Gabriel Luiz', 'Felipe Ezequiel', 'Rysianne da Silva', 'Carlos Eduardo', ''][( si + di) % 5],
      platform: ['VTEX', 'Shopify', 'Tray', 'Nuvemshop', 'Woocom', 'Magento', 'Outras'][(si + di) % 7],
      pipelineId,
      openDays: `${Math.floor(Math.random() * 7) + 1} dias`,
      priority: (['low', 'medium', 'high', 'urgent'] as const)[(si + di) % 4],
      tags: di % 2 === 0 ? ['Conta Criada'] : di % 3 === 0 ? ['Cadência não cumprida'] : [],
    }))
  );
}

export default function CRMTicketsPage() {
  const [activePipeline, setActivePipeline] = useState(PIPELINES[0].id);
  const [search, setSearch] = useState('');
  const [pipelineDropdown, setPipelineDropdown] = useState(false);

  const pipeline = PIPELINES.find(p => p.id === activePipeline)!;
  const tickets = useMemo(() => generateTickets(pipeline.id, pipeline.stages), [pipeline.id]);

  const filteredTickets = useMemo(() =>
    search ? tickets.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) : tickets,
    [tickets, search]);

  const ticketsByStage = useMemo(() => {
    const map: Record<string, TicketItem[]> = {};
    for (const stage of pipeline.stages) map[stage.id] = [];
    for (const ticket of filteredTickets) {
      if (map[ticket.stageId]) map[ticket.stageId].push(ticket);
    }
    return map;
  }, [filteredTickets, pipeline.stages]);

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Tickets</h1>
          <Badge variant="outline" className="text-xs">{filteredTickets.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu open={pipelineDropdown} onOpenChange={setPipelineDropdown}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                {pipeline.name} <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {PIPELINES.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => { setActivePipeline(p.id); setPipelineDropdown(false); }}
                  className={cn(p.id === activePipeline && 'bg-muted')}
                >
                  {p.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar ticket
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </Button>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-3 min-w-max h-full">
          {pipeline.stages.map(stage => {
            const stageTickets = ticketsByStage[stage.id] || [];
            return (
              <div key={stage.id} className="w-[280px] flex flex-col flex-shrink-0">
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-t-lg border border-border border-b-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-foreground">{stage.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{stageTickets.length}</Badge>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto border border-border rounded-b-lg bg-muted/10 p-2 space-y-2">
                  {stageTickets.map(ticket => {
                    const pri = PRIORITY_CONFIG[ticket.priority];
                    return (
                      <div key={ticket.id} className="bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-semibold text-primary hover:underline leading-tight">{ticket.name}</p>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 -mt-0.5">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Mover</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <p className="text-xs text-muted-foreground">Aberto por {ticket.openDays}</p>
                        <p className="text-xs text-muted-foreground">Plataforma: {ticket.platform}</p>
                        {ticket.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {ticket.tags.map(tag => (
                              <Badge key={tag} variant="outline" className={cn('text-[10px] px-1.5 py-0', TAG_COLORS[tag] || 'bg-muted text-muted-foreground')}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {ticket.priority !== 'low' && (
                          <Badge variant="outline" className={cn('text-[10px]', pri.class)}>
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" /> {pri.label}
                          </Badge>
                        )}
                        {ticket.owner && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                              <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <span className="text-[11px] text-muted-foreground">{ticket.owner}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
