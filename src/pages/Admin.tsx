import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Copy, Plus, Calendar, Users, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';

interface Session {
  id: string;
  nome: string;
  data: string;
  created_at: string;
}

const Admin = () => {
  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

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
    
    if (!nome || !data) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data: newSession, error } = await supabase
      .from('sessions')
      .insert({
        nome,
        data,
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
      const link = `${window.location.origin}/treino/${newSession.id}`;
      navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado!',
        description: 'Link compartilhável copiado para a área de transferência',
      });
    }
  };

  const copyLink = (sessionId: string) => {
    const link = `${window.location.origin}/treino/${sessionId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Link copiado!',
      description: 'Link compartilhável copiado para a área de transferência',
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Painel Administrativo</h1>
            <p className="text-muted-foreground mt-2">Gerencie sessões de avaliação</p>
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
            <Calendar className="h-6 w-6" />
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
                            <Calendar className="h-4 w-4" />
                            {format(new Date(session.data), 'dd/MM/yyyy')}
                          </span>
                          <span className="flex items-center gap-1">
                            <LinkIcon className="h-4 w-4" />
                            Criada em {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(session.id)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
