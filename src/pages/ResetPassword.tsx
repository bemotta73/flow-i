import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, CheckCircle } from "lucide-react";
import vorneLogo from "@/assets/vorne-logo.png";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") === "recovery") {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    }
    setLoading(false);
  };

  if (!isRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center animate-fade-in-up">
          <h1 className="text-2xl font-bold text-warning mb-2">Flow-!</h1>
          <p className="text-sm text-muted-foreground">Link inválido ou expirado.</p>
          <a href="/" className="text-sm text-primary underline mt-4 inline-block">Voltar ao login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-warning tracking-tight">CotaFlow</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
            Redefinir Senha
          </p>
        </div>

        {success ? (
          <div className="card-elevated p-6 text-center space-y-3">
            <CheckCircle className="h-10 w-10 text-green-500 mx-auto" />
            <p className="text-sm text-foreground">Senha redefinida com sucesso!</p>
            <p className="text-xs text-muted-foreground">Redirecionando...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
            <div>
              <label className="label-apple block mb-1.5">Nova Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="surface-input"
                placeholder="••••••••"
                required
              />
            </div>
            <div>
              <label className="label-apple block mb-1.5">Confirmar Senha</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="surface-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <KeyRound className="h-4 w-4" />
              {loading ? "Salvando..." : "Redefinir Senha"}
            </Button>
          </form>
        )}

        <div className="flex flex-col items-center gap-1 mt-8">
          <img src={vorneLogo} alt="Vorne AI" className="h-8 w-8" />
          <span className="text-[9px] text-muted-foreground tracking-wide">
            Desenvolvido por <span className="font-medium text-foreground/70">Vorne AI</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
