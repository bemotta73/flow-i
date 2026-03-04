import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";
import vorneLogo from "@/assets/vorne-logo.png";

const Login = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) setError(error);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-warning tracking-tight">CotaFlow</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
            Officer Distribuidora
          </p>
        </div>

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

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full gap-2"
            disabled={loading}
          >
            <LogIn className="h-4 w-4" />
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

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

export default Login;
