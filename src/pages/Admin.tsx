import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, Plus, CalendarDays, Users, Link2, ChartBar, Play, Pencil, Trash2, TriangleAlert, TrendingUp, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { sessionSchema } from '@/lib/validators';
import { z } from 'zod';
import { Header } from '@/components/Header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Session {
  id: string;
  nome: string;
  data: string;
  created_at: string;
  session_status?: string;
}

const Admin = () => {
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deletingSession, setDeletingSession] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editData, setEditData] = useState('');
  const [editingSession, setEditingSession] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Erro ao carregar sessões',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSessions(data || []);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = sessionSchema.parse({ 
        nome, 
        data,
        photo_duration: 60 
      });

      setLoading(true);

      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({
          nome: validatedData.nome,
          data: validatedData.data,
          created_by: user?.id,
        })
        .select()
        .single();

      setLoading(false);

      if (error) {
        toast({
          title: 'Erro ao criar sessão',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Sessão criada!',
          description: 'Link gerado com sucesso',
        });
        setNome('');
        setData('');
        fetchSessions();
        
        // Copy link to clipboard
        const link = `${window.location.origin}/antessala/${newSession.id}`;
        navigator.clipboard.writeText(link);
        toast({
          title: 'Link copiado!',
          description: 'Link compartilhável copiado para a área de transferência',
        });
      }
    } catch (error) {
      setLoading(false);
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Erro',
          description: 'Ocorreu um erro ao criar a sessão',
          variant: 'destructive',
        });
      }
    }
  };

  const copyLink = (sessionId: string) => {
    const link = `${window.location.origin}/antessala/${sessionId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'Link compartilhável copiado para a área de transferência',
    });
  };

  const handleEditClick = (session: Session) => {
    setEditSession(session);
    setEditNome(session.nome);
    setEditData(session.data);
  };

  const handleEditSave = async () => {
    if (!editSession) return;
    
    try {
      setEditingSession(true);
      
      const validation = sessionSchema.safeParse({
        nome: editNome,
        data: editData,
      });

      if (!validation.success) {
        toast({
          title: 'Erro de validação',
          description: validation.error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('sessions')
        .update({
          nome: editNome,
          data: editData,
        })
        .eq('id', editSession.id);

      if (error) throw error;

      toast({
        title: 'Sessão atualizada',
        description: 'As informações da sessão foram atualizadas com sucesso',
      });

      setEditSession(null);
      setEditNome('');
      setEditData('');
      fetchSessions();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a sessão',
        variant: 'destructive',
      });
    } finally {
      setEditingSession(false);
    }
  };

  const handleDeleteClick = (sessionId: string) => {
    setDeleteSessionId(sessionId);
    setDeletePassword('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSessionId || !user) return;

    try {
      setDeletingSession(true);

      // Verify password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword,
      });

      if (signInError) {
        toast({
          title: 'Senha incorreta',
          description: 'A senha fornecida está incorreta',
          variant: 'destructive',
        });
        return;
      }

      // Delete session
      const { error: deleteError } = await supabase
        .from('sessions')
        .delete()
        .eq('id', deleteSessionId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Sessão excluída',
        description: 'A sessão foi excluída com sucesso',
      });

      setDeleteSessionId(null);
      setDeletePassword('');
      fetchSessions();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a sessão',
        variant: 'destructive',
      });
    } finally {
      setDeletingSession(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Painel Administrativo</h1>
              <p className="text-muted-foreground mt-2">Gerencie sessões de avaliação</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/admin/history')}
                className="gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Ver Histórico
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/admin/comparison')}
                className="gap-2"
              >
                <ChartBar className="h-4 w-4" />
                Comparar Sessões
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate('/admin/comparator')}
                className="gap-2 group"
              >
                <TrendingUp className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                Comparador Interativo
              </Button>
            </div>
          </div>

        {/* Create Session Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Nova Sessão
            </CardTitle>
            <CardDescription>
              Crie uma sessão de avaliação e gere um link compartilhável
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Atividade</Label>
                  <Input
                    id="nome"
                    placeholder="Ex: Avaliação Fenotípica - Turma A"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data de Realização</Label>
                  <Input
                    id="data"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? 'Gerando...' : 'Gerar Link'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Sessões Criadas
          </h2>
          <div className="grid gap-4">
            {sessions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  Nenhuma sessão criada ainda
                </CardContent>
              </Card>
            ) : (
              sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg">{session.nome}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-4 w-4" />
                            {format(new Date(session.data), 'dd/MM/yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Link2 className="h-4 w-4" />
                            Criada em {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {/* 1. Link de Cadastro - Primeiro */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            const link = `${window.location.origin}/antessala/${session.id}`;
                            navigator.clipboard.writeText(link);
                            toast({
                              title: 'Link de Cadastro Copiado!',
                              description: 'Link para cadastro e vinculação de participantes copiado',
                            });
                          }}
                          className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                          <UserPlus className="h-4 w-4" />
                          Link Cadastro
                        </Button>

                        {/* 2. Controlar Ao Vivo - Verde */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => navigate(`/admin/live/${session.id}`)}
                          className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                          <Play className="h-4 w-4" />
                          Controlar Ao Vivo
                        </Button>

                        {/* 3. Link para Ao Vivo - Laranja */}
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => copyLink(session.id)}
                          className="gap-2 bg-orange-600 hover:bg-orange-700"
                        >
                          <Copy className="h-4 w-4" />
                          Link Ao Vivo
                        </Button>

                        {/* 4. Dashboard */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/dashboard/${session.id}`)}
                        >
                          <ChartBar className="h-4 w-4 mr-2" />
                          Dashboard
                        </Button>

                        {/* 5. Análise Demográfica */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/analytics/${session.id}`)}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          Análise Demográfica
                        </Button>

                        {/* 6. Divergências */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/divergence/${session.id}`)}
                        >
                          <TriangleAlert className="h-4 w-4 mr-2" />
                          Divergências
                        </Button>

                        {/* 7. Editar */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(session)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>

                        {/* 8. Excluir */}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(session.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Edit Session Dialog */}
      <Dialog open={!!editSession} onOpenChange={(open) => !open && setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
            <DialogDescription>
              Atualize as informações da sessão
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nome">Nome da Atividade</Label>
              <Input
                id="edit-nome"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                placeholder="Ex: Treinamento de Identificação Fenotípica"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-data">Data</Label>
              <Input
                id="edit-data"
                type="date"
                value={editData}
                onChange={(e) => setEditData(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditSession(null)}
              disabled={editingSession}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editingSession}
            >
              {editingSession ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Dialog with Password Confirmation */}
      <AlertDialog open={!!deleteSessionId} onOpenChange={(open) => !open && setDeleteSessionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Para confirmar a exclusão desta sessão, 
              digite sua senha de administrador abaixo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-password">Senha do Administrador</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Digite sua senha"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteSessionId(null);
                setDeletePassword('');
              }}
              disabled={deletingSession}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletingSession || !deletePassword}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingSession ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Admin;
