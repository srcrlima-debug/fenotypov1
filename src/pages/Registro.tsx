import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { getRegiaoFromEstado } from '@/lib/regionMapping';
import { CheckCircle2 } from 'lucide-react';

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
  const [fieldValidation, setFieldValidation] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(location.search);
  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');
  const from = redirectParam || (location.state as any)?.from || '/';

  useEffect(() => {
    if (emailParam) {
      setFormData(prev => ({ ...prev, email: emailParam }));
      validateEmail(emailParam);
    }
  }, [emailParam]);

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

  const validateConfirmPassword = (confirmPassword: string) => {
    setFieldValidation(prev => ({ 
      ...prev, 
      confirmPassword: confirmPassword.length >= 6 && confirmPassword === formData.password 
    }));
  };

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-lg p-8 border border-border">
          <div className="text-center mb-2">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">👤</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="cristhianlima@gmail.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
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
              <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    validatePassword(e.target.value);
                    if (formData.confirmPassword) {
                      validateConfirmPassword(formData.confirmPassword);
                    }
                  }}
                  autoComplete="new-password"
                  required
                  className="pr-10 bg-muted/30 border-border"
                />
                {fieldValidation.password && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar Senha</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData({ ...formData, confirmPassword: e.target.value });
                    validateConfirmPassword(e.target.value);
                  }}
                  autoComplete="new-password"
                  required
                  className="pr-10 bg-muted/30 border-border"
                />
                {fieldValidation.confirmPassword && (
                  <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="genero" className="text-sm font-medium">Identidade de Gênero</Label>
              <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="Mulher cisgênero">Mulher cisgênero</SelectItem>
                  <SelectItem value="Mulher transexual/transgênero">Mulher transexual/transgênero</SelectItem>
                  <SelectItem value="Não binário">Não binário</SelectItem>
                  <SelectItem value="Homem cisgênero" className="bg-amber-50 dark:bg-amber-950/20">Homem cisgênero</SelectItem>
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
              <Label htmlFor="faixaEtaria" className="text-sm font-medium">Faixa Etária</Label>
              <Select value={formData.faixaEtaria} onValueChange={(value) => setFormData({ ...formData, faixaEtaria: value })}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="18-25">18-25</SelectItem>
                  <SelectItem value="26-35">26-35</SelectItem>
                  <SelectItem value="36-45">36-45</SelectItem>
                  <SelectItem value="46-55">46-55</SelectItem>
                  <SelectItem value="56+">56+</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado" className="text-sm font-medium">Estado</Label>
              <Select 
                value={formData.estado} 
                onValueChange={(value) => {
                  const regiao = getRegiaoFromEstado(value);
                  setFormData({ 
                    ...formData, 
                    estado: value,
                    regiao: regiao
                  });
                }}
              >
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Selecione o estado primeiro" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  {estadosBrasileiros.map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {estado}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A região é preenchida automaticamente baseada no estado selecionado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pertencimentoRacial" className="text-sm font-medium">Pertencimento Racial</Label>
              <Select value={formData.pertencimentoRacial} onValueChange={(value) => setFormData({ ...formData, pertencimentoRacial: value })}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
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
              <Label htmlFor="experienciaBancas" className="text-sm font-medium">Experiência com Bancas de Heteroidentificação</Label>
              <Select value={formData.experienciaBancas} onValueChange={(value) => setFormData({ ...formData, experienciaBancas: value })}>
                <SelectTrigger className="bg-muted/30 border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border z-50">
                  <SelectItem value="É minha primeira formação">É minha primeira formação</SelectItem>
                  <SelectItem value="Já participo de Bancas de heteroidentificação">Já participo de Bancas de heteroidentificação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[hsl(20,70%,65%)] hover:bg-[hsl(20,70%,55%)] text-white font-medium py-6 mt-6" 
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar Conta'}
            </Button>
          </form>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Registro;
