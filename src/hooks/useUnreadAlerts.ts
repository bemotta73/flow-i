import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadAlerts() {
  const [count, setCount] = useState(0);
  const { user, role } = useAuth();

  const fetchCount = async () => {
    if (!user || role !== "admin") return;
    const { count: c } = await supabase
      .from("alertas")
      .select("*", { count: "exact", head: true })
      .eq("lido", false);
    setCount(c || 0);
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user, role]);

  return { count, refresh: fetchCount };
}
