import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Lock, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BadgeCardProps {
  nome: string;
  descricao: string;
  icone: string;
  criterio: string;
  is_earned: boolean;
  earned_at?: string;
  index?: number;
}

export function BadgeCard({
  nome,
  descricao,
  icone,
  criterio,
  is_earned,
  earned_at,
  index = 0,
}: BadgeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          is_earned
            ? "border-primary/50 bg-gradient-to-br from-primary/5 to-primary/10 hover:shadow-xl hover:scale-105"
            : "opacity-60 hover:opacity-80 border-dashed"
        )}
      >
        <CardContent className="p-6">
          {/* Badge Icon */}
          <div className="flex items-start justify-between mb-4">
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all duration-300",
                is_earned
                  ? "bg-gradient-to-br from-primary to-primary/70 shadow-lg animate-float-gentle"
                  : "bg-muted"
              )}
            >
              {is_earned ? (
                <span>{icone}</span>
              ) : (
                <Lock className="w-8 h-8 text-muted-foreground" />
              )}
            </div>

            {is_earned && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Badge Info */}
          <div className="space-y-2">
            <h3
              className={cn(
                "font-bold text-lg",
                is_earned ? "text-foreground" : "text-muted-foreground"
              )}
            >
              {nome}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-2">
              {descricao}
            </p>

            <div className="flex items-center justify-between pt-2">
              <Badge variant={is_earned ? "default" : "secondary"} className="text-xs">
                {criterio}
              </Badge>

              {is_earned && earned_at && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(earned_at), "dd MMM yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>

          {/* Shine effect for earned badges */}
          {is_earned && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "200%" }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: "linear",
                repeatDelay: 5,
              }}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
