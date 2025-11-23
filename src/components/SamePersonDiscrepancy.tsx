import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, User, Check } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface DiscrepancyData {
  userId: string;
  userEmail: string;
  foto1Vote: string;
  foto14Vote: string;
  foto1Time: number;
  foto14Time: number;
}

interface SamePersonDiscrepancyProps {
  sessionId: string;
}

export const SamePersonDiscrepancy = ({ sessionId }: SamePersonDiscrepancyProps) => {
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      fetchDiscrepancies();
    }
  }, [sessionId]);

  // Real-time updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel('discrepancy-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchDiscrepancies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const fetchDiscrepancies = async () => {
    setLoading(true);
    try {
      // Fetch evaluations for photos 1 and 14
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes')
        .select(`
          user_id,
          foto_id,
          resposta,
          tempo_gasto,
          profiles!inner(email)
        `)
        .eq('session_id', sessionId)
        .in('foto_id', [1, 14]);

      if (error) throw error;

      // Group by user
      const userVotes = new Map<string, {
        email: string;
        foto1?: { vote: string; time: number };
        foto14?: { vote: string; time: number };
      }>();

      avaliacoes?.forEach((av: any) => {
        if (!userVotes.has(av.user_id)) {
          userVotes.set(av.user_id, {
            email: av.profiles?.email || 'Email não disponível'
          });
        }

        const userData = userVotes.get(av.user_id)!;
        if (av.foto_id === 1) {
          userData.foto1 = { vote: av.resposta, time: av.tempo_gasto };
        } else if (av.foto_id === 14) {
          userData.foto14 = { vote: av.resposta, time: av.tempo_gasto };
        }
      });

      // Find discrepancies
      const discrepancyList: DiscrepancyData[] = [];
      let totalUsersWithBothVotes = 0;

      userVotes.forEach((data, userId) => {
        if (data.foto1 && data.foto14) {
          totalUsersWithBothVotes++;
          
          // Check if votes are different
          if (data.foto1.vote !== data.foto14.vote) {
            discrepancyList.push({
              userId,
              userEmail: data.email,
              foto1Vote: data.foto1.vote,
              foto14Vote: data.foto14.vote,
              foto1Time: data.foto1.time,
              foto14Time: data.foto14.time,
            });
          }
        }
      });

      setDiscrepancies(discrepancyList);
      setTotalUsers(totalUsersWithBothVotes);
    } catch (error) {
      console.error('Error fetching discrepancies:', error);
    } finally {
      setLoading(false);
    }
  };

  const getVoteBadgeVariant = (vote: string) => {
    switch (vote) {
      case 'DEFERIDO':
        return 'default';
      case 'INDEFERIDO':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getVoteLabel = (vote: string) => {
    switch (vote) {
      case 'DEFERIDO':
        return 'Deferido';
      case 'INDEFERIDO':
        return 'Indeferido';
      case 'NÃO_RESPONDIDO':
        return 'Não Respondido';
      default:
        return vote;
    }
  };

  const discrepancyRate = totalUsers > 0 ? (discrepancies.length / totalUsers) * 100 : 0;
  const consistencyRate = 100 - discrepancyRate;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Análise de Consistência (Fotos 1 e 14)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando análise...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className={`w-5 h-5 ${discrepancies.length > 0 ? 'text-warning' : 'text-success'}`} />
          Análise de Consistência (Fotos 1 e 14)
        </CardTitle>
        <CardDescription>
          As fotos 1 e 14 são da mesma pessoa - análise de consistência nas votações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Participantes Analisados</span>
            </div>
            <p className="text-2xl font-bold">{totalUsers}</p>
            <p className="text-xs text-muted-foreground">Com votos em ambas as fotos</p>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-4 h-4 text-success" />
              <span className="text-sm font-medium">Taxa de Consistência</span>
            </div>
            <p className="text-2xl font-bold text-success">{consistencyRate.toFixed(1)}%</p>
            <Progress value={consistencyRate} className="h-2 mt-2" />
          </div>

          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="text-sm font-medium">Discrepâncias</span>
            </div>
            <p className="text-2xl font-bold text-warning">{discrepancies.length}</p>
            <p className="text-xs text-muted-foreground">{discrepancyRate.toFixed(1)}% dos participantes</p>
          </div>
        </div>

        {/* Alert based on discrepancy level */}
        {discrepancies.length > 0 ? (
          <Alert variant={discrepancyRate > 30 ? "destructive" : "default"} className="animate-scale-in">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>
              {discrepancyRate > 30 ? 'Alto Nível de Inconsistência Detectado' : 'Inconsistências Detectadas'}
            </AlertTitle>
            <AlertDescription>
              {discrepancyRate > 30 
                ? `${discrepancies.length} participantes (${discrepancyRate.toFixed(1)}%) votaram diferente nas fotos 1 e 14, que são da mesma pessoa. Isso sugere possível viés inconsciente ou falta de atenção.`
                : `${discrepancies.length} participantes votaram diferente nas fotos 1 e 14, que são da mesma pessoa.`
              }
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-success/50 bg-success/10 animate-scale-in">
            <Check className="h-4 w-4 text-success" />
            <AlertTitle className="text-success">Excelente Consistência</AlertTitle>
            <AlertDescription>
              Todos os participantes que votaram em ambas as fotos mantiveram consistência em suas avaliações.
            </AlertDescription>
          </Alert>
        )}

        {/* Discrepancy List */}
        {discrepancies.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Detalhamento das Discrepâncias:</h4>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {discrepancies.map((disc, index) => (
                <div 
                  key={disc.userId} 
                  className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <User className="w-3 h-3" />
                        {disc.userEmail}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground mb-1">Foto 1:</p>
                          <div className="space-y-1">
                            <Badge variant={getVoteBadgeVariant(disc.foto1Vote)}>
                              {getVoteLabel(disc.foto1Vote)}
                            </Badge>
                            <p className="text-muted-foreground">Tempo: {disc.foto1Time}s</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-muted-foreground mb-1">Foto 14:</p>
                          <div className="space-y-1">
                            <Badge variant={getVoteBadgeVariant(disc.foto14Vote)}>
                              {getVoteLabel(disc.foto14Vote)}
                            </Badge>
                            <p className="text-muted-foreground">Tempo: {disc.foto14Time}s</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
