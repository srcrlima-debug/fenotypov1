import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, UserPlus, LogIn, Home } from 'lucide-react';

interface TrainingAccessDeniedProps {
  title?: string;
  description?: string;
  trainingId?: string;
  showRegisterButton?: boolean;
  showLoginButton?: boolean;
}

export default function TrainingAccessDenied({
  title = "Acesso Negado",
  description = "Você não tem permissão para acessar esta sessão.",
  trainingId,
  showRegisterButton = false,
  showLoginButton = false
}: TrainingAccessDeniedProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-destructive/5">
      <Card className="w-full max-w-md border-destructive/50">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl text-destructive">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {showRegisterButton && trainingId && (
            <Button
              className="w-full"
              onClick={() => navigate(`/training/${trainingId}/register`)}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Cadastrar-se no Treinamento
            </Button>
          )}
          
          {showLoginButton && trainingId && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(`/training/${trainingId}/login`)}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Fazer Login
            </Button>
          )}
          
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Voltar para Início
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
