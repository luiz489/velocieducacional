import { User } from "lucide-react";
import { useSignedUrl } from "@/hooks/useSignedUrl";

export function AvatarFoto({
  path,
  bucket = "pessoas-fotos",
  alt = "Foto",
  className = "h-8 w-8",
  iconSize = "h-4 w-4",
}: {
  path: string | null | undefined;
  bucket?: string;
  alt?: string;
  className?: string;
  iconSize?: string;
}) {
  const { data: url } = useSignedUrl(bucket, path);

  return (
    <div className={`rounded-full border bg-muted flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      {url ? (
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <User className={`${iconSize} text-muted-foreground`} />
      )}
    </div>
  );
}
