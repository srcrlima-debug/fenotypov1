import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Play, BarChart3, Trash2, Link2, Edit, GitCompare, Copy, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { logSessionAction } from '@/lib/auditLogger';

export default function AdminTrainingSessions() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const [training, setTraining] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({ nome: '', data: '' });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [trainingId]);

  const loadData = async () => {
    try {
      const [trainingRes, sessionsRes] = await Promise.all([
        supabase.from('trainings').select('*').eq('id', trainingId).single(),
        supabase
          .from('sessions')
          .select('*')
          .eq('training_id', trainingId)
          .order('created_at', { ascending: false })
      ]);

      if (trainingRes.error) throw trainingRes.error;
      if (sessionsRes.error) throw sessionsRes.error;

      setTraining(trainingRes.data);
      setSessions(sessionsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newSessionData, error } = await supabase.from('sessions').insert({
        nome: newSession.nome,
        data: newSession.data,
        training_id: trainingId,
        created_by: user?.id,
        session_status: 'waiting'
      }).select().single();

      if (error) throw error;

      // Log audit action
      await logSessionAction('create_session', newSessionData.id, {
        session_name: newSession.nome,
        training_id: trainingId,
      });

      toast.success('Session criada com sucesso!');
      setCreateDialogOpen(false);
      setNewSession({ nome: '', data: '' });
      loadData();
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Erro ao criar session');
    }
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('sessions')
        .update({
          nome: editingSession.nome,
          data: editingSession.data,
        })
        .eq('id', editingSession.id);

      if (error) throw error;

      // Log audit action
      await logSessionAction('update_session', editingSession.id, {
        session_name: editingSession.nome,
        training_id: trainingId,
      });

      toast.success('Sessão atualizada com sucesso!');
      setEditDialogOpen(false);
      setEditingSession(null);
      loadData();
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Erro ao atualizar sessão');
    }
  };

  const handleDeleteSession = async () => {
    if (deletePassword !== 'CONFIRMAR') {
      toast.error('Senha incorreta. Digite "CONFIRMAR" para excluir.');
      return;
    }

    try {
      const { error } = await supabase.from('sessions').delete().eq('id', deletingSessionId);
      if (error) throw error;

      // Log audit action
      await logSessionAction('delete_session', deletingSessionId!, {
        training_id: trainingId,
      });

      toast.success('Sessão deletada com sucesso!');
      setDeleteDialogOpen(false);
      setDeletingSessionId(null);
      setDeletePassword('');
      loadData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erro ao deletar sessão');
    }
  };

  const openEditDialog = (session: any) => {
    setEditingSession({ ...session });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (sessionId: string) => {
    setDeletingSessionId(sessionId);
    setDeleteDialogOpen(true);
  };

  const handleDuplicateSession = async (session: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: duplicatedSession, error } = await supabase.from('sessions').insert({
        nome: `${session.nome} (Cópia)`,
        data: session.data,
        training_id: trainingId,
        created_by: user?.id,
        session_status: 'waiting'
      }).select().single();

      if (error) throw error;

      await logSessionAction('duplicate_session', duplicatedSession.id, {
        original_session_id: session.id,
        session_name: duplicatedSession.nome,
        training_id: trainingId,
      });

      toast.success('Sessão duplicada com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error duplicating session:', error);
      toast.error('Erro ao duplicar sessão');
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesSearch = session.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.session_status === statusFilter;
    const matchesDate = !dateFilter || session.data === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const copySessionLink = (sessionId: string, sessionName: string) => {
    const link = `${window.location.origin}/session/${sessionId}/acesso`;
    navigator.clipboard.writeText(link);
    toast.success(`Link da sessão "${sessionName}" copiado!`);
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      waiting: 'bg-yellow-500',
      active: 'bg-green-500',
      showing_results: 'bg-blue-500',
      completed: 'bg-gray-500'
    };
    const labels: any = {
      waiting: 'Aguardando',
      active: 'Ativa',
      showing_results: 'Mostrando Resultados',
      completed: 'Concluída'
    };
    return <Badge className={variants[status] || 'bg-gray-500'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/sessions')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Sessions - {training?.nome}</h1>
            <p className="text-muted-foreground">
              {new Date(training?.data).toLocaleDateString('pt-BR')} • {sessions.length} sessions
            </p>
          </div>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Session</DialogTitle>
              <DialogDescription>Preencha as informações da session de votação</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome da Session</Label>
                <Input
                  id="nome"
                  value={newSession.nome}
                  onChange={(e) => setNewSession({ ...newSession, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input
                  id="data"
                  type="date"
                  value={newSession.data}
                  onChange={(e) => setNewSession({ ...newSession, data: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Criar Session</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm"
              >
                <option value="all">Todos os Status</option>
                <option value="waiting">Aguardando</option>
                <option value="active">Ativa</option>
                <option value="showing_results">Mostrando Resultados</option>
                <option value="completed">Concluída</option>
              </select>
            </div>
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filtrar por data"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredSessions.length === 0 && sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma session criada ainda</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Session
              </Button>
            </CardContent>
          </Card>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">Nenhuma sessão encontrada com os filtros aplicados</p>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => (
            <Card key={session.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {session.nome}
                      {getStatusBadge(session.session_status)}
                    </CardTitle>
                    <CardDescription>
                      {new Date(session.data).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copySessionLink(session.id, session.nome)}
                    >
                      <Link2 className="w-4 h-4 mr-2" />
                      Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/live/${session.id}`)}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Controlar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/dashboard/${session.id}`)}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/session-comparator/${session.id}`)}
                    >
                      <GitCompare className="w-4 h-4 mr-2" />
                      Comparar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDuplicateSession(session)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(session)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteDialog(session.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Sessão</DialogTitle>
            <DialogDescription>Modifique as informações da sessão</DialogDescription>
          </DialogHeader>
          {editingSession && (
            <form onSubmit={handleEditSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome da Sessão</Label>
                <Input
                  id="edit-nome"
                  value={editingSession.nome}
                  onChange={(e) => setEditingSession({ ...editingSession, nome: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-data">Data</Label>
                <Input
                  id="edit-data"
                  type="date"
                  value={editingSession.data}
                  onChange={(e) => setEditingSession({ ...editingSession, data: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">Salvar Alterações</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá deletar todos os dados associados à sessão.
              Para confirmar, digite <strong>CONFIRMAR</strong> no campo abaixo:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            <Input
              placeholder="Digite CONFIRMAR"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeletePassword('');
              setDeletingSessionId(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir Sessão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
