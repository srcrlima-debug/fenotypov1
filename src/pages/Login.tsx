import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { CheckCircle2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldValidation, setFieldValidation] = useState({
    email: false,
    password: false,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const from = redirectParam || (location.state as any)?.from || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setFieldValidation(prev => ({ ...prev, email: emailRegex.test(email) }));
  };

  const validatePassword = (password: string) => {
    setFieldValidation(prev => ({ ...prev, password: password.length >= 6 }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = loginSchema.parse({ email, password });
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: 'Email não encontrado',
            description: 'Parece que você ainda não tem uma conta. Vamos criar uma agora!',
            variant: 'default',
          });
          setTimeout(() => {
            navigate(`/registro?email=${encodeURIComponent(validatedData.email)}${from !== '/' ? `&redirect=${encodeURIComponent(from)}` : ''}`);
          }, 1500);
        } else {
          toast({
            title: 'Erro ao fazer login',
            description: error.message,
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo de volta',
        });
        navigate(from, { replace: true });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">👤</span>
            </div>
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-muted-foreground mt-2">
              Entre com seu email e senha
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    validateEmail(e.target.value);
                  }}
                  autoComplete="email"
                  required
                  className="pr-10 bg-muted/30 border-border"
                />
                {fieldValidation.email && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                <Link 
                  to="/esqueci-senha" 
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validatePassword(e.target.value);
                  }}
                  autoComplete="current-password"
                  required
                  className="pr-10 bg-muted/30 border-border"
                />
                {fieldValidation.password && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[hsl(20,70%,65%)] hover:bg-[hsl(20,70%,55%)] text-white font-medium py-6 mt-6" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link 
              to={from !== '/' ? `/registro?redirect=${encodeURIComponent(from)}` : '/registro'} 
              className="text-primary hover:underline font-medium"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
