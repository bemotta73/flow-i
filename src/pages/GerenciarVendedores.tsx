import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { UserPlus, UserCheck, UserX, KeyRound, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Usuario {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
  role: string;
}

interface VendorPerms {
  can_see_lista_mix: boolean;
  can_see_promocoes: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  vendedor: "Vendedor",
  espectador: "Espectador",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-primary/20 text-primary",
  vendedor: "bg-secondary/20 text-secondary",
  espectador: "bg-warning/20 text-warning",
};

const GerenciarVendedores = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("vendedor");
  const [saving, setSaving] = useState(false);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);

  const [permsDialogOpen, setPermsDialogOpen] = useState(false);
  const [permsUsuario, setPermsUsuario] = useState<Usuario | null>(null);
  const [perms, setPerms] = useState<VendorPerms>({ can_see_lista_mix: true, can_see_promocoes: true });
  const [savingPerms, setSavingPerms] = useState(false);

  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleUsuario, setRoleUsuario] = useState<Usuario | null>(null);
  const [newRole, setNewRole] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles && roles) {
      const list = profiles
        .filter((p: any) => p.id !== currentUser?.id)
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
        });
      setUsuarios(list);
    }
    setLoading(false);
  };

  useEffect(() => { fetchUsuarios(); }, []);

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

    const res = await supabase.functions.invoke("create-user", {
      body: { email, password, nome, role: selectedRole },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Erro", description: res.data?.error || res.error?.message || "Erro ao criar", variant: "destructive" });
    } else {
      toast({ title: "Usuário criado com sucesso" });
      setDialogOpen(false);
      setNome("");
      setEmail("");
      setPassword("");
      setSelectedRole("vendedor");
      fetchUsuarios();
    }
    setSaving(false);
  };

  const toggleStatus = async (v: Usuario) => {
    const res = await supabase.functions.invoke("toggle-user-status", {
      body: { userId: v.id, ativo: !v.ativo },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Erro", description: res.data?.error || "Erro ao atualizar", variant: "destructive" });
    } else {
      toast({ title: v.ativo ? "Usuário desativado" : "Usuário reativado" });
      fetchUsuarios();
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast({ title: "Erro", description: "Digite a nova senha", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Erro", description: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }
    setResettingPassword(true);

    const res = await supabase.functions.invoke("update-vendor-password", {
      body: { userId: selectedUsuario!.id, newPassword },
    });

    if (res.error || res.data?.error) {
      toast({ title: "Erro", description: res.data?.error || res.error?.message || "Erro ao redefinir senha", variant: "destructive" });
    } else {
      toast({ title: "Senha redefinida com sucesso" });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUsuario(null);
    }
    setResettingPassword(false);
  };

  const openPasswordDialog = (v: Usuario) => {
    setSelectedUsuario(v);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const openPermsDialog = async (v: Usuario) => {
    setPermsUsuario(v);
    const { data } = await supabase
      .from("vendor_permissions")
      .select("can_see_lista_mix, can_see_promocoes")
      .eq("user_id", v.id)
      .maybeSingle();

    setPerms(data || { can_see_lista_mix: true, can_see_promocoes: true });
    setPermsDialogOpen(true);
  };

  const handleSavePerms = async () => {
    if (!permsUsuario) return;
    setSavingPerms(true);

    const { error } = await supabase
      .from("vendor_permissions")
      .upsert({
        user_id: permsUsuario.id,
        can_see_lista_mix: perms.can_see_lista_mix,
        can_see_promocoes: perms.can_see_promocoes,
      }, { onConflict: "user_id" });

    if (error) {
      toast({ title: "Erro", description: "Erro ao salvar permissões", variant: "destructive" });
    } else {
      toast({ title: "Permissões atualizadas" });
      setPermsDialogOpen(false);
    }
    setSavingPerms(false);
  };

  const openRoleDialog = (v: Usuario) => {
    setRoleUsuario(v);
    setNewRole(v.role);
    setRoleDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!roleUsuario || newRole === roleUsuario.role) {
      setRoleDialogOpen(false);
      return;
    }
    setSavingRole(true);

    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", roleUsuario.id);

    if (error) {
      toast({ title: "Erro", description: "Erro ao alterar perfil", variant: "destructive" });
    } else {
      toast({ title: `Perfil alterado para ${ROLE_LABELS[newRole]}` });
      setRoleDialogOpen(false);
      fetchUsuarios();
    }
    setSavingRole(false);
  };

  return (
    <div className="animate-fade-in-up">
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-tight text-foreground">Gerenciar Usuários</h1>
        <p className="text-sm text-muted-foreground mt-1">Crie e gerencie as contas de usuários do sistema</p>
      </div>

      <div className="flex items-center mb-6">
        <Button size="sm" className="gap-2 ml-auto" onClick={() => setDialogOpen(true)}>
          <UserPlus className="h-4 w-4" /> Adicionar Usuário
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl animate-shimmer" />)}
        </div>
      ) : usuarios.length === 0 ? (
        <div className="text-center py-16">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum usuário cadastrado</p>
        </div>
      ) : (
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header-dark border-0">
                <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Nome</TableHead>
                <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Email</TableHead>
                <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Perfil</TableHead>
                <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Status</TableHead>
                <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3">Criado em</TableHead>
                <TableHead className="text-[11px] text-apple-label font-semibold uppercase tracking-wider px-4 py-3 w-36">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuarios.map((v, idx) => (
                <TableRow key={v.id} className={`table-row-hover transition-all duration-150 ${idx % 2 === 1 ? "table-row-alt" : ""}`}>
                  <TableCell className="text-sm font-medium text-foreground px-4 py-3">{v.nome}</TableCell>
                  <TableCell className="text-sm text-muted-foreground px-4 py-3">{v.email}</TableCell>
                  <TableCell className="px-4 py-3">
                    <button
                      onClick={() => openRoleDialog(v)}
                      className={`text-xs px-2 py-0.5 rounded-full cursor-pointer hover:opacity-80 transition-opacity ${ROLE_COLORS[v.role] || "bg-muted text-muted-foreground"}`}
                      title="Clique para alterar perfil"
                    >
                      {ROLE_LABELS[v.role] || v.role}
                    </button>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${v.ativo ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>
                      {v.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground px-4 py-3">
                    {new Date(v.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {(v.role === "vendedor" || v.role === "espectador") && (
                        <button
                          onClick={() => openPermsDialog(v)}
                          className="p-1.5 rounded-lg transition-colors hover:bg-secondary/20 text-secondary"
                          title="Permissões"
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openPasswordDialog(v)}
                        className="p-1.5 rounded-lg transition-colors hover:bg-primary/20 text-primary"
                        title="Redefinir senha"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleStatus(v)}
                        className={`p-1.5 rounded-lg transition-colors ${v.ativo ? "hover:bg-destructive/20 text-destructive" : "hover:bg-success/20 text-success"}`}
                        title={v.ativo ? "Desativar" : "Reativar"}
                      >
                        {v.ativo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary font-semibold">Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="label-apple block mb-1">Nome *</label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} className="surface-input" placeholder="Nome do usuário" />
            </div>
            <div>
              <label className="label-apple block mb-1">Email *</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="surface-input" placeholder="email@exemplo.com" />
            </div>
            <div>
              <label className="label-apple block mb-1">Senha *</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="surface-input" placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label className="label-apple block mb-1">Perfil *</label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="surface-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="espectador">Espectador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Criando..." : "Criar Usuário"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary font-semibold">Redefinir Senha</DialogTitle>
          </DialogHeader>
          {selectedUsuario && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Redefinir senha de <span className="font-medium text-foreground">{selectedUsuario.nome}</span> ({selectedUsuario.email})
              </p>
              <div>
                <label className="label-apple block mb-1">Nova Senha *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="surface-input"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? "Salvando..." : "Redefinir Senha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions dialog */}
      <Dialog open={permsDialogOpen} onOpenChange={setPermsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary font-semibold">Permissões</DialogTitle>
          </DialogHeader>
          {permsUsuario && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configurar acesso de <span className="font-medium text-foreground">{permsUsuario.nome}</span>
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Lista Mix</p>
                    <p className="text-xs text-muted-foreground">Consulta de produtos e preços</p>
                  </div>
                  <Switch
                    checked={perms.can_see_lista_mix}
                    onCheckedChange={(v) => setPerms((p) => ({ ...p, can_see_lista_mix: v }))}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-card border border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Promoções</p>
                    <p className="text-xs text-muted-foreground">Visualização de promoções ativas</p>
                  </div>
                  <Switch
                    checked={perms.can_see_promocoes}
                    onCheckedChange={(v) => setPerms((p) => ({ ...p, can_see_promocoes: v }))}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePerms} disabled={savingPerms}>
              {savingPerms ? "Salvando..." : "Salvar Permissões"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role change dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-primary font-semibold">Alterar Perfil</DialogTitle>
          </DialogHeader>
          {roleUsuario && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Alterar perfil de <span className="font-medium text-foreground">{roleUsuario.nome}</span>
              </p>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger className="surface-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="espectador">Espectador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={savingRole}>
              {savingRole ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GerenciarVendedores;
