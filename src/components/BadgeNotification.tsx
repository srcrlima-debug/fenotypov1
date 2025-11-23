import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Award, FileText, Lightbulb, CheckCircle, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Badge {
  badge_id: string;
  badge_nome: string;
  badge_descricao: string;
  badge_icone: string;
  is_new: boolean;
}

interface BadgeNotificationProps {
  badges: Badge[];
  onDismiss: () => void;
}

const iconMap: Record<string, any> = {
  Award,
  FileText,
  Lightbulb,
  CheckCircle,
  Star,
};

export function BadgeNotification({ badges, onDismiss }: BadgeNotificationProps) {
  const newBadges = badges.filter(b => b.is_new);

  useEffect(() => {
    if (newBadges.length > 0) {
      const timer = setTimeout(() => {
        onDismiss();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [newBadges.length, onDismiss]);

  return (
    <AnimatePresence>
      {newBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 right-6 z-50 max-w-md"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20 shadow-lg">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <Award className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-2">
                    🎉 {newBadges.length > 1 ? 'Novos Badges Conquistados!' : 'Novo Badge Conquistado!'}
                  </h3>
                  <div className="space-y-2">
                    {newBadges.map((badge) => {
                      const Icon = iconMap[badge.badge_icone] || Award;
                      return (
                        <div key={badge.badge_id} className="flex items-center gap-2">
                          <Icon className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-semibold text-sm">{badge.badge_nome}</p>
                            <p className="text-xs text-muted-foreground">{badge.badge_descricao}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
