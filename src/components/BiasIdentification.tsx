import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BiasIndicator {
  userId: string;
  biasType: 'consciente' | 'inconsciente' | 'neutro';
  confidence: number;
  indicators: {
    rapidDecisions: number; // % de decisões muito rápidas (< 3s)
    slowDecisions: number; // % de decisões muito lentas (> 15s)
    consistencyScore: number; // Consistência nas respostas
    extremeDeferimentoRate: number; // Taxa extrema (< 20% ou > 80%)
    timeVariation: number; // Variação no tempo de resposta
  };
  explanation: string;
}

interface BiasIdentificationProps {
  sessionId: string;
}

export const BiasIdentification = ({ sessionId }: BiasIdentificationProps) => {
  const [indicators, setIndicators] = useState<BiasIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    consciente: 0,
    inconsciente: 0,
    neutro: 0,
  });

  useEffect(() => {
    if (!sessionId) return;
    identifyBias();

    const channel = supabase
      .channel(`bias-identification-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          setTimeout(() => identifyBias(), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const identifyBias = async () => {
    try {
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes')
        .select('user_id, tempo_gasto, resposta, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by user
      const userMap = new Map<string, any[]>();
      avaliacoes?.forEach(av => {
        if (!userMap.has(av.user_id)) {
          userMap.set(av.user_id, []);
        }
        userMap.get(av.user_id)!.push(av);
      });

      const biasData: BiasIndicator[] = [];
      userMap.forEach((userAvals, userId) => {
        if (userAvals.length < 5) return; // Need minimum responses

        // Calculate indicators
        const rapidCount = userAvals.filter(a => a.tempo_gasto < 3000).length;
        const slowCount = userAvals.filter(a => a.tempo_gasto > 15000).length;
        const rapidDecisions = (rapidCount / userAvals.length) * 100;
        const slowDecisions = (slowCount / userAvals.length) * 100;

        // Consistency
        const avgTime = userAvals.reduce((sum, a) => sum + a.tempo_gasto, 0) / userAvals.length;
        const variance = userAvals.reduce((sum, a) => sum + Math.pow(a.tempo_gasto - avgTime, 2), 0) / userAvals.length;
        const stdDev = Math.sqrt(variance);
        const consistencyScore = Math.max(0, 100 - (stdDev / avgTime) * 100);
        const timeVariation = (stdDev / avgTime) * 100;

        // Deferimento rate
        const deferidos = userAvals.filter(a => a.resposta === 'DEFERIDO').length;
        const deferimentoRate = (deferidos / userAvals.length) * 100;
        const extremeDeferimentoRate = deferimentoRate < 20 || deferimentoRate > 80 ? 
          Math.max(Math.abs(deferimentoRate - 50) - 30, 0) : 0;

        // Determine bias type
        let biasType: 'consciente' | 'inconsciente' | 'neutro' = 'neutro';
        let confidence = 0;
        let explanation = '';

        // Consciente: Decisões muito rápidas + consistente + taxa extrema
        if (rapidDecisions > 40 && consistencyScore > 70 && extremeDeferimentoRate > 0) {
          biasType = 'consciente';
          confidence = Math.min(90, rapidDecisions + consistencyScore - 100 + extremeDeferimentoRate);
          explanation = 'Padrão de decisões rápidas e consistentes com taxa extrema de deferimento, indicando possível viés pré-estabelecido.';
        }
        // Inconsciente: Alta variação + decisões extremas
        else if (timeVariation > 60 && (rapidDecisions > 30 || extremeDeferimentoRate > 20)) {
          biasType = 'inconsciente';
          confidence = Math.min(85, timeVariation + rapidDecisions + extremeDeferimentoRate - 50);
          explanation = 'Padrão inconsistente com decisões rápidas ocasionais, sugerindo viés inconsciente ou fadiga.';
        }
        // Neutro: Padrões balanceados
        else if (consistencyScore > 50 && rapidDecisions < 30 && extremeDeferimentoRate < 20) {
          biasType = 'neutro';
          confidence = Math.min(75, consistencyScore);
          explanation = 'Padrão equilibrado de análise com tempo adequado e taxa de deferimento moderada.';
        }

        biasData.push({
          userId,
          biasType,
          confidence: Math.max(0, confidence),
          indicators: {
            rapidDecisions,
            slowDecisions,
            consistencyScore,
            extremeDeferimentoRate,
            timeVariation,
          },
          explanation,
        });
      });

      // Sort by confidence
      biasData.sort((a, b) => b.confidence - a.confidence);

      // Calculate summary
      const newSummary = {
        consciente: biasData.filter(b => b.biasType === 'consciente').length,
        inconsciente: biasData.filter(b => b.biasType === 'inconsciente').length,
        neutro: biasData.filter(b => b.biasType === 'neutro').length,
      };

      setSummary(newSummary);
      setIndicators(biasData);
    } catch (error) {
      console.error('Erro ao identificar vieses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Identificação de Vieses
          </CardTitle>
          <CardDescription>Analisando comportamentos...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getBiasIcon = (type: string) => {
    if (type === 'consciente') return <Eye className="h-4 w-4" />;
    if (type === 'inconsciente') return <EyeOff className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  const getBiasVariant = (type: string) => {
    if (type === 'consciente') return 'destructive';
    if (type === 'inconsciente') return 'default';
    return 'outline';
  };

  const getBiasLabel = (type: string) => {
    if (type === 'consciente') return 'Viés Consciente';
    if (type === 'inconsciente') return 'Viés Inconsciente';
    return 'Comportamento Neutro';
  };

  const hasSignificantBias = summary.consciente > 0 || summary.inconsciente > 2;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Identificação de Vieses
          <Badge variant="outline" className="ml-auto">
            {indicators.length} participantes analisados
          </Badge>
        </CardTitle>
        <CardDescription>
          Análise de padrões comportamentais para identificação de vieses conscientes e inconscientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasSignificantBias && (
          <Alert variant="destructive" className="animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alerta de Viés Detectado</AlertTitle>
            <AlertDescription>
              Foram identificados padrões de comportamento que sugerem presença de vieses.
              {summary.consciente > 0 && ` ${summary.consciente} caso(s) de possível viés consciente.`}
              {summary.inconsciente > 0 && ` ${summary.inconsciente} caso(s) de possível viés inconsciente.`}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4">
          <Card className="border-destructive/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Consciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{summary.consciente}</div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Inconsciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{summary.inconsciente}</div>
            </CardContent>
          </Card>
          <Card className="border-green-500/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Neutro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{summary.neutro}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {indicators.slice(0, 8).map((indicator, idx) => (
            <div
              key={indicator.userId}
              className="p-4 border rounded-lg space-y-3 animate-slide-in hover:shadow-md transition-all"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      Usuário {indicator.userId.slice(0, 8)}...
                    </span>
                    <Badge variant={getBiasVariant(indicator.biasType)} className="flex items-center gap-1">
                      {getBiasIcon(indicator.biasType)}
                      {getBiasLabel(indicator.biasType)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{indicator.explanation}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">{indicator.confidence.toFixed(0)}%</div>
                  <div className="text-xs text-muted-foreground">confiança</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Decisões Rápidas</span>
                    <span className="font-medium">{indicator.indicators.rapidDecisions.toFixed(0)}%</span>
                  </div>
                  <Progress value={indicator.indicators.rapidDecisions} className="h-1" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Consistência</span>
                    <span className="font-medium">{indicator.indicators.consistencyScore.toFixed(0)}%</span>
                  </div>
                  <Progress value={indicator.indicators.consistencyScore} className="h-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
