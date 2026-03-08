import { useState } from 'react';
import { MOCK_USERS } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Shield, MoreHorizontal, Mail, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types';

const ROLE_CONFIG: Record<UserRole, { label: string; class: string }> = {
  admin: { label: 'Admin', class: 'bg-destructive/10 text-destructive border-destructive/20' },
  director: { label: 'Diretor', class: 'bg-primary/10 text-primary border-primary/20' },
  supervisor: { label: 'Supervisor', class: 'bg-accent/10 text-accent border-accent/20' },
  member: { label: 'Vendedor', class: 'bg-muted text-muted-foreground border-border' },
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filtered = MOCK_USERS.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="page-container animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Usuários</h1>
          <p className="text-sm text-muted-foreground">{MOCK_USERS.length} usuários cadastrados</p>
        </div>
        <Button size="sm" className="bg-gradient-primary text-xs h-8">
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Convidar Usuário
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar usuários..." className="pl-9 h-8 text-xs bg-secondary border-border" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'admin', 'director', 'supervisor', 'member'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn('text-xs px-3 py-1.5 rounded-lg border transition-all', roleFilter === r ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}
            >
              {{ all: 'Todos', admin: 'Admin', director: 'Diretores', supervisor: 'Supervisores', member: 'Vendedores' }[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full data-table">
          <thead>
            <tr>
              <th className="text-left">Usuário</th>
              <th className="text-left hidden md:table-cell">Email</th>
              <th className="text-center">Perfil</th>
              <th className="text-center">Status</th>
              <th className="text-center hidden lg:table-cell">Desde</th>
              <th className="text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const rc = ROLE_CONFIG[u.role];
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full border border-border" />
                      <div>
                        <p className="text-sm font-medium">{u.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5" />
                      {u.email}
                    </div>
                  </td>
                  <td className="text-center">
                    <span className={cn('text-xs px-2.5 py-0.5 rounded-full border font-medium', rc.class)}>
                      {rc.label}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', u.status === 'active' ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground border-border')}>
                      {u.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="text-center hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="text-center">
                    <button className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center mx-auto transition-colors">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
