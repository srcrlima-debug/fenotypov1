import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { estadosData } from '@/lib/regionMapping';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string(),
  genero: z.string().min(1, { message: 'Selecione o gênero' }),
  faixa_etaria: z.string().min(1, { message: 'Selecione a faixa etária' }),
  estado: z.string().min(1, { message: 'Selecione o estado' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function TrainingRegister() {
  const { trainingId } = useParams<{ trainingId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [training, setTraining] = useState<any>(null);
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    genero: '',
    faixa_etaria: '',
    estado: '',
    pertencimento_racial: '',
    experiencia_bancas: ''
  });

  useEffect(() => {
    if (user && trainingId) {
      checkExistingParticipation();
    }
  }, [user, trainingId]);

  useEffect(() => {
    loadTraining();
  }, [trainingId]);

  const loadTraining = async () => {
    if (!trainingId) return;

    try {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .eq('id', trainingId)
        .single();

      if (error) throw error;

      if (data.status !== 'active') {
        toast.error('Este treinamento não está mais aceitando inscrições');
        navigate('/');
        return;
      }

      setTraining(data);
    } catch (error) {
      console.error('Error loading training:', error);
      toast.error('Treinamento não encontrado');
      navigate('/');
    } finally {
      setLoadingTraining(false);
    }
  };

  const checkExistingParticipation = async () => {
    try {
      const { data } = await supabase
        .from('training_participants')
        .select('*')
        .eq('training_id', trainingId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (data) {
        toast.info('Você já está cadastrado neste treinamento');
        navigate(`/training/${trainingId}/login`);
      }
    } catch (error) {
      console.error('Error checking participation:', error);
    }
  };

  const carouselSteps = [
    {
      title: "Bem-vindo ao Treinamento",
      content: (
        <div className="space-y-4">
          <p className="text-lg">
            Este é um treinamento para compreensão e aplicação da Portaria Normativa nº 4, de 6 de abril de 2018, 
            que estabelece os procedimentos de heteroidentificação complementar à autodeclaração de candidatos negros.
          </p>
        </div>
      )
    },
    {
      title: "Como Funciona",
      content: (
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">O treinamento consiste em:</h3>
          <ol className="list-decimal list-inside space-y-2">
            <li>Apresentação de 30 fotografias</li>
            <li>Para cada foto, você terá tempo determinado para avaliar</li>
            <li>Sua avaliação será registrada anonimamente</li>
            <li>Ao final, você receberá feedback sobre suas escolhas</li>
          </ol>
        </div>
      )
    },
    {
      title: "Critérios de Avaliação",
      content: (
        <div className="space-y-4">
          <p>As opções de resposta são:</p>
          <ul className="list-disc list-inside space-y-2">
            <li><strong>Branca:</strong> Pessoa que não apresenta características fenotípicas que a qualifiquem como preta ou parda</li>
            <li><strong>Parda:</strong> Pessoa com características fenotípicas intermediárias</li>
            <li><strong>Preta:</strong> Pessoa com características fenotípicas preponderantes da população afrodescendente</li>
            <li><strong>Não se aplica:</strong> Quando não é possível fazer uma avaliação</li>
          </ul>
        </div>
      )
    },
    {
      title: "Importante",
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="font-semibold mb-2">Atenção:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Use preferencialmente computador, notebook ou tablet</li>
              <li>Certifique-se de ter boa conexão com a internet</li>
              <li>O treinamento acontecerá em tempo real</li>
              <li>Você precisa estar presente no horário agendado</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (currentStep < carouselSteps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Sanitize and validate inputs
      const sanitizedEmail = formData.email.trim().toLowerCase();
      const sanitizedPassword = formData.password.trim();

      // Validate form data using zod
      const validationResult = registerSchema.safeParse({
        ...formData,
        email: sanitizedEmail,
        password: sanitizedPassword
      });

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      let userId = user?.id;

      // Create account if user is not logged in
      if (!user) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: sanitizedEmail,
          password: sanitizedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/training/${trainingId}/login`
          }
        });

        if (authError) {
          if (authError.message.includes('already registered')) {
            toast.error('Este email já está cadastrado. Faça login.');
            navigate(`/training/${trainingId}/login`);
            return;
          }
          throw authError;
        }

        userId = authData.user?.id;
      }

      if (!userId) {
        throw new Error('Erro ao criar conta');
      }

      // Get region from estado
      const estadoObj = estadosData.find(e => e.nome === formData.estado);
      const regiao = estadoObj?.regiao || null;

      // Register as training participant
      const { error: participantError } = await supabase
        .from('training_participants')
        .insert({
          training_id: trainingId,
          user_id: userId,
          email: sanitizedEmail,
          genero: formData.genero.trim(),
          faixa_etaria: formData.faixa_etaria.trim(),
          estado: formData.estado.trim(),
          pertencimento_racial: formData.pertencimento_racial?.trim() || null,
          experiencia_bancas: formData.experiencia_bancas?.trim() || null,
          regiao: regiao
        });

      if (participantError) throw participantError;

      toast.success('Cadastro realizado com sucesso!');
      navigate(`/training/${trainingId}/login`);
    } catch (error: any) {
      console.error('Error during registration:', error);
      toast.error(error.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  if (loadingTraining) {
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
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">
            {currentStep < carouselSteps.length ? carouselSteps[currentStep].title : `Cadastro - ${training?.nome}`}
          </CardTitle>
          <CardDescription>
            {currentStep < carouselSteps.length 
              ? `Passo ${currentStep + 1} de ${carouselSteps.length + 1}`
              : `Data: ${new Date(training?.data).toLocaleDateString('pt-BR')}`
            }
          </CardDescription>
          {currentStep >= carouselSteps.length && training?.descricao && (
            <p className="text-sm text-muted-foreground mt-2">{training.descricao}</p>
          )}
        </CardHeader>
        <CardContent>
          {currentStep < carouselSteps.length ? (
            <div className="space-y-6">
              <div className="min-h-[300px] flex items-center justify-center">
                {carouselSteps[currentStep].content}
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>
                
                <div className="flex gap-2">
                  {carouselSteps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        index === currentStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                
                <Button
                  type="button"
                  onClick={nextStep}
                >
                  {currentStep === carouselSteps.length - 1 ? 'Fazer Cadastro' : 'Próximo'}
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={!!user}
              />
            </div>

            {!user && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu gênero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                  <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="faixa_etaria">Faixa Etária</Label>
              <Select value={formData.faixa_etaria} onValueChange={(value) => setFormData({ ...formData, faixa_etaria: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione sua faixa etária" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="18-25">18-25 anos</SelectItem>
                  <SelectItem value="26-35">26-35 anos</SelectItem>
                  <SelectItem value="36-45">36-45 anos</SelectItem>
                  <SelectItem value="46-55">46-55 anos</SelectItem>
                  <SelectItem value="56+">56+ anos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu estado" />
                </SelectTrigger>
                <SelectContent>
                  {estadosData.map((estado) => (
                    <SelectItem key={estado.nome} value={estado.nome}>
                      {estado.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pertencimento_racial">Pertencimento Racial</Label>
              <Select value={formData.pertencimento_racial} onValueChange={(value) => setFormData({ ...formData, pertencimento_racial: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Branca">Branca</SelectItem>
                  <SelectItem value="Parda">Parda</SelectItem>
                  <SelectItem value="Preta">Preta</SelectItem>
                  <SelectItem value="Amarela">Amarela</SelectItem>
                  <SelectItem value="Indígena">Indígena</SelectItem>
                  <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experiencia_bancas">Experiência em Bancas</Label>
              <Select value={formData.experiencia_bancas} onValueChange={(value) => setFormData({ ...formData, experiencia_bancas: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nenhuma">Nenhuma</SelectItem>
                  <SelectItem value="1-2 anos">1-2 anos</SelectItem>
                  <SelectItem value="3-5 anos">3-5 anos</SelectItem>
                  <SelectItem value="5+ anos">5+ anos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>

              <div className="text-center text-sm">
                <p className="text-muted-foreground">
                  Já possui cadastro?{' '}
                  <Link to={`/training/${trainingId}/login`} className="text-primary hover:underline">
                    Fazer login
                  </Link>
                </p>
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="w-full"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
