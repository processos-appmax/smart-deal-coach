import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Filter, ChevronDown, MoreHorizontal,
  Briefcase, Calendar, DollarSign, User,
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

interface Deal {
  id: string;
  name: string;
  value: number;
  stageId: string;
  owner: string;
  company: string;
  platform: string;
  pipelineId: string;
  lastActivity: string;
  tags: string[];
}

const PIPELINES: Pipeline[] = [
  {
    id: 'closer-outbound',
    name: 'Processo de Closer Outbound',
    stages: [
      { id: 'reunion-scheduled', name: 'Reunião agendada', color: 'hsl(var(--primary))' },
      { id: 'no-show',           name: 'No-show',          color: 'hsl(var(--warning))' },
      { id: 'reunion-done',      name: 'Reunião realizada', color: 'hsl(var(--accent))' },
      { id: 'proposal-analysis', name: 'Proposta em análise', color: 'hsl(var(--muted-foreground))' },
      { id: 'proposal-accepted', name: 'Proposta aceita',   color: 'hsl(var(--success))' },
      { id: 'integrated',        name: 'Parceiro integrado', color: 'hsl(var(--success))' },
    ],
  },
  {
    id: 'inbound',
    name: 'Processo Inbound',
    stages: [
      { id: 'inb-new',       name: 'Novo lead',         color: 'hsl(var(--primary))' },
      { id: 'inb-contact',   name: 'Em contato',        color: 'hsl(var(--warning))' },
      { id: 'inb-qualified', name: 'Qualificado',       color: 'hsl(var(--accent))' },
      { id: 'inb-proposal',  name: 'Proposta enviada',  color: 'hsl(var(--muted-foreground))' },
      { id: 'inb-won',       name: 'Ganho',             color: 'hsl(var(--success))' },
      { id: 'inb-lost',      name: 'Perdido',           color: 'hsl(var(--destructive))' },
    ],
  },
];

function generateDeals(pipelineId: string, stages: Pipeline['stages']): Deal[] {
  const names = ['Dental Odonto', 'Rogerio Sócio', 'odonto equipamentos', 'Raposo Cosméticos', 'Olimpob2b', 'Ouro Caps', 'CDJ Beauty', 'Mv.cross', 'RoadTrip021', 'obafactory.co'];
  return stages.flatMap((stage, si) =>
    Array.from({ length: Math.floor(Math.random() * 4) + 2 }, (_, di) => ({
      id: `${pipelineId}-${stage.id}-${di}`,
      name: names[(si * 3 + di) % names.length],
      value: [50000, 200000, 500000, 65000, 250000, 2500000, 300000, 400000, 100000, 1200000][(si + di) % 10],
      stageId: stage.id,
      owner: ['Guilherme site', 'Rogério Perfect', 'Guilherme Romano', '', 'Tiago De Oliveira', 'Elizabeth GonÇalves'][(si + di) % 6],
      company: names[(si * 3 + di) % names.length],
      platform: ['Magento', 'Bagy', 'VTEX', 'Shopify', 'Wordpress', 'Nuvemshop', 'Tray', 'Wix'][(si + di) % 8],
      pipelineId,
      lastActivity: `${Math.floor(Math.random() * 5) + 1} dias`,
      tags: di % 3 === 0 ? ['Integrado'] : di % 3 === 1 ? ['Listbuilding'] : [],
    }))
  );
}

const TAG_COLORS: Record<string, string> = {
  'Integrado': 'bg-success/15 text-success border-success/30',
  'Listbuilding': 'bg-primary/15 text-primary border-primary/30',
  'Primeira Venda 30+': 'bg-warning/15 text-warning border-warning/30',
};

export default function CRMDealsPage() {
  const [activePipeline, setActivePipeline] = useState(PIPELINES[0].id);
  const [search, setSearch] = useState('');
  const [pipelineDropdown, setPipelineDropdown] = useState(false);

  const pipeline = PIPELINES.find(p => p.id === activePipeline)!;
  const deals = useMemo(() => generateDeals(pipeline.id, pipeline.stages), [pipeline.id]);

  const filteredDeals = useMemo(() =>
    search ? deals.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : deals,
    [deals, search]);

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {};
    for (const stage of pipeline.stages) map[stage.id] = [];
    for (const deal of filteredDeals) {
      if (map[deal.stageId]) map[deal.stageId].push(deal);
    }
    return map;
  }, [filteredDeals, pipeline.stages]);

  const formatCurrency = (v: number) =>
    v >= 1000000 ? `R$ ${(v / 1000000).toFixed(1)} mi` :
    v >= 1000 ? `R$ ${(v / 1000).toFixed(0)} mil` :
    `R$ ${v}`;

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-foreground">Negócios</h1>
          <Badge variant="outline" className="text-xs">{filteredDeals.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Pipeline selector */}
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
            <Plus className="w-3.5 h-3.5" /> Adicionar negócio
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
            const stageDeals = dealsByStage[stage.id] || [];
            const totalValue = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.id} className="w-[280px] flex flex-col flex-shrink-0">
                {/* Stage header */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-t-lg border border-border border-b-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                    <span className="text-xs font-semibold text-foreground">{stage.name}</span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1">{stageDeals.length}</Badge>
                  </div>
                </div>

                {/* Stage body */}
                <div className="flex-1 overflow-y-auto border border-border rounded-b-lg bg-muted/10 p-2 space-y-2">
                  {stageDeals.map(deal => (
                    <div key={deal.id} className="bg-card border border-border rounded-lg p-3 space-y-2 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-semibold text-primary hover:underline leading-tight">{deal.name}</p>
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
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="w-3 h-3" /> {formatCurrency(deal.value)}
                        </p>
                        <p className="text-xs text-muted-foreground">Plataforma: {deal.platform}</p>
                      </div>
                      {deal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {deal.tags.map(tag => (
                            <Badge key={tag} variant="outline" className={cn('text-[10px] px-1.5 py-0', TAG_COLORS[tag] || 'bg-muted text-muted-foreground')}>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {deal.owner && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-3 h-3 text-muted-foreground" />
                          </div>
                          <span className="text-[11px] text-muted-foreground">{deal.owner}</span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {deal.lastActivity}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Stage footer */}
                <div className="px-3 py-2 text-[10px] text-muted-foreground border-x border-b border-border rounded-b-lg bg-muted/20">
                  {formatCurrency(totalValue)} | Valor total
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
