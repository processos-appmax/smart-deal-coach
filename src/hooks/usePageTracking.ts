import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/contexts/AuditLogContext';

const PAGE_LABELS: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/meetings':     'Reuniões',
  '/whatsapp':     'WhatsApp',
  '/teams':        'Times',
  '/users':        'Usuários',
  '/reports':      'Relatórios',
  '/integrations': 'Integrações',
  '/automations':  'Automações',
  '/admin':        'Painel Admin',
  '/performance':  'Desempenho',
  '/training':     'Treinamento',
  '/ai-config':    'Config IA',
};

export function usePageTracking() {
  const { user } = useAuth();
  const { addEvent } = useAuditLog();
  const location = useLocation();
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!user) return;
    if (location.pathname === lastPath.current) return;
    lastPath.current = location.pathname;

    addEvent({
      type: 'page_view',
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      userEmail: user.email,
      page: location.pathname,
      pageLabel: PAGE_LABELS[location.pathname] ?? location.pathname,
    });
  }, [location.pathname, user, addEvent]);
}
