import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSuperadmin() {
  const { user, loading } = useAuth();

  const query = useQuery({
    queryKey: ["is-superadmin-erp", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_superadmin_erp", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data === true;
    },
  });

  return {
    isSuperadmin: query.data === true,
    checking: loading || (!!user && query.isLoading),
    user,
    authLoading: loading,
  };
}
