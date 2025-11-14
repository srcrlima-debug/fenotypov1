import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const registroSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string(),
  genero: z.string().min(1, { message: 'Selecione um gênero' }),
  faixaEtaria: z.string().min(1, { message: 'Selecione uma faixa etária' }),
  estado: z.string().min(1, { message: 'Selecione um estado' }),
  pertencimentoRacial: z.string().min(1, { message: 'Selecione o pertencimento racial' }),
  regiao: z.string().min(1, { message: 'Selecione a região' }),
  experienciaBancas: z.string().min(1, { message: 'Selecione sua experiência' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const Registro = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    genero: '',
    faixaEtaria: '',
    estado: '',
    pertencimentoRacial: '',
    regiao: '',
    experienciaBancas: '',
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = registroSchema.parse(formData);
      setLoading(true);

      const redirectUrl = `${window.location.origin}/`;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
          toast({
            title: 'Erro ao criar conta',
            description: 'Este email já está cadastrado. Faça login.',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Erro ao criar conta',
            description: signUpError.message,
            variant: 'destructive',
          });
        }
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            email: validatedData.email,
            genero: validatedData.genero,
            faixa_etaria: validatedData.faixaEtaria,
            estado: validatedData.estado,
            pertencimento_racial: validatedData.pertencimentoRacial,
            regiao: validatedData.regiao,
            experiencia_bancas: validatedData.experienciaBancas,
          });

        if (profileError) {
          toast({
            title: 'Erro ao salvar perfil',
            description: profileError.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Conta criada!',
          description: 'Você já pode começar o treinamento',
        });
        navigate('/', { replace: true });
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

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/complete-profile`,
        },
      });

      if (error) {
        toast({
          title: 'Erro ao criar conta',
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao criar conta',
        description: 'Não foi possível conectar com o Google',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-soft p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Criar Conta</h1>
          <p className="text-muted-foreground text-center mb-8">
            Preencha os dados para começar
          </p>

          <Button 
            onClick={handleGoogleSignup}
            variant="outline" 
            className="w-full mb-6" 
            disabled={loading}
            type="button"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continuar com Google
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Ou</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onInput={(e) => setFormData({ ...formData, email: (e.target as HTMLInputElement).value })}
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                onInput={(e) => setFormData({ ...formData, password: (e.target as HTMLInputElement).value })}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                onInput={(e) => setFormData({ ...formData, confirmPassword: (e.target as HTMLInputElement).value })}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genero">Identidade de Gênero</Label>
              <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mulher cisgênero">Mulher cisgênero</SelectItem>
                  <SelectItem value="Mulher transexual/transgênero">Mulher transexual/transgênero</SelectItem>
                  <SelectItem value="Não binário">Não binário</SelectItem>
                  <SelectItem value="Homem cisgênero">Homem cisgênero</SelectItem>
                  <SelectItem value="Homem transexual/transgênero">Homem transexual/transgênero</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                  <SelectItem value="Prefiro não responder">Prefiro não responder</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cisgênero: identifica-se com o sexo designado ao nascer
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faixaEtaria">Faixa Etária</Label>
              <Select value={formData.faixaEtaria} onValueChange={(value) => setFormData({ ...formData, faixaEtaria: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-25">18-25</SelectItem>
                  <SelectItem value="26-35">26-35</SelectItem>
                  <SelectItem value="36-45">36-45</SelectItem>
                  <SelectItem value="46-55">46-55</SelectItem>
                  <SelectItem value="56+">56+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {estadosBrasileiros.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="regiao">Região de Origem</Label>
              <Select value={formData.regiao} onValueChange={(value) => setFormData({ ...formData, regiao: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Norte">Norte</SelectItem>
                  <SelectItem value="Nordeste">Nordeste</SelectItem>
                  <SelectItem value="Centro-Oeste">Centro-Oeste</SelectItem>
                  <SelectItem value="Sudeste">Sudeste</SelectItem>
                  <SelectItem value="Sul">Sul</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pertencimentoRacial">Pertencimento Racial</Label>
              <Select value={formData.pertencimentoRacial} onValueChange={(value) => setFormData({ ...formData, pertencimentoRacial: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Preto">Preto</SelectItem>
                  <SelectItem value="Parda">Parda</SelectItem>
                  <SelectItem value="Indígena">Indígena</SelectItem>
                  <SelectItem value="Branco">Branco</SelectItem>
                  <SelectItem value="Amarelo">Amarelo</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                  <SelectItem value="Prefiro não responder">Prefiro não responder</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienciaBancas">Experiência com Bancas de Heteroidentificação</Label>
              <Select value={formData.experienciaBancas} onValueChange={(value) => setFormData({ ...formData, experienciaBancas: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="É minha primeira formação">É minha primeira formação</SelectItem>
                  <SelectItem value="Já participo de Bancas de heteroidentificação">Já participo de Bancas de heteroidentificação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registro;
