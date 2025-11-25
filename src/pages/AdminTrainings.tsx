/**
 * @deprecated Esta página está sendo substituída por AdminSessions (/admin/sessions)
 * Mantida apenas para compatibilidade com links antigos
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, Calendar, Copy, BarChart3, FileText, GitCompare, PlayCircle, UserPlus, Link2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';

export default function AdminTrainings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);

  const [newTraining, setNewTraining] = useState({
    nome: '',
    data: '',
    descricao: ''
  });

  useEffect(() => {
    loadTrainings();
  }, []);

  const loadTrainings = async () => {
    try {
      const { data, error } = await supabase
        .from('trainings')
        .select(`
          *,
          participants:training_participants(count)
        `)
        .order('data', { ascending: false });

      if (error) throw error;
      setTrainings(data || []);

      // Load sessions for each training
      if (data) {
        const sessionsMap: Record<string, any[]> = {};
        await Promise.all(
          data.map(async (training) => {
            const { data: sessionData } = await supabase
              .from('sessions')
              .select('*')
              .eq('training_id', training.id)
              .in('session_status', ['waiting', 'active'])
              .order('created_at', { ascending: false });
            
            sessionsMap[training.id] = sessionData || [];
          })
        );
        setSessions(sessionsMap);
      }
    } catch (error) {
      console.error('Error loading trainings:', error);
      toast.error('Erro ao carregar treinamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('trainings')
        .insert({
          nome: newTraining.nome,
          data: newTraining.data,
          descricao: newTraining.descricao || null,
          created_by: user?.id,
          status: 'active'
        });

      if (error) throw error;

      toast.success('Treinamento criado com sucesso!');
      setCreateDialogOpen(false);
      setNewTraining({ nome: '', data: '', descricao: '' });
      loadTrainings();
    } catch (error) {
      console.error('Error creating training:', error);
      toast.error('Erro ao criar treinamento');
    }
  };

  const copyRegistrationLink = (trainingId: string) => {
    const link = `${window.location.origin}/training/${trainingId}/register`;
    navigator.clipboard.writeText(link);
    toast.success('Link de Pré-cadastro copiado!');
  };

  const copySessionLink = (trainingId: string, sessionId: string, sessionName: string) => {
    const link = `${window.location.origin}/session/${sessionId}/acesso`;
    navigator.clipboard.writeText(link);
    toast.success(`Link da sessão "${sessionName}" copiado!`);
  };

  const toggleComparison = (trainingId: string) => {
    setSelectedForComparison(prev =>
      prev.includes(trainingId)
        ? prev.filter(id => id !== trainingId)
        : [...prev, trainingId]
    );
  };

  const navigateToComparison = () => {
    if (selectedForComparison.length < 2) {
      toast.error('Selecione pelo menos 2 treinamentos para comparar');
      return;
    }
    navigate(`/admin/training/compare?ids=${selectedForComparison.join(',')}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'archived': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando treinamentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Treinamentos</h1>
          <p className="text-muted-foreground">Gerencie treinamentos e participantes</p>
        </div>
        <div className="flex gap-2">
          {selectedForComparison.length >= 2 && (
            <Button onClick={navigateToComparison} variant="outline">
              <GitCompare className="w-4 h-4 mr-2" />
              Comparar ({selectedForComparison.length})
            </Button>
          )}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Treinamento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Treinamento</DialogTitle>
                <DialogDescription>
                  Preencha as informações do treinamento
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTraining} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Treinamento</Label>
                  <Input
                    id="nome"
                    value={newTraining.nome}
                    onChange={(e) => setNewTraining({ ...newTraining, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={newTraining.data}
                    onChange={(e) => setNewTraining({ ...newTraining, data: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="descricao">Descrição (opcional)</Label>
                  <Textarea
                    id="descricao"
                    value={newTraining.descricao}
                    onChange={(e) => setNewTraining({ ...newTraining, descricao: e.target.value })}
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full">Criar Treinamento</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      <div className="grid gap-6">
        {trainings.map((training) => (
          <Card key={training.id} className={selectedForComparison.includes(training.id) ? 'ring-2 ring-primary' : ''}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {training.nome}
                    <Badge className={getStatusColor(training.status)}>
                      {training.status === 'active' ? 'Ativo' : training.status === 'completed' ? 'Concluído' : 'Arquivado'}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(training.data).toLocaleDateString('pt-BR')}
                    <span className="ml-4 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {training.participants[0]?.count || 0} participantes
                    </span>
                  </CardDescription>
                  {training.descricao && (
                    <p className="text-sm text-muted-foreground mt-2">{training.descricao}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyRegistrationLink(training.id)}
                        className="border-primary/50 hover:bg-primary/10"
                      >
                        <UserPlus className="w-4 h-4 mr-2 text-primary" />
                        Link de Acesso
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Link único para cadastro e acesso ao treinamento</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/training/${training.id}/participants`)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Ver Participantes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/training/${training.id}/sessions`)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Sessions
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/training/${training.id}/dashboard`)}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
                <Button
                  variant={selectedForComparison.includes(training.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleComparison(training.id)}
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  {selectedForComparison.includes(training.id) ? 'Selecionado' : 'Comparar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {trainings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum treinamento cadastrado</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Treinamento
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
