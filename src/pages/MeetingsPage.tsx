import { useState } from 'react';
import { MOCK_MEETINGS, MOCK_EVALUATIONS } from '@/data/mockData';
import type { Meeting } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Video, Search, Plus, Filter, Brain, Star, Clock, Calendar,
  User, Building2, ExternalLink, ChevronRight, Sparkles, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  completed: { label: 'Concluída', class: 'score-good' },
  scheduled: { label: 'Agendada', class: 'score-excellent' },
  cancelled: { label: 'Cancelada', class: 'score-poor' },
  no_show: { label: 'No-show', class: 'score-average' },
};

const SCORE_CRITERIA = [
  { key: 'rapport', label: 'Rapport' },
  { key: 'discovery', label: 'Descoberta' },
  { key: 'presentation', label: 'Apresentação' },
  { key: 'objections', label: 'Objeções' },
  { key: 'nextSteps', label: 'Próximos Passos' },
];

function ScoreBar({ value, label }: { value: number; label: string }) {
  const color = value >= 85 ? 'hsl(168 80% 42%)' : value >= 70 ? 'hsl(210 100% 56%)' : value >= 60 ? 'hsl(38 92% 50%)' : 'hsl(0 72% 51%)';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-muted-foreground w-28">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{value}</span>
    </div>
  );
}

export default function MeetingsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const filtered = MOCK_MEETINGS.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.clientName.toLowerCase().includes(search.toLowerCase()) ||
      m.sellerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const evaluation = selectedMeeting
    ? MOCK_EVALUATIONS.find(e => e.meetingId === selectedMeeting.id)
    : null;

  return (
    <div className="page-container animate-fade-in">
      <div className="flex gap-6">
        {/* Main list */}
        <div className={cn('flex-1 min-w-0', selectedMeeting && 'lg:w-1/2')}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold">Reuniões</h1>
              <p className="text-sm text-muted-foreground">{filtered.length} reuniões encontradas</p>
            </div>
            <Button size="sm" className="bg-gradient-primary text-xs font-medium h-8">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nova Reunião
            </Button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, cliente, vendedor..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-xs bg-secondary border-border"
              />
            </div>
            <div className="flex gap-1.5">
              {['all', 'completed', 'scheduled', 'no_show'].map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'text-xs px-3 py-1.5 rounded-lg border transition-all',
                    statusFilter === s
                      ? 'bg-primary/15 border-primary/30 text-primary font-medium'
                      : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {{ all: 'Todas', completed: 'Concluídas', scheduled: 'Agendadas', no_show: 'No-show' }[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="glass-card overflow-hidden">
            <table className="w-full data-table">
              <thead>
                <tr>
                  <th className="text-left">Reunião</th>
                  <th className="text-left hidden md:table-cell">Vendedor</th>
                  <th className="text-left hidden lg:table-cell">Data</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Status</th>
                  <th className="text-center hidden lg:table-cell">IA</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr
                    key={m.id}
                    className={cn('cursor-pointer', selectedMeeting?.id === m.id && 'bg-primary/5')}
                    onClick={() => setSelectedMeeting(selectedMeeting?.id === m.id ? null : m)}
                  >
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Video className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{m.title}</p>
                          <p className="text-xs text-muted-foreground">{m.clientName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.sellerName}`}
                          alt={m.sellerName}
                          className="w-6 h-6 rounded-full border border-border"
                        />
                        <span className="text-sm">{m.sellerName}</span>
                      </div>
                    </td>
                    <td className="hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(m.date).toLocaleDateString('pt-BR')}
                        <span className="ml-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />{m.duration}min
                        </span>
                      </div>
                    </td>
                    <td className="text-center">
                      {m.score ? (
                        <span className={m.score >= 85 ? 'score-excellent' : m.score >= 70 ? 'score-good' : 'score-average'}>
                          {m.score}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={STATUS_CONFIG[m.status].class}>{STATUS_CONFIG[m.status].label}</span>
                    </td>
                    <td className="text-center hidden lg:table-cell">
                      {m.aiAnalyzed ? (
                        <Brain className="w-4 h-4 text-accent mx-auto" />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedMeeting && (
          <div className="w-full lg:w-[380px] xl:w-[420px] flex-shrink-0 animate-slide-in">
            <div className="glass-card p-5 sticky top-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-semibold">Detalhes da Reunião</h3>
                <button onClick={() => setSelectedMeeting(null)} className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center">
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-base font-semibold mb-1">{selectedMeeting.title}</h4>
                  <div className="flex items-center gap-2">
                    <span className={STATUS_CONFIG[selectedMeeting.status].class}>
                      {STATUS_CONFIG[selectedMeeting.status].label}
                    </span>
                    {selectedMeeting.aiAnalyzed && (
                      <span className="flex items-center gap-1 text-xs text-accent font-medium">
                        <Brain className="w-3 h-3" /> IA Ativa
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Vendedor</p>
                      <p className="font-medium text-xs">{selectedMeeting.sellerName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="font-medium text-xs">{selectedMeeting.clientName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium text-xs">{new Date(selectedMeeting.date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Duração</p>
                      <p className="font-medium text-xs">{selectedMeeting.duration} minutos</p>
                    </div>
                  </div>
                </div>

                {selectedMeeting.meetLink && (
                  <a
                    href={selectedMeeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir no Google Meet
                  </a>
                )}

                {evaluation && (
                  <>
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="text-sm font-semibold">Scorecard</h5>
                        <span className={evaluation.totalScore >= 85 ? 'score-excellent' : evaluation.totalScore >= 70 ? 'score-good' : 'score-average'}>
                          {evaluation.totalScore} pts
                        </span>
                      </div>
                      <div className="space-y-2.5">
                        {SCORE_CRITERIA.map(c => (
                          <ScoreBar
                            key={c.key}
                            label={c.label}
                            value={evaluation[c.key as keyof typeof evaluation] as number}
                          />
                        ))}
                      </div>
                    </div>

                    {evaluation.aiSummary && (
                      <div className="border-t border-border pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="w-3.5 h-3.5 text-accent" />
                          <h5 className="text-xs font-semibold">Resumo IA</h5>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{evaluation.aiSummary}</p>
                        {evaluation.aiInsights && (
                          <div className="mt-2 p-2.5 rounded-lg bg-accent/10 border border-accent/20">
                            <p className="text-xs text-accent leading-relaxed">💡 {evaluation.aiInsights}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!evaluation && selectedMeeting.status === 'completed' && (
                  <Button size="sm" className="w-full text-xs bg-gradient-primary">
                    <Brain className="w-3.5 h-3.5 mr-1.5" />
                    Analisar com IA
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
