import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface BiasAlert {
  id: string;
  severity: 'high' | 'medium' | 'low';
  category: string;
  message: string;
  group1: string;
  group2: string;
  difference: number;
  timestamp: Date;
}

interface BiasAlertSystemProps {
  sessionId: string;
  threshold?: number; // Diferença percentual para alertar (default: 15%)
}

export const BiasAlertSystem = ({ sessionId, threshold = 15 }: BiasAlertSystemProps) => {
  const [alerts, setAlerts] = useState<BiasAlert[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!sessionId || !isMonitoring) return;

    // Initial check
    checkForBias();

    // Real-time monitoring
    const channel = supabase
      .channel(`bias-monitoring-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'avaliacoes',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          // Debounce: check after 2 seconds of new data
          setTimeout(() => checkForBias(), 2000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, isMonitoring]);

  const checkForBias = async () => {
    try {
      // Fetch all evaluations with profiles
      const { data: avaliacoes, error } = await supabase
        .from('avaliacoes')
        .select(`
          resposta,
          profiles!inner(
            genero,
            pertencimento_racial,
            regiao,
            experiencia_bancas
          )
        `)
        .eq('session_id', sessionId);

      if (error) throw error;

      // Process data by categories
      const generoMap = new Map<string, { deferido: number; total: number }>();
      const racaMap = new Map<string, { deferido: number; total: number }>();
      const regiaoMap = new Map<string, { deferido: number; total: number }>();
      const experienciaMap = new Map<string, { deferido: number; total: number }>();

      avaliacoes?.forEach((av: any) => {
        const profile = av.profiles;
        if (!profile) return;

        const genero = profile.genero || 'Não informado';
        const raca = profile.pertencimento_racial || 'Não informado';
        const regiao = profile.regiao || 'Não informado';
        const experiencia = profile.experiencia_bancas || 'Não informado';

        [generoMap, racaMap, regiaoMap, experienciaMap].forEach((map, idx) => {
          const key = [genero, raca, regiao, experiencia][idx];
          if (!map.has(key)) {
            map.set(key, { deferido: 0, total: 0 });
          }
          const data = map.get(key)!;
          data.total++;
          if (av.resposta === 'DEFERIDO') data.deferido++;
        });
      });

      // Detect bias
      const newAlerts: BiasAlert[] = [];

      const checkCategory = (
        map: Map<string, { deferido: number; total: number }>,
        categoryName: string
      ) => {
        const entries = Array.from(map.entries());
        
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            const [key1, data1] = entries[i];
            const [key2, data2] = entries[j];

            // Minimum sample size
            if (data1.total < 5 || data2.total < 5) continue;

            const percent1 = (data1.deferido / data1.total) * 100;
            const percent2 = (data2.deferido / data2.total) * 100;
            const diff = Math.abs(percent1 - percent2);

            if (diff >= threshold) {
              const severity: 'high' | 'medium' | 'low' = 
                diff >= 30 ? 'high' : diff >= 20 ? 'medium' : 'low';

              newAlerts.push({
                id: `${categoryName}-${key1}-${key2}-${Date.now()}`,
                severity,
                category: categoryName,
                message: `Diferença de ${diff.toFixed(1)}% detectada entre "${key1}" (${percent1.toFixed(1)}%) e "${key2}" (${percent2.toFixed(1)}%)`,
                group1: key1,
                group2: key2,
                difference: diff,
                timestamp: new Date(),
              });
            }
          }
        }
      };

      checkCategory(generoMap, 'Identidade de Gênero');
      checkCategory(racaMap, 'Pertencimento Racial');
      checkCategory(regiaoMap, 'Região');
      checkCategory(experienciaMap, 'Experiência com Bancas');

      // Sort by severity and difference
      newAlerts.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        return b.difference - a.difference;
      });

      // Check for new high-severity alerts
      const newHighAlerts = newAlerts.filter(
        alert => alert.severity === 'high' && 
        !alerts.some(existing => 
          existing.category === alert.category && 
          existing.group1 === alert.group1 && 
          existing.group2 === alert.group2
        )
      );

      // Show toast for new high-severity alerts
      if (newHighAlerts.length > 0) {
        toast({
          title: '⚠️ Alerta de Viés Detectado',
          description: `${newHighAlerts.length} novo(s) alerta(s) de alta gravidade detectado(s)`,
          variant: 'destructive',
        });
      }

      setAlerts(newAlerts);

    } catch (error: any) {
      console.error('Erro ao verificar viés:', error);
    }
  };

  if (!isMonitoring || alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Sistema de Alertas em Tempo Real
          <Badge variant="outline" className="ml-2">
            {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
          </Badge>
        </h3>
      </div>

      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => {
          const Icon = alert.severity === 'high' ? AlertTriangle : alert.severity === 'medium' ? AlertCircle : Info;
          const variant = alert.severity === 'high' ? 'destructive' : 'default';

          return (
            <Alert key={alert.id} variant={variant} className="animate-slide-in">
              <Icon className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                <Badge variant={variant}>
                  {alert.severity === 'high' ? 'ALTA' : alert.severity === 'medium' ? 'MÉDIA' : 'BAIXA'}
                </Badge>
                {alert.category}
              </AlertTitle>
              <AlertDescription className="mt-2">
                {alert.message}
                <p className="text-xs text-muted-foreground mt-1">
                  Detectado há {Math.floor((Date.now() - alert.timestamp.getTime()) / 1000)}s
                </p>
              </AlertDescription>
            </Alert>
          );
        })}
      </div>

      {alerts.length > 5 && (
        <p className="text-sm text-muted-foreground text-center">
          + {alerts.length - 5} {alerts.length - 5 === 1 ? 'alerta adicional' : 'alertas adicionais'}
        </p>
      )}
    </div>
  );
};
