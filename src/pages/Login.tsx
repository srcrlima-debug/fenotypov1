import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
});

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // Get redirect URL from query params or location state
  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const from = redirectParam || (location.state as any)?.from || '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

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
          // Redirecionar para registro mantendo o email preenchido
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
        <div className="bg-card rounded-lg shadow-soft p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Login</h1>
          <p className="text-muted-foreground text-center mb-8">
            Entre com seu email e senha
          </p>

          <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <Link 
                  to="/esqueci-senha" 
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                autoComplete="current-password"
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link 
              to={from !== '/' ? `/registro?redirect=${encodeURIComponent(from)}` : '/registro'} 
              className="text-primary hover:underline"
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
