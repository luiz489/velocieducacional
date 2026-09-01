import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Gera uma URL assinada (temporária, expira em 1h por padrão) para um arquivo
 * privado no Storage. O banco guarda só o caminho (ex: "escola-id/logo.png"),
 * não a URL - isso é gerado sob demanda, respeitando a permissão de quem pede.
 */
export function useSignedUrl(bucket: string, path: string | null | undefined, expiresInSeconds = 3600) {
  return useQuery({
    queryKey: ["signed-url", bucket, path],
    enabled: !!path,
    staleTime: (expiresInSeconds - 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path!, expiresInSeconds);
      if (error) return null;
      return data.signedUrl;
    },
  });
}
