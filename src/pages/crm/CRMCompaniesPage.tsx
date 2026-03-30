import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search, Plus, Filter, ExternalLink, MoreHorizontal,
  ChevronLeft, ChevronRight, Download, Factory,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Company {
  id: string;
  name: string;
  owner: string;
  phone: string;
  city: string;
  country: string;
  createdAt: string;
  lastActivity: string;
}

const MOCK_COMPANIES: Company[] = Array.from({ length: 20 }, (_, i) => ({
  id: `co-${i}`,
  name: ['HubSpot, Inc.', 'Ayirastore', 'Integracao', 'ejtech.com.br', 'F5LCON', 'bigacessorios.com', 'vokerstore.com.br', 'Suamusica.Com', 'Naotenhosite', 'provisaovip.com.br'][i % 10],
  owner: 'Nenhum proprietário',
  phone: i % 3 === 0 ? `+55 ${Math.floor(Math.random() * 90 + 10)} ${Math.floor(Math.random() * 90000 + 10000)}-${Math.floor(Math.random() * 9000 + 1000)}` : '--',
  city: ['Cambridge', 'São Paulo', 'Rio de Janeiro', '--', 'Curitiba'][i % 5],
  country: ['United States', 'Brazil', 'Brazil', '--', 'Brazil'][i % 5],
  createdAt: new Date(Date.now() - i * 86400000 * 30).toISOString(),
  lastActivity: new Date(Date.now() - i * 86400000 * 5).toISOString(),
}));

export default function CRMCompaniesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 15;

  const filtered = useMemo(() =>
    MOCK_COMPANIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} empresas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Exportar
          </Button>
          <Button size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar empresa
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Pesquisar empresas..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="w-3.5 h-3.5" /> Filtros
        </Button>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome da empresa</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proprietário</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cidade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">País/Região</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Criado em</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Última atividade</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {paginated.map(company => (
                <tr key={company.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Factory className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-primary hover:underline cursor-pointer">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{company.owner}</td>
                  <td className="px-4 py-3 text-primary font-medium">{company.phone}</td>
                  <td className="px-4 py-3 text-muted-foreground">{company.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{company.country}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(company.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(company.lastActivity).toLocaleDateString('pt-BR')}
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
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {((page - 1) * perPage) + 1}–{Math.min(page * perPage, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-7 w-7 text-xs" onClick={() => setPage(p)}>{p}</Button>
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
