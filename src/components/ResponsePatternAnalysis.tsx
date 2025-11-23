import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PatternData {
  userId: string;
  avgResponseTime: number;
  consistencyScore: number;
  speedTrend: 'increasing' | 'decreasing' | 'stable';
  rapidResponses: number;
  totalResponses: number;
  deferimentoRate: number;
}

interface ResponsePatternAnalysisProps {
  sessionId: string;
}

export const ResponsePatternAnalysis = ({ sessionId }: ResponsePatternAnalysisProps) => {
  const [patterns, setPatterns] = useState<PatternData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalAvgTime, setGlobalAvgTime] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    analyzePatterns();

    const channel = supabase
      .channel(`patterns-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          setTimeout(() => analyzePatterns(), 1500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const analyzePatterns = async () => {
    try {
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes')
        .select('user_id, tempo_gasto, resposta, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Calculate global average
      const globalAvg = avaliacoes?.reduce((sum, a) => sum + a.tempo_gasto, 0) / (avaliacoes?.length || 1) || 0;
      setGlobalAvgTime(globalAvg);

      // Group by user
      const userMap = new Map<string, any[]>();
      avaliacoes?.forEach(av => {
        if (!userMap.has(av.user_id)) {
          userMap.set(av.user_id, []);
        }
        userMap.get(av.user_id)!.push(av);
      });

      // Analyze each user's patterns
      const patternsData: PatternData[] = [];
      userMap.forEach((userAvals, userId) => {
        if (userAvals.length < 3) return; // Skip users with too few responses

        const avgTime = userAvals.reduce((sum, a) => sum + a.tempo_gasto, 0) / userAvals.length;
        const rapidResponses = userAvals.filter(a => a.tempo_gasto < 3000).length; // < 3 seconds
        
        // Calculate consistency (standard deviation of response times)
        const mean = avgTime;
        const variance = userAvals.reduce((sum, a) => sum + Math.pow(a.tempo_gasto - mean, 2), 0) / userAvals.length;
        const stdDev = Math.sqrt(variance);
        const consistencyScore = Math.max(0, 100 - (stdDev / mean) * 100);

        // Detect speed trend (comparing first half vs second half)
        const midpoint = Math.floor(userAvals.length / 2);
        const firstHalfAvg = userAvals.slice(0, midpoint).reduce((sum, a) => sum + a.tempo_gasto, 0) / midpoint;
        const secondHalfAvg = userAvals.slice(midpoint).reduce((sum, a) => sum + a.tempo_gasto, 0) / (userAvals.length - midpoint);
        
        let speedTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (secondHalfAvg < firstHalfAvg * 0.8) speedTrend = 'increasing';
        else if (secondHalfAvg > firstHalfAvg * 1.2) speedTrend = 'decreasing';

        // Calculate deferimento rate
        const deferidos = userAvals.filter(a => a.resposta === 'DEFERIDO').length;
        const deferimentoRate = (deferidos / userAvals.length) * 100;

        patternsData.push({
          userId,
          avgResponseTime: avgTime,
          consistencyScore,
          speedTrend,
          rapidResponses,
          totalResponses: userAvals.length,
          deferimentoRate,
        });
      });

      // Sort by potential bias indicators
      patternsData.sort((a, b) => {
        const scoreA = (a.rapidResponses / a.totalResponses) * 100 + (100 - a.consistencyScore);
        const scoreB = (b.rapidResponses / b.totalResponses) * 100 + (100 - b.consistencyScore);
        return scoreB - scoreA;
      });

      setPatterns(patternsData.slice(0, 10)); // Top 10 patterns
    } catch (error) {
      console.error('Erro ao analisar padrões:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise de Padrões de Resposta
          </CardTitle>
          <CardDescription>Carregando análise...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (patterns.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Análise de Padrões de Resposta
          </CardTitle>
          <CardDescription>Dados insuficientes para análise de padrões</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Análise de Padrões de Resposta
          <Badge variant="outline" className="ml-auto">
            {patterns.length} padrões detectados
          </Badge>
        </CardTitle>
        <CardDescription>
          Tempo médio global: {(globalAvgTime / 1000).toFixed(1)}s
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patterns.map((pattern, idx) => {
            const rapidResponseRate = (pattern.rapidResponses / pattern.totalResponses) * 100;
            const isAnomalous = rapidResponseRate > 30 || pattern.consistencyScore < 50;

            return (
              <div 
                key={pattern.userId}
                className="p-4 border rounded-lg space-y-3 hover:shadow-md transition-all animate-slide-in"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        Usuário {pattern.userId.slice(0, 8)}...
                      </span>
                      {isAnomalous && (
                        <Badge variant="destructive">Padrão Atípico</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(pattern.avgResponseTime / 1000).toFixed(1)}s média
                      </span>
                      <span className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {pattern.rapidResponses} respostas rápidas
                      </span>
                      {pattern.speedTrend === 'increasing' && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Acelerando
                        </Badge>
                      )}
                      {pattern.speedTrend === 'decreasing' && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Desacelerando
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {pattern.deferimentoRate.toFixed(0)}%
                    </div>
                    <div className="text-xs text-muted-foreground">deferimento</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Consistência</span>
                    <span className="font-medium">{pattern.consistencyScore.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={pattern.consistencyScore} 
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Taxa de Respostas Rápidas</span>
                    <span className="font-medium">{rapidResponseRate.toFixed(0)}%</span>
                  </div>
                  <Progress 
                    value={rapidResponseRate} 
                    className="h-2"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
