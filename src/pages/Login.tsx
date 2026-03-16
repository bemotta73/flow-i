import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn, ArrowLeft, Mail } from "lucide-react";
import vorneLogo from "@/assets/vorne-logo.png";

const Login = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setForgotLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("reset-password", {
        body: { email: forgotEmail },
      });

      if (fnError) {
        setError("Erro ao processar solicitação");
      } else if (data?.error) {
        setError(data.error);
      } else {
        setForgotSuccess(true);
      }
    } catch {
      setError("Erro ao processar solicitação");
    }
    setForgotLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-foreground">Flow</span>
            <span className="text-primary">i</span>
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
            Officer Distribuidora
          </p>
        </div>

        {forgotMode ? (
          forgotSuccess ? (
            <div className="card-elevated p-6 text-center space-y-3">
              <Mail className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm text-foreground">E-mail de redefinição enviado!</p>
              <p className="text-xs text-muted-foreground">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <Button
                variant="ghost"
                className="gap-2 mt-2"
                onClick={() => { setForgotMode(false); setForgotSuccess(false); setForgotEmail(""); setError(""); }}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="card-elevated p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Informe seu e-mail cadastrado para receber o link de redefinição de senha.
              </p>
              <div>
                <label className="label-apple block mb-1.5">Email</label>
                <Input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="surface-input"
                  placeholder="seu@email.com"
                  required
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full gap-2" disabled={forgotLoading}>
                <Mail className="h-4 w-4" />
                {forgotLoading ? "Enviando..." : "Enviar link"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full gap-2"
                onClick={() => { setForgotMode(false); setError(""); }}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Button>
            </form>
          )
        ) : (
          <form onSubmit={handleSubmit} className="card-elevated p-6 space-y-4">
            <div>
              <label className="label-apple block mb-1.5">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="surface-input"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label className="label-apple block mb-1.5">Senha</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="surface-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full gap-2" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <button
              type="button"
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => { setForgotMode(true); setError(""); }}
            >
              Esqueceu a senha?
            </button>
          </form>
        )}

        <div className="flex flex-col items-center gap-1 mt-8">
          <img src={vorneLogo} alt="Vorne AI" className="h-8 w-8" />
          <span className="text-[9px] text-apple-label tracking-wide">
            Desenvolvido por <span className="font-medium text-muted-foreground">Vorne AI</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
