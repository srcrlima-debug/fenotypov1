import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { estadosData } from '@/lib/regionMapping';
import { BookOpen, ListChecks, Scale, AlertTriangle, UserPlus, ChevronLeft, ChevronRight, Shield } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const registerSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres' }),
  confirmPassword: z.string(),
  genero: z.string().min(1, { message: 'Selecione o gênero' }),
  faixa_etaria: z.string().min(1, { message: 'Selecione a faixa etária' }),
  estado: z.string().min(1, { message: 'Selecione o estado' }),
  consent: z.boolean().refine(val => val === true, {
    message: 'Você deve concordar com os termos para continuar'
  })
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
  const [touchStart, setTouchStart] = useState(0);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    genero: '',
    faixa_etaria: '',
    estado: '',
    pertencimento_racial: '',
    experiencia_bancas: '',
    consent: false
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
      title: 'Bem-vindo ao Treinamento',
      icon: BookOpen,
      content: (
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-bold">Treinamento de Avaliação Fenotípica</h3>
          <p className="text-muted-foreground text-lg">
            Este treinamento visa aprimorar a percepção sobre vieses raciais em processos de avaliação. 
            Você participará de uma dinâmica onde avaliará imagens de forma sincronizada com outros participantes.
          </p>
        </div>
      )
    },
    {
      title: 'Como Funciona',
      icon: ListChecks,
      content: (
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <ListChecks className="w-10 h-10 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-center">Dinâmica do Treinamento</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">•</span>
              <span>Você verá uma série de imagens apresentadas individualmente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">•</span>
              <span>Para cada imagem, terá tempo limitado para fazer sua avaliação</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">•</span>
              <span>Todos os participantes avaliam simultaneamente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-primary">•</span>
              <span>Ao final, haverá análise coletiva dos resultados</span>
            </li>
          </ul>
        </div>
      )
    },
    {
      title: 'Critérios de Avaliação',
      icon: Scale,
      content: (
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
            <Scale className="w-10 h-10 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-center">O que avaliar?</h3>
          <p className="text-muted-foreground text-center">
            Sua avaliação deve considerar características fenotípicas visíveis nas imagens, 
            baseando-se em critérios específicos que serão explicados durante o treinamento.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
            <p className="text-sm text-center font-medium">
              📊 Os resultados serão analisados estatisticamente para identificar padrões e possíveis vieses
            </p>
          </div>
        </div>
      )
    },
    {
      title: 'Importante',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-10 h-10 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-center text-amber-600">⚠️ Pontos de Atenção</h3>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-600">•</span>
              <span>Mantenha concentração durante toda a dinâmica</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-600">•</span>
              <span>Não há respostas certas ou erradas, apenas percepções</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-600">•</span>
              <span>Os dados são anônimos e usados apenas para fins educacionais</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-amber-600">•</span>
              <span>Sua participação é voluntária e pode ser interrompida a qualquer momento</span>
            </li>
          </ul>
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextStep();
      } else {
        prevStep();
      }
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
      
      // Buscar sessão ativa/waiting para redirecionar direto para antessala
      const { data: activeSessions, error: sessionError } = await supabase
        .from('sessions')
        .select('id')
        .eq('training_id', trainingId)
        .in('session_status', ['waiting', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sessionError) {
        console.error('Error fetching active sessions:', sessionError);
      }

      // Se há sessão waiting/active, redireciona direto para antessala
      if (activeSessions) {
        navigate(`/training/${trainingId}/session/${activeSessions.id}/antessala`);
      } else {
        // Se não há sessão ativa, vai para página de boas-vindas
        navigate(`/training/${trainingId}/welcome`);
      }
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
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep + 1) / (carouselSteps.length + 1)) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Passo {currentStep + 1} de {carouselSteps.length}
                </p>
              </div>

              {/* Carousel Content with Touch Support */}
              <div 
                className="min-h-[350px] flex items-center justify-center"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="animate-fade-in w-full">
                  {carouselSteps[currentStep].content}
                </div>
              </div>

              {/* Carousel indicators - Clickable */}
              <div className="flex justify-center gap-2">
                {carouselSteps.map((step, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`rounded-full transition-all duration-300 hover:scale-125 ${
                      index === currentStep 
                        ? 'bg-primary w-8 h-3' 
                        : index < currentStep 
                          ? 'bg-primary/50 w-3 h-3' 
                          : 'bg-muted w-3 h-3'
                    }`}
                    aria-label={`Ir para passo ${index + 1}: ${step.title}`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-between gap-4">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <Button onClick={nextStep} className="gap-2">
                  {currentStep === carouselSteps.length - 1 ? (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Ir para Cadastro
                    </>
                  ) : (
                    <>
                      Próximo
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
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

            {/* LGPD Compliance Card */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    Segurança e Privacidade - Conformidade com LGPD
                  </h4>
                  <p className="text-blue-700 dark:text-blue-300">
                    Todas as medidas de segurança seguem as melhores práticas e estão em 
                    conformidade com a Lei Geral de Proteção de Dados (LGPD).
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 bg-white dark:bg-gray-900 rounded p-3 border border-blue-200 dark:border-blue-800">
                <Checkbox 
                  id="consent"
                  checked={formData.consent}
                  onCheckedChange={(checked) => setFormData({...formData, consent: checked as boolean})}
                  required
                />
                <Label htmlFor="consent" className="text-xs leading-relaxed cursor-pointer">
                  Li e concordo com o <strong>uso anônimo dos meus dados</strong> para estudos 
                  acadêmicos e aprimoramento dos processos de heteroidentificação. Estou ciente 
                  de que todas as informações são tratadas em conformidade com a LGPD.
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading || !formData.consent}>
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
