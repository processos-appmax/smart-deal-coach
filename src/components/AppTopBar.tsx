import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Search, Plus, ChevronRight, Home } from 'lucide-react';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Visão geral de performance' },
  '/meetings': { title: 'Reuniões', subtitle: 'Gerencie e analise suas reuniões comerciais' },
  '/whatsapp': { title: 'WhatsApp', subtitle: 'Instâncias e conversas' },
  '/teams': { title: 'Times', subtitle: 'Gerencie equipes e performance' },
  '/users': { title: 'Usuários', subtitle: 'Gestão de acesso e permissões' },
  '/reports': { title: 'Relatórios', subtitle: 'Análises e exportações' },
  '/integrations': { title: 'Integrações', subtitle: 'Conecte ferramentas externas' },
  '/automations': { title: 'Automações', subtitle: 'Fluxos com N8N' },
  '/admin': { title: 'Painel Admin', subtitle: 'Configurações globais da plataforma' },
  '/settings': { title: 'Configurações', subtitle: 'Preferências da sua conta' },
};

export default function AppTopBar() {
  const { user } = useAuth();
  const location = useLocation();
  const page = PAGE_TITLES[location.pathname] || { title: 'Appmax', subtitle: '' };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 gap-4 flex-shrink-0 bg-background/80 backdrop-blur-sm">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Home className="w-3 h-3" />
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{page.title}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:flex items-center">
          <Search className="absolute left-3 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-9 h-8 w-56 text-xs bg-secondary border-border focus:w-72 transition-all duration-200"
          />
        </div>

        <Button
          size="sm"
          className="h-8 text-xs font-medium bg-gradient-primary hover:opacity-90 hidden sm:flex"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Nova Reunião
        </Button>

        <button className="relative w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center hover:bg-muted transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
        </button>

        <img
          src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`}
          alt={user?.name}
          className="w-8 h-8 rounded-full border border-border"
        />
      </div>
    </header>
  );
}
