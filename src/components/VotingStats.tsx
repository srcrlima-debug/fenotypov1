import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface VotingStatsProps {
  votedCount: number;
  totalParticipants: number;
}

export const VotingStats = ({ votedCount, totalParticipants }: VotingStatsProps) => {
  const percentage = totalParticipants > 0 ? (votedCount / totalParticipants) * 100 : 0;

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-primary/10">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">Progresso de Votação</p>
          <p className="text-lg font-semibold">
            {votedCount} de {totalParticipants} votaram
          </p>
        </div>
      </div>
      <Progress value={percentage} className="h-2" />
      <p className="text-xs text-muted-foreground mt-2 text-right">
        {percentage.toFixed(0)}% concluído
      </p>
    </Card>
  );
};
