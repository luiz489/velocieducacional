import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, UserPlus, Loader2 } from "lucide-react";

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  roles: string[];
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const checkAdminStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const admin = data?.some((r) => r.role === "admin");
    setIsAdmin(!!admin);
    return admin;
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("admin-users", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      // Use fetch directly for GET with query params
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=list`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao carregar usuários");
      }

      const data = await response.json();
      setUsers(data);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao carregar usuários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setBootstrapping(true);
    try {
      const { data, error } = await supabase.rpc("bootstrap_admin");
      if (error) throw error;
      if (data) {
        toast({ title: "Sucesso", description: "Você agora é administrador!" });
        await checkAdminStatus();
        await loadUsers();
      } else {
        toast({
          title: "Não disponível",
          description: "Já existe um administrador no sistema.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setBootstrapping(false);
    }
  };

  const handleRoleAction = async (userId: string, role: string, action: "assign-role" | "remove-role") => {
    setActionLoading(`${userId}-${role}-${action}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users?action=${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ user_id: userId, role }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast({ title: "Sucesso", description: data.message });
      await loadUsers();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const init = async () => {
      const admin = await checkAdminStatus();
      if (admin) await loadUsers();
      else setLoading(false);
    };
    if (user) init();
  }, [user]);

  if (!isAdmin) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Administração de Usuários</h1>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Acesso Restrito
            </CardTitle>
            <CardDescription>
              Esta página é restrita a administradores. Se você é o primeiro usuário do sistema, clique abaixo para se tornar administrador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              {bootstrapping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Tornar-me Administrador
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administração de Usuários</h1>
        <Badge variant="outline" className="text-xs">
          <ShieldCheck className="mr-1 h-3 w-3" />
          Administrador
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>
            Gerencie os papéis dos usuários. Usuários com papel <strong>staff</strong> podem acessar os dados do ERP. Administradores podem gerenciar outros usuários.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.length === 0 && (
                          <Badge variant="secondary" className="text-xs">Sem papel</Badge>
                        )}
                        {u.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === "admin" ? "default" : "outline"}
                            className="text-xs"
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {!u.roles.includes("staff") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === `${u.id}-staff-assign-role`}
                            onClick={() => handleRoleAction(u.id, "staff", "assign-role")}
                          >
                            {actionLoading === `${u.id}-staff-assign-role` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <UserPlus className="mr-1 h-3 w-3" />
                                + Staff
                              </>
                            )}
                          </Button>
                        )}
                        {u.roles.includes("staff") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={actionLoading === `${u.id}-staff-remove-role`}
                            onClick={() => handleRoleAction(u.id, "staff", "remove-role")}
                          >
                            - Staff
                          </Button>
                        )}
                        {!u.roles.includes("admin") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={actionLoading === `${u.id}-admin-assign-role`}
                            onClick={() => handleRoleAction(u.id, "admin", "assign-role")}
                          >
                            {actionLoading === `${u.id}-admin-assign-role` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <ShieldCheck className="mr-1 h-3 w-3" />
                                + Admin
                              </>
                            )}
                          </Button>
                        )}
                        {u.roles.includes("admin") && u.id !== user?.id && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={actionLoading === `${u.id}-admin-remove-role`}
                            onClick={() => handleRoleAction(u.id, "admin", "remove-role")}
                          >
                            - Admin
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
