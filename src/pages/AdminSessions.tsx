import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Link2, Play, BarChart3, Copy, GitCompare, FileText, Edit, Trash2 } from 'lucide-react';
import { logAuditAction } from '@/lib/auditLogger';

interface Session {
  id: string;
  nome: string;
  data: string;
  descricao: string | null;
  session_status: string | null;
  created_at: string;
  training_id: string | null;
  participant_count?: number;
}

export default function AdminSessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [newSession, setNewSession] = useState({
    nome: '',
    data: '',
    descricao: ''
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      
      // Busca sessões com contagem de participantes
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('sessions')
        .select('*')
        .order('data', { ascending: false });

      if (sessionsError) throw sessionsError;

      // Para cada sessão, conta participantes via training_id
      const sessionsWithCounts = await Promise.all(
        (sessionsData || []).map(async (session) => {
          if (session.training_id) {
            const { count } = await supabase
              .from('training_participants')
              .select('*', { count: 'exact', head: true })
              .eq('training_id', session.training_id);
            
            return { ...session, participant_count: count || 0 };
          }
          return { ...session, participant_count: 0 };
        })
      );

      setSessions(sessionsWithCounts);
    } catch (error: any) {
      console.error('Error loading sessions:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async () => {
    if (!user || !newSession.nome || !newSession.data) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // 1. Cria training automaticamente em background
      const { data: training, error: trainingError } = await supabase
        .from('trainings')
        .insert({
          nome: newSession.nome,
          data: newSession.data,
          descricao: newSession.descricao,
          created_by: user.id,
          status: 'active'
        })
        .select()
        .single();

      if (trainingError) throw trainingError;

      // 2. Cria sessão vinculada
      const { error: sessionError } = await supabase
        .from('sessions')
        .insert({
          nome: newSession.nome,
          data: newSession.data,
          descricao: newSession.descricao,
          training_id: training.id,
          created_by: user.id
        });

      if (sessionError) throw sessionError;

      // Log audit
      await logAuditAction({
        action: 'create_session',
        resourceType: 'session',
        resourceId: training.id,
        details: { session_name: newSession.nome }
      });

      toast.success('Sessão criada com sucesso!');
      setIsCreateDialogOpen(false);
      setNewSession({ nome: '', data: '', descricao: '' });
      loadSessions();
    } catch (error: any) {
      console.error('Error creating session:', error);
      toast.error('Erro ao criar sessão');
    }
  };

  const copySessionLink = (sessionId: string) => {
    const link = `${window.location.origin}/session/${sessionId}/acesso`;
    navigator.clipboard.writeText(link);
    toast.success('Link copiado!');
  };

  const toggleComparison = (sessionId: string) => {
    setSelectedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const navigateToComparison = () => {
    if (selectedSessions.length < 2) {
      toast.error('Selecione pelo menos 2 sessões para comparar');
      return;
    }
    navigate(`/admin/session-comparison?sessions=${selectedSessions.join(',')}`);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'waiting':
        return 'bg-yellow-500';
      case 'showing_results':
        return 'bg-blue-500';
      case 'finished':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'waiting':
        return 'Aguardando';
      case 'showing_results':
        return 'Mostrando Resultados';
      case 'finished':
        return 'Finalizada';
      default:
        return 'Aguardando';
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando sessões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Gestão de Sessões</h1>
            <p className="text-muted-foreground">Crie e gerencie sessões de treinamento</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Nova Sessão
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Sessão</DialogTitle>
                <DialogDescription>
                  Preencha os dados da sessão de treinamento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Sessão *</Label>
                  <Input
                    id="nome"
                    value={newSession.nome}
                    onChange={(e) => setNewSession({ ...newSession, nome: e.target.value })}
                    placeholder="Ex: Treinamento Bancas 2024"
                  />
                </div>
                <div>
                  <Label htmlFor="data">Data *</Label>
                  <Input
                    id="data"
                    type="date"
                    value={newSession.data}
                    onChange={(e) => setNewSession({ ...newSession, data: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={newSession.descricao}
                    onChange={(e) => setNewSession({ ...newSession, descricao: e.target.value })}
                    placeholder="Descreva o objetivo desta sessão..."
                    rows={3}
                  />
                </div>
                <Button onClick={handleCreateSession} className="w-full">
                  Criar Sessão
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex gap-4">
          <Input
            placeholder="Buscar sessões..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-md"
          />
          {selectedSessions.length >= 2 && (
            <Button onClick={navigateToComparison} variant="outline" className="gap-2">
              <GitCompare className="w-4 h-4" />
              Comparar Selecionadas ({selectedSessions.length})
            </Button>
          )}
        </div>

        {/* Sessions Grid */}
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Nenhuma sessão encontrada' : 'Nenhuma sessão criada ainda'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeira Sessão
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSessions.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <CardTitle className="text-lg">{session.nome}</CardTitle>
                    <Badge className={getStatusColor(session.session_status)}>
                      {getStatusLabel(session.session_status)}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(session.data).toLocaleDateString('pt-BR')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {session.descricao && (
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {session.descricao}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-muted-foreground">
                      {session.participant_count} participantes
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copySessionLink(session.id)}
                      className="gap-1"
                    >
                      <Link2 className="w-3 h-3" />
                      Link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/live/${session.id}`)}
                      className="gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Controlar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/admin/dashboard/${session.id}`)}
                      className="gap-1"
                    >
                      <BarChart3 className="w-3 h-3" />
                      Dashboard
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedSessions.includes(session.id) ? 'default' : 'outline'}
                      onClick={() => toggleComparison(session.id)}
                      className="gap-1"
                    >
                      <GitCompare className="w-3 h-3" />
                      {selectedSessions.includes(session.id) ? 'Selecionada' : 'Comparar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
