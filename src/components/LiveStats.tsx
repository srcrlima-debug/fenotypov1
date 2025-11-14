import { Card } from "@/components/ui/card";
import { CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AssessmentData {
  page: number;
  decision: string;
  timeSpent: number;
}

interface LiveStatsProps {
  assessments: AssessmentData[];
  currentPage: number;
  totalPages: number;
}

export const LiveStats = ({ assessments, currentPage, totalPages }: LiveStatsProps) => {
  const completed = assessments.length;
  const deferidos = assessments.filter(a => a.decision === "DEFERIDO").length;
  const indeferidos = assessments.filter(a => a.decision === "INDEFERIDO").length;
  const naoRespondidos = assessments.filter(a => a.decision === "NÃO_RESPONDIDO").length;
  
  const averageTime = completed > 0
    ? Math.floor(assessments.reduce((acc, a) => acc + a.timeSpent, 0) / completed / 1000)
    : 0;

  const progress = (completed / totalPages) * 100;

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Estatísticas em Tempo Real
          </h3>
          <span className="text-xs text-muted-foreground">
            {completed}/{totalPages} completas
          </span>
        </div>

        <Progress value={progress} className="h-2" />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs text-muted-foreground">Deferidos</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              {deferidos}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {completed > 0 ? Math.round((deferidos / completed) * 100) : 0}%
            </div>
          </div>

          <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs text-muted-foreground">Indeferidos</span>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {indeferidos}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {completed > 0 ? Math.round((indeferidos / completed) * 100) : 0}%
            </div>
          </div>

          <div className="bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-muted-foreground">Não Resp.</span>
            </div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {naoRespondidos}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {completed > 0 ? Math.round((naoRespondidos / completed) * 100) : 0}%
            </div>
          </div>

          <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Tempo Médio</span>
            </div>
            <div className="text-2xl font-bold text-primary">
              {averageTime}s
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              por foto
            </div>
          </div>
        </div>

        {/* Recent assessments */}
        {assessments.length > 0 && (
          <div className="border-t border-border/50 pt-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Últimas 5 Avaliações
            </h4>
            <div className="space-y-1">
              {assessments.slice(-5).reverse().map((assessment) => (
                <div
                  key={assessment.page}
                  className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5"
                >
                  <span className="font-medium">Foto {assessment.page}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded ${
                      assessment.decision === "DEFERIDO"
                        ? "bg-green-500/20 text-green-700 dark:text-green-300"
                        : assessment.decision === "INDEFERIDO"
                        ? "bg-red-500/20 text-red-700 dark:text-red-300"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    }`}>
                      {assessment.decision}
                    </span>
                    <span className="text-muted-foreground">
                      {Math.floor(assessment.timeSpent / 1000)}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
