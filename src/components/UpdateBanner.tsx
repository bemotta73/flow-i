import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { X, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function UpdateBanner() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (role !== "admin") return;

    const checkBanner = async () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, 2=Tue...

      // Show only on Monday (1) and Tuesday (2)
      if (dayOfWeek < 1 || dayOfWeek > 2) return;

      // Check if already dismissed this session
      const dismissedKey = `update_banner_dismissed_${now.toISOString().slice(0, 10)}`;
      if (sessionStorage.getItem(dismissedKey)) return;

      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "lista_mix_ultima_atualizacao")
        .maybeSingle();

      const lastDate = data?.valor || null;
      setLastUpdate(lastDate);
      setIsUrgent(dayOfWeek === 2); // Tuesday = urgent
      setVisible(true);
    };

    checkBanner();
  }, [role]);

  const handleDismiss = () => {
    const now = new Date();
    const dismissedKey = `update_banner_dismissed_${now.toISOString().slice(0, 10)}`;
    sessionStorage.setItem(dismissedKey, "true");
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  const formattedDate = lastUpdate
    ? new Date(lastUpdate).toLocaleDateString("pt-BR")
    : "Nunca";

  return (
    <div
      className={`mb-6 rounded-xl px-5 py-4 flex items-center gap-4 transition-all duration-300 animate-fade-in-up ${
        isUrgent
          ? "bg-[rgba(139,92,246,0.12)] border border-[rgba(139,92,246,0.3)]"
          : "bg-[rgba(20,184,166,0.12)] border border-[rgba(20,184,166,0.3)]"
      }`}
    >
      <ClipboardList className={`h-5 w-5 flex-shrink-0 ${isUrgent ? "text-[#8B5CF6]" : "text-primary"}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isUrgent ? "text-[#8B5CF6]" : "text-primary"}`}>
          📋 Hora de atualizar a Lista Mix!
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Última atualização: {formattedDate}
        </p>
      </div>
      <Button
        size="sm"
        className={`gap-2 flex-shrink-0 ${
          isUrgent
            ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
            : ""
        }`}
        onClick={() => navigate("/lista-mix")}
      >
        Ir para Lista Mix
      </Button>
      <button
        onClick={handleDismiss}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
