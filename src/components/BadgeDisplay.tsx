import { Award, FileText, Lightbulb, CheckCircle, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UserBadge {
  badge_id: string;
  badge_nome: string;
  badge_descricao: string;
  badge_icone: string;
  earned_at: string;
}

interface BadgeDisplayProps {
  badges: UserBadge[];
  variant?: 'compact' | 'detailed';
}

const iconMap: Record<string, any> = {
  Award,
  FileText,
  Lightbulb,
  CheckCircle,
  Star,
};

export function BadgeDisplay({ badges, variant = 'compact' }: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => {
            const Icon = iconMap[badge.badge_icone] || Award;
            return (
              <Tooltip key={badge.badge_id}>
                <TooltipTrigger>
                  <Badge variant="secondary" className="gap-1.5 cursor-help">
                    <Icon className="w-3 h-3" />
                    {badge.badge_nome}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{badge.badge_nome}</p>
                  <p className="text-xs text-muted-foreground">{badge.badge_descricao}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Conquistado em {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {badges.map((badge) => {
        const Icon = iconMap[badge.badge_icone] || Award;
        return (
          <div
            key={badge.badge_id}
            className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{badge.badge_nome}</p>
              <p className="text-xs text-muted-foreground">{badge.badge_descricao}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(badge.earned_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
