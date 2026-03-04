import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { UserPlus, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Vendedor {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
  role: string;
}

const GerenciarVendedores = () => {
  const { toast } = useToast();
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchVendedores = async () => {
    setLoading(true);
    // Get all profiles that have vendedor role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles && roles) {
      const vendList = profiles
        .map((p: any) => {
          const userRole = roles.find((r: any) => r.user_id === p.id);
          return {
            id: p.id,
            nome: p.nome,
            email: p.email,
            ativo: p.ativo,
            created_at: p.created_at,
            role: userRole?.role || "vendedor",
          };
        })
        .filter((v) => v.role === "vendedor");
      setVendedores(vendList);
    }
    setLoading(false);
  };

  useEffect(() => { fetchVendedores(); }, []);

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("create-user", {
      body: { email, password, nome, role: "vendedor" },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Erro", description: res.data?.error || res.error?.message || "Erro ao criar", variant: "destructive" });
    } else {
      toast({ title: "Vendedor criado com sucesso" });
      setDialogOpen(false);
      setNome("");
      setEmail("");
      setPassword("");
      fetchVendedores();
    }
    setSaving(false);
  };

  const toggleStatus = async (v: Vendedor) => {
    const res = await supabase.functions.invoke("toggle-user-status", {
      body: { userId: v.id, ativo: !v.ativo },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Erro", description: res.data?.error || "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ title: v.ativo ? "Vendedor desativado" : "Vendedor reativado" });
      fetchVendedores();
    }
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-warning">Gerenciar Vendedores</h1>
        <p className="text-sm text-muted-foreground mt-1">Crie e gerencie as contas dos vendedores</p>
      </div>

      <div className="flex items-center mb-6">
        <Button size="sm" className="gap-2 ml-auto" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4" /> Adicionar Vendedor
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-2xl animate-shimmer" />)}
        </div>
      ) : vendedores.length === 0 ? (
        <div className="text-center py-16">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum vendedor cadastrado</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header-dark border-0">
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Nome</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Criado em</TableHead>
                <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider w-20">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendedores.map((v, idx) => (
                <TableRow key={v.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                  <TableCell className="text-sm font-medium text-foreground">{v.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.email}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.ativo ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                      {v.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(v.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleStatus(v)}
                      className={`p-1.5 rounded-lg transition-colors ${v.ativo ? "hover:bg-destructive/20 text-destructive" : "hover:bg-success/20 text-success"}`}
                    >
                      {v.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-card-border">
          <DialogHeader>
            <DialogTitle className="text-warning font-semibold">Novo Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="label-apple block mb-1">Nome *</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="surface-input" placeholder="Nome do vendedor" />
            </div>
            <div>
              <label className="label-apple block mb-1">Email *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="surface-input" placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="label-apple block mb-1">Senha *</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="surface-input" placeholder="Mínimo 6 caracteres" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Criando..." : "Criar Vendedor"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenciarVendedores;
