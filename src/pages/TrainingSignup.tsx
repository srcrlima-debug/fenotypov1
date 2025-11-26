import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionNavigation } from '@/hooks/useSessionNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const signupSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function TrainingSignup() {
  const { trainingId: trainingIdParam } = useParams<{ trainingId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const {
    sessionId,
    trainingId: trainingIdFromHook,
    isValidSessionId,
    navigateWithSession,
    logAccess
  } = useSessionNavigation({
    autoRedirectIfAuthenticated: false,
    antessalaPath: '/antessala'
  });
  
  const trainingIdFromQuery = searchParams.get('trainingId');
  const finalTrainingId = trainingIdFromHook || trainingIdFromQuery || trainingIdParam;
  
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [fieldValidation, setFieldValidation] = useState({
    email: false,
    password: false,
    confirmPassword: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (sessionId && !isValidSessionId) {
      toast.error('Link de acesso inválido. Solicite um novo link ao administrador.');
      logAccess('invalid_sessionid_on_signup', { 
        error: 'Invalid UUID format',
        trainingId: finalTrainingId 
      });
    }
  }, [sessionId, isValidSessionId, logAccess, finalTrainingId]);

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (!authLoading && user) {
      navigateWithSession(`/training/register`, {
        additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
      });
    }
  }, [user, authLoading, finalTrainingId, navigateWithSession]);

  useEffect(() => {
    if (finalTrainingId) {
      loadTraining();
    }
  }, [finalTrainingId]);

  const loadTraining = async () => {
    if (!finalTrainingId) return;

    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', finalTrainingId)
        .single();

      if (error) throw error;

      if (data.status !== 'active') {
        toast.error('Este treinamento não está mais aceitando inscrições');
        return;
      }

      setTraining(data);
    } catch (error) {
      console.error('Error loading training:', error);
      toast.error('Treinamento não encontrado');
    }
  };

  const validateEmail = (email: string) => {
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldValidation(prev => ({ ...prev, email: isValid }));
    if (!isValid && email.length > 0) {
      setErrors(prev => ({ ...prev, email: 'Email inválido' }));
    } else {
      setErrors(prev => ({ ...prev, email: '' }));
    }
    return isValid;
  };

  const validatePassword = (password: string) => {
    const isValid = password.length >= 6;
    setFieldValidation(prev => ({ ...prev, password: isValid }));
    if (!isValid && password.length > 0) {
      setErrors(prev => ({ ...prev, password: 'A senha deve ter pelo menos 6 caracteres' }));
    } else {
      setErrors(prev => ({ ...prev, password: '' }));
    }
    return isValid;
  };

  const validateConfirmPassword = (confirmPassword: string, password: string) => {
    const isValid = confirmPassword === password && confirmPassword.length >= 6;
    setFieldValidation(prev => ({ ...prev, confirmPassword: isValid }));
    if (!isValid && confirmPassword.length > 0) {
      setErrors(prev => ({ ...prev, confirmPassword: 'As senhas não coincidem' }));
    } else {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    try {
      const validationResult = signupSchema.safeParse(formData);

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      setLoading(true);

      const sanitizedEmail = formData.email.trim().toLowerCase();
      const sanitizedPassword = formData.password.trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: sanitizedPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/training/register?trainingId=${finalTrainingId}`
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está cadastrado. Faça login.');
          await navigateWithSession(`/training/login`, {
            additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
          });
          return;
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Erro ao criar conta');
      }

      toast.success('Conta criada com sucesso!');
      
      // Redirecionar para completar cadastro
      await navigateWithSession(`/training/register`, {
        additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
      });
    } catch (error: any) {
      console.error('Error during signup:', error);
      toast.error(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Criar Conta - {training?.nome}</CardTitle>
          <CardDescription>
            {training?.data && `Data: ${new Date(training.data).toLocaleDateString('pt-BR')}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                Email
                {fieldValidation.email && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {errors.email && <AlertCircle className="h-4 w-4 text-destructive" />}
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, email: value }));
                    validateEmail(value);
                  }}
                  required
                  autoComplete="email"
                  placeholder="seu@email.com"
                  className={cn(
                    "bg-muted/30 border-border",
                    fieldValidation.email && "border-green-500",
                    errors.email && "border-destructive"
                  )}
                />
                {fieldValidation.email && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                Senha
                {fieldValidation.password && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {errors.password && <AlertCircle className="h-4 w-4 text-destructive" />}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, password: value }));
                    validatePassword(value);
                    if (formData.confirmPassword) {
                      validateConfirmPassword(formData.confirmPassword, value);
                    }
                  }}
                  required
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className={cn(
                    "bg-muted/30 border-border pr-10",
                    fieldValidation.password && "border-green-500",
                    errors.password && "border-destructive"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="flex items-center gap-2">
                Confirmar Senha
                {fieldValidation.confirmPassword && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {errors.confirmPassword && <AlertCircle className="h-4 w-4 text-destructive" />}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, confirmPassword: value }));
                    validateConfirmPassword(value, formData.password);
                  }}
                  required
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  className={cn(
                    "bg-muted/30 border-border pr-10",
                    fieldValidation.confirmPassword && "border-green-500",
                    errors.confirmPassword && "border-destructive"
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">{errors.confirmPassword}</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[hsl(20,70%,65%)] hover:bg-[hsl(20,70%,55%)] text-white relative" 
              disabled={loading || !fieldValidation.email || !fieldValidation.password || !fieldValidation.confirmPassword}
            >
              {loading && (
                <div className="absolute left-4">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
            
            {loading && (
              <p className="text-xs text-center text-muted-foreground">
                Por favor, aguarde enquanto criamos sua conta
              </p>
            )}

            <div className="text-center text-sm">
              <p className="text-muted-foreground">
                Já possui conta?{' '}
                <button
                  type="button"
                  onClick={() => navigateWithSession(`/training/login`, {
                    additionalParams: finalTrainingId ? { trainingId: finalTrainingId } : {}
                  })}
                  className="text-primary hover:underline font-medium"
                >
                  Faça login
                </button>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
