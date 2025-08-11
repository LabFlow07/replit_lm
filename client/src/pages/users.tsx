import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Building } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Sidebar from '@/components/layout/sidebar';

interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  companyId?: string;
  isActive: boolean;
  createdAt: string;
  company?: {
    id: string;
    name: string;
    type: string;
  };
}

interface Company {
  id: string;
  name: string;
  type: string;
  parentId?: string;
}

export default function UsersPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Fetch users based on role permissions
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/users', user?.id, user?.role, user?.companyId],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    }
  });

  // Fetch companies for user creation
  const { data: companies = [] } = useQuery({
    queryKey: ['/api/companies', user?.id, user?.role, user?.companyId],
    enabled: !!user,
    queryFn: async () => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch companies');
      return response.json();
    }
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      if (!response.ok) throw new Error('Failed to create user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateModalOpen(false);
      toast({
        title: "Utente creato",
        description: "L'utente è stato creato con successo."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update user');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      toast({
        title: "Utente aggiornato",
        description: "L'utente è stato aggiornato con successo."
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem('qlm_token');
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete user');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Utente eliminato",
        description: "L'utente è stato eliminato con successo."
      });
    }
  });

  useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  // Clear React Query cache when user changes to prevent stale data
  useEffect(() => {
    if (user?.id) {
      queryClient.invalidateQueries();
    }
  }, [user?.id, queryClient]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Check permissions
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Accesso Negato</h2>
          <p>Non hai i permessi per accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((user: User) => {
    const searchMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const roleMatch = roleFilter === "all" || user.role === roleFilter;
    return searchMatch && roleMatch;
  });

  // Define what roles current user can create
  const getAllowedRoles = () => {
    if (user.role === 'superadmin') {
      return [
        { value: 'admin', label: 'Admin Azienda' },
        { value: 'user', label: 'Utente' }
      ];
    } else if (user.role === 'admin') {
      return [
        { value: 'admin', label: 'Admin Sotto-Azienda' },
        { value: 'user', label: 'Utente' }
      ];
    }
    return [];
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin': return 'destructive';
      case 'admin': return 'default';
      case 'user': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'admin': return 'Admin';
      case 'user': return 'Utente';
      default: return role;
    }
  };

  const handleCreateUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const userData = {
      username: formData.get('username'),
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      role: formData.get('role'),
      companyId: formData.get('companyId') || user.companyId
    };

    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (userId: string, updates: any) => {
    updateUserMutation.mutate({ id: userId, updates });
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Sei sicuro di voler eliminare questo utente?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Gestione Utenti
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {user.role === 'superadmin' 
                  ? 'Gestisci tutti gli utenti del sistema'
                  : 'Gestisci gli utenti della tua azienda e sotto-aziende'
                }
              </p>
            </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-user">
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Utente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crea Nuovo Utente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input id="username" name="username" required data-testid="input-username" />
                </div>
                <div>
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" name="name" required data-testid="input-name" />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input id="email" name="email" type="email" required data-testid="input-email" />
              </div>
              
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input id="password" name="password" type="password" required data-testid="input-password" />
              </div>
              
              <div>
                <Label htmlFor="role">Ruolo *</Label>
                <Select name="role" required>
                  <SelectTrigger data-testid="select-role">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllowedRoles().map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {user.role === 'superadmin' && (
                <div>
                  <Label htmlFor="companyId">Azienda</Label>
                  <Select name="companyId">
                    <SelectTrigger data-testid="select-company">
                      <SelectValue placeholder="Seleziona azienda (opzionale per admin)" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company: Company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} ({company.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending} data-testid="button-save-user">
                  {createUserMutation.isPending ? 'Creazione...' : 'Crea Utente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Cerca per nome, username o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-48" data-testid="select-role-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i ruoli</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Utente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Utenti ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nessun utente trovato.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((userItem: User) => (
                <div key={userItem.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`user-card-${userItem.id}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" data-testid={`text-user-name-${userItem.id}`}>{userItem.name}</h3>
                        <Badge variant={getRoleBadgeVariant(userItem.role)} data-testid={`badge-role-${userItem.id}`}>
                          {getRoleLabel(userItem.role)}
                        </Badge>
                        {!userItem.isActive && (
                          <Badge variant="outline" data-testid={`badge-inactive-${userItem.id}`}>Inattivo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`text-user-email-${userItem.id}`}>
                        {userItem.email} • @{userItem.username}
                      </p>
                      {userItem.company && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {userItem.company.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUser(userItem)}
                      data-testid={`button-edit-${userItem.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.id !== userItem.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(userItem.id)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-${userItem.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Modifica Utente</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const updates: any = {
                username: formData.get('username'),
                name: formData.get('name'),
                email: formData.get('email'),
                isActive: formData.get('isActive') === 'true'
              };
              
              // Gestisci il companyId
              const companyId = formData.get('companyId') as string;
              if (companyId && companyId !== 'none') {
                updates.companyId = companyId;
              } else {
                updates.companyId = null;
              }
              
              // Solo includi la password se è stata inserita
              const password = formData.get('password') as string;
              if (password && password.trim()) {
                updates.password = password;
              }
              
              handleUpdateUser(editingUser.id, updates);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-username">Username *</Label>
                  <Input id="edit-username" name="username" defaultValue={editingUser.username} required />
                </div>
                <div>
                  <Label htmlFor="edit-name">Nome Completo *</Label>
                  <Input id="edit-name" name="name" defaultValue={editingUser.name} required />
                </div>
              </div>
              
              <div>
                <Label htmlFor="edit-email">Email *</Label>
                <Input id="edit-email" name="email" type="email" defaultValue={editingUser.email} required />
              </div>
              
              <div>
                <Label htmlFor="edit-password">Nuova Password</Label>
                <Input 
                  id="edit-password" 
                  name="password" 
                  type="password" 
                  placeholder="Lascia vuoto per mantenere la password attuale"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Inserisci una nuova password solo se vuoi cambiarla
                </p>
              </div>

              {user.role === 'superadmin' && (
                <div>
                  <Label htmlFor="edit-company">Azienda</Label>
                  <Select name="companyId" defaultValue={editingUser.companyId || 'none'}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona azienda" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nessuna azienda</SelectItem>
                      {companies.map((company: Company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name} ({company.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="edit-isActive">Stato</Label>
                <Select name="isActive" defaultValue={editingUser.isActive.toString()}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Attivo</SelectItem>
                    <SelectItem value="false">Inattivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                  Annulla
                </Button>
                <Button type="submit" disabled={updateUserMutation.isPending}>
                  {updateUserMutation.isPending ? 'Aggiornamento...' : 'Aggiorna Utente'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
        </div>
      </div>
    </div>
  );
}