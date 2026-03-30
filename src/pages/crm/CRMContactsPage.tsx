import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search, Plus, Filter, ArrowUpDown, Mail, Phone, ExternalLink,
  MoreHorizontal, ChevronLeft, ChevronRight, Download,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  source: string;
  status: 'lead' | 'qualified' | 'customer' | 'churned';
  createdAt: string;
}

const STATUS_CONFIG: Record<Contact['status'], { label: string; class: string }> = {
  lead:      { label: 'Lead',        class: 'bg-muted text-muted-foreground' },
  qualified: { label: 'Qualificado', class: 'bg-warning/15 text-warning' },
  customer:  { label: 'Cliente',     class: 'bg-success/15 text-success' },
  churned:   { label: 'Churned',     class: 'bg-destructive/15 text-destructive' },
};

// Mock data
const MOCK_CONTACTS: Contact[] = Array.from({ length: 25 }, (_, i) => ({
  id: `c-${i}`,
  name: ['Igor Sepúlveda', 'Jussara Kelly', 'Thiago Nascimento', 'Fabricoi Pascoal', 'Ronaltin Lopes', 'Leon Victor', 'Erica Custodia', 'Julio Minatto', 'Maria das Graças', 'Maiara Costa'][i % 10],
  email: [`trafego@hospedare.io`, `jussara@gmail.com`, `thiago@icloud.com`, `oficial@gmail.com`, `roots@gmail.com`, `vleon@gmail.com`, `pedro@gmail.com`, `julio@gmail.com`, `mdgra@gmail.com`, `maya@outlook.com`][i % 10],
  phone: [`+55 73 99909-9972`, `+55 31 97182-5582`, `+55 35 99226-5156`, `+55 13 99620-4549`, `+55 73 99934-6714`, `+55 73 98119-0077`, `+55 31 98499-1492`, `+55 47 99103-3535`, `+55 11 97733-2784`, `+55 71 99686-5418`][i % 10],
  company: ['Hospedare', 'SemiJoias', 'TechCo', 'EbookPro', 'RootSem', 'VLeon', 'Parreira', 'Minatto', 'Silva Inc', 'Costa Ltd'][i % 10],
  source: ['Outras Campanhas', 'Referências', 'Pesquisa Orgânica', 'Tráfego direto', 'AI Referrals'][i % 5],
  status: (['lead', 'qualified', 'customer', 'churned'] as const)[i % 4],
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

export default function CRMContactsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = useMemo(() =>
    MOCK_CONTACTS.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
    ), [search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Contatos</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} contatos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar contato
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar contatos..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="pl-9 h-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">E-mail</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Origem</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {paginated.map(contact => {
                const st = STATUS_CONFIG[contact.status];
                return (
                  <tr key={contact.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {contact.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground truncate max-w-[180px]">{contact.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <a href={`mailto:${contact.email}`} className="hover:text-primary flex items-center gap-1">
                        {contact.email} <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="px-4 py-3 text-primary font-medium">{contact.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.company}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.source}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={cn('text-[11px]', st.class)}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(contact.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                          <DropdownMenuItem>Editar</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Excluir</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="icon"
                className="h-7 w-7 text-xs"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
