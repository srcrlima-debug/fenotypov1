import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, User, Check, Download, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts';
import Papa from 'papaparse';
import jsPDF from 'jspdf';

interface DiscrepancyData {
  userId: string;
  userEmail: string;
  foto1Vote: string;
  foto14Vote: string;
  foto1Time: number;
  foto14Time: number;
}

interface VoteDistribution {
  vote: string;
  foto1: number;
  foto14: number;
}

interface TimeCorrelation {
  avgTime: number;
  isConsistent: boolean;
}

interface SamePersonDiscrepancyProps {
  sessionId: string;
}

export const SamePersonDiscrepancy = ({ sessionId }: SamePersonDiscrepancyProps) => {
  const [discrepancies, setDiscrepancies] = useState<DiscrepancyData[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voteDistribution, setVoteDistribution] = useState<VoteDistribution[]>([]);
  const [timeCorrelation, setTimeCorrelation] = useState<{ consistent: TimeCorrelation; inconsistent: TimeCorrelation } | null>(null);
  const [allUserVotes, setAllUserVotes] = useState<any[]>([]);

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

      // Calculate vote distribution
      const foto1Votes = { DEFERIDO: 0, INDEFERIDO: 0, NÃO_RESPONDIDO: 0 };
      const foto14Votes = { DEFERIDO: 0, INDEFERIDO: 0, NÃO_RESPONDIDO: 0 };

      userVotes.forEach((data) => {
        if (data.foto1) foto1Votes[data.foto1.vote as keyof typeof foto1Votes]++;
        if (data.foto14) foto14Votes[data.foto14.vote as keyof typeof foto14Votes]++;
      });

      const distribution: VoteDistribution[] = [
        { vote: 'Deferido', foto1: foto1Votes.DEFERIDO, foto14: foto14Votes.DEFERIDO },
        { vote: 'Indeferido', foto1: foto1Votes.INDEFERIDO, foto14: foto14Votes.INDEFERIDO },
        { vote: 'Não Respondido', foto1: foto1Votes.NÃO_RESPONDIDO, foto14: foto14Votes.NÃO_RESPONDIDO },
      ];
      setVoteDistribution(distribution);

      // Calculate time correlation
      let consistentTotalTime = 0;
      let consistentCount = 0;
      let inconsistentTotalTime = 0;
      let inconsistentCount = 0;

      userVotes.forEach((data) => {
        if (data.foto1 && data.foto14) {
          const avgTime = (data.foto1.time + data.foto14.time) / 2;
          if (data.foto1.vote === data.foto14.vote) {
            consistentTotalTime += avgTime;
            consistentCount++;
          } else {
            inconsistentTotalTime += avgTime;
            inconsistentCount++;
          }
        }
      });

      setTimeCorrelation({
        consistent: {
          avgTime: consistentCount > 0 ? consistentTotalTime / consistentCount : 0,
          isConsistent: true,
        },
        inconsistent: {
          avgTime: inconsistentCount > 0 ? inconsistentTotalTime / inconsistentCount : 0,
          isConsistent: false,
        },
      });

      // Store all user votes for export
      const exportData = Array.from(userVotes.entries()).map(([userId, data]) => ({
        userId,
        email: data.email,
        foto1Vote: data.foto1?.vote || 'N/A',
        foto1Time: data.foto1?.time || 0,
        foto14Vote: data.foto14?.vote || 'N/A',
        foto14Time: data.foto14?.time || 0,
        isConsistent: data.foto1?.vote === data.foto14?.vote,
      }));
      setAllUserVotes(exportData);
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

  const exportToCSV = () => {
    const csv = Papa.unparse(allUserVotes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `discrepancias_fotos_1_14_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text('Análise de Consistência - Fotos 1 e 14', 14, 20);
    
    // Summary
    doc.setFontSize(12);
    doc.text(`Total de Participantes: ${totalUsers}`, 14, 35);
    doc.text(`Taxa de Consistência: ${consistencyRate.toFixed(1)}%`, 14, 42);
    doc.text(`Discrepâncias: ${discrepancies.length} (${discrepancyRate.toFixed(1)}%)`, 14, 49);
    
    // Time correlation
    if (timeCorrelation) {
      doc.text('Correlação Tempo vs Consistência:', 14, 63);
      doc.setFontSize(10);
      doc.text(`Consistentes: ${timeCorrelation.consistent.avgTime.toFixed(1)}s (média)`, 20, 70);
      doc.text(`Inconsistentes: ${timeCorrelation.inconsistent.avgTime.toFixed(1)}s (média)`, 20, 77);
    }
    
    // Discrepancies list
    doc.setFontSize(12);
    doc.text('Lista de Discrepâncias:', 14, 91);
    doc.setFontSize(8);
    
    let yPos = 98;
    discrepancies.slice(0, 20).forEach((disc, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(`${index + 1}. ${disc.userEmail}`, 14, yPos);
      doc.text(`Foto 1: ${getVoteLabel(disc.foto1Vote)} (${disc.foto1Time}s)`, 20, yPos + 5);
      doc.text(`Foto 14: ${getVoteLabel(disc.foto14Vote)} (${disc.foto14Time}s)`, 20, yPos + 10);
      yPos += 18;
    });
    
    if (discrepancies.length > 20) {
      doc.text(`... e mais ${discrepancies.length - 20} discrepâncias`, 14, yPos);
    }
    
    doc.save(`discrepancias_fotos_1_14_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${discrepancies.length > 0 ? 'text-warning' : 'text-success'}`} />
              Análise de Consistência (Fotos 1 e 14)
            </CardTitle>
            <CardDescription>
              As fotos 1 e 14 são da mesma pessoa - análise de consistência nas votações
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={allUserVotes.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToPDF} disabled={allUserVotes.length === 0}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
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

        {/* Vote Distribution Comparison */}
        {voteDistribution.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Distribuição Comparativa de Votos</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={voteDistribution}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="vote" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="foto1" name="Foto 1" fill="hsl(var(--primary))" />
                <Bar dataKey="foto14" name="Foto 14" fill="hsl(var(--accent))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time Correlation Analysis */}
        {timeCorrelation && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Correlação Tempo vs Consistência</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">Votos Consistentes</span>
                </div>
                <p className="text-2xl font-bold">{timeCorrelation.consistent.avgTime.toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo médio de resposta</p>
              </div>
              
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span className="text-sm font-medium text-warning">Votos Inconsistentes</span>
                </div>
                <p className="text-2xl font-bold">{timeCorrelation.inconsistent.avgTime.toFixed(1)}s</p>
                <p className="text-xs text-muted-foreground mt-1">Tempo médio de resposta</p>
              </div>
            </div>
            
            {timeCorrelation.consistent.avgTime > 0 && timeCorrelation.inconsistent.avgTime > 0 && (
              <Alert className={
                timeCorrelation.inconsistent.avgTime < timeCorrelation.consistent.avgTime 
                  ? "border-warning/50 bg-warning/10" 
                  : "border-primary/50 bg-primary/10"
              }>
                {timeCorrelation.inconsistent.avgTime < timeCorrelation.consistent.avgTime ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-warning" />
                    <AlertTitle className="text-warning">Respostas Rápidas Associadas a Inconsistências</AlertTitle>
                    <AlertDescription>
                      Participantes com votos inconsistentes gastaram em média{' '}
                      <strong>{Math.abs(timeCorrelation.consistent.avgTime - timeCorrelation.inconsistent.avgTime).toFixed(1)}s</strong>{' '}
                      a menos por foto. Isso pode indicar falta de atenção ou viés inconsciente.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <AlertTitle>Padrão Normal de Tempo</AlertTitle>
                    <AlertDescription>
                      Não há correlação clara entre tempo de resposta e inconsistência nas votações.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </div>
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
