import { useState } from 'react';
import { MOCK_TEAMS, MOCK_USERS } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Users, Target, Trophy, ChevronRight, MoreHorizontal, TrendingUp, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TeamsPage() {
  const [selected, setSelected] = useState(MOCK_TEAMS[0].id);

  const team = MOCK_TEAMS.find(t => t.id === selected)!;
  const supervisor = MOCK_USERS.find(u => u.id === team.supervisorId);
  const members = MOCK_USERS.filter(u => team.memberIds.includes(u.id));

  const teamStats = [
    { label: 'Reuniões', value: selected === 'team_001' ? '32' : '25', icon: Video },
    { label: 'Score Médio', value: selected === 'team_001' ? '79' : '73', icon: Trophy },
    { label: 'Meta', value: `${team.goal}`, icon: Target },
  ];

  const roleLabels: Record<string, string> = {
    admin: 'Admin', director: 'Diretor', supervisor: 'Supervisor', member: 'Vendedor'
  };

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Times</h1>
          <p className="text-sm text-muted-foreground">Gerencie equipes e performance</p>
        </div>
        <Button size="sm" className="bg-gradient-primary text-xs h-8">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Criar Time
        </Button>
      </div>

      <div className="flex gap-6">
        {/* Teams List */}
        <div className="w-72 flex-shrink-0 space-y-3">
          {MOCK_TEAMS.map(t => {
            const sup = MOCK_USERS.find(u => u.id === t.supervisorId);
            const mbrs = MOCK_USERS.filter(u => t.memberIds.includes(u.id));
            return (
              <div
                key={t.id}
                className={cn('glass-card p-4 cursor-pointer transition-all', selected === t.id ? 'border-primary/30' : 'hover:border-border/80')}
                onClick={() => setSelected(t.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{sup?.name}</p>
                    </div>
                  </div>
                  <ChevronRight className={cn('w-4 h-4 text-muted-foreground transition-transform', selected === t.id && 'rotate-90 text-primary')} />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {mbrs.slice(0, 3).map(m => (
                      <img key={m.id} src={m.avatar} alt={m.name} className="w-6 h-6 rounded-full border-2 border-card" />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{mbrs.length} membros</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Team Detail */}
        <div className="flex-1 space-y-4">
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display font-bold">{team.name}</h2>
              <Button variant="outline" size="sm" className="text-xs h-7 border-border">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {teamStats.map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-muted/50">
                  <s.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <p className="text-xl font-display font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Supervisor */}
          {supervisor && (
            <div className="glass-card p-5">
              <h3 className="section-title mb-4">Supervisor</h3>
              <div className="flex items-center gap-3">
                <img src={supervisor.avatar} alt={supervisor.name} className="w-10 h-10 rounded-full border border-border" />
                <div>
                  <p className="font-semibold">{supervisor.name}</p>
                  <p className="text-xs text-muted-foreground">{supervisor.email}</p>
                </div>
                <Badge className="ml-auto text-xs" style={{ background: 'hsl(var(--primary)/0.15)', color: 'hsl(var(--primary))', border: '1px solid hsl(var(--primary)/0.2)' }}>
                  {roleLabels[supervisor.role]}
                </Badge>
              </div>
            </div>
          )}

          {/* Members */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">Membros ({members.length})</h3>
              <Button size="sm" variant="outline" className="text-xs h-7 border-border">
                <Plus className="w-3 h-3 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {members.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 transition-colors">
                  <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                  <img src={m.avatar} alt={m.name} className="w-8 h-8 rounded-full border border-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Score</p>
                      <div className="flex items-center gap-2">
                        <Progress value={i === 0 ? 91 : i === 1 ? 87 : 72} className="w-16 h-1" />
                        <span className="text-xs font-medium">{i === 0 ? 91 : i === 1 ? 87 : 72}</span>
                      </div>
                    </div>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full border', m.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border')}>
                      {m.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro neste time.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
