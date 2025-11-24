import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Plus, Play, BarChart3, Trash2, Link2 } from 'lucide-react';
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

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta session?')) return;

    try {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;

      // Log audit action
      await logSessionAction('delete_session', sessionId, {
        training_id: trainingId,
      });

      toast.success('Session deletada com sucesso!');
      loadData();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Erro ao deletar session');
    }
  };

  const copySessionLink = (sessionId: string, sessionName: string) => {
    const link = `${window.location.origin}/training/${trainingId}/session/${sessionId}/antessala`;
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
          <Button variant="outline" size="icon" onClick={() => navigate('/admin/trainings')}>
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

      <div className="grid gap-4">
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Nenhuma session criada ainda</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Session
              </Button>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
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
                      onClick={() => handleDeleteSession(session.id)}
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
    </div>
  );
}
