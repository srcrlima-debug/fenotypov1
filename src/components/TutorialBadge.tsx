import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TutorialBadgeProps {
  onClick?: () => void;
}

export function TutorialBadge({ onClick }: TutorialBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={onClick}
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-2xl bg-gradient-to-br from-primary to-primary/70 border-2 border-primary hover:scale-110 transition-all duration-300 animate-float-gentle"
          >
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="animate-fade-slide-in">
          <p>Reiniciar tutorial</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
