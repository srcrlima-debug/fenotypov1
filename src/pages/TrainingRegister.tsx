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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRegiaoFromEstado } from '@/lib/regionMapping';
import { BookOpen, ListChecks, Scale, AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2, CheckCircle, AlertCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const profileSchema = z.object({
  genero: z.string().min(1, { message: 'Selecione o gênero' }),
  faixa_etaria: z.string().min(1, { message: 'Selecione a faixa etária' }),
  estado: z.string().min(1, { message: 'Selecione o estado' }),
  regiao: z.string().min(1, { message: 'Região é obrigatória' }),
  pertencimento_racial: z.string().optional(),
  experiencia_bancas: z.string().optional(),
  consent: z.boolean().refine(val => val === true, {
    message: 'Você deve concordar com os termos para continuar'
  })
});

export default function TrainingRegister() {
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
  const [loadingTraining, setLoadingTraining] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const DEBOUNCE_TIME = 2000;

  const [formData, setFormData] = useState({
    genero: '',
    faixa_etaria: '',
    estado: '',
    regiao: '',
    pertencimento_racial: '',
    experiencia_bancas: '',
    consent: false
  });

  const [touched, setTouched] = useState({
    genero: false,
    faixa_etaria: false,
    estado: false,
    regiao: false,
    pertencimento_racial: false,
    experiencia_bancas: false,
    consent: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate field on change
  const validateField = (fieldName: keyof typeof formData, value: string | boolean) => {
    try {
      // Define schemas para cada campo individualmente
      if (fieldName === 'genero') {
        z.string().min(1, { message: 'Selecione o gênero' }).parse(value);
      } else if (fieldName === 'faixa_etaria') {
        z.string().min(1, { message: 'Selecione a faixa etária' }).parse(value);
      } else if (fieldName === 'estado') {
        z.string().min(1, { message: 'Selecione o estado' }).parse(value);
      } else if (fieldName === 'regiao') {
        z.string().min(1, { message: 'Região é obrigatória' }).parse(value);
      } else if (fieldName === 'consent') {
        z.boolean().refine(val => val === true, {
          message: 'Você deve concordar com os termos para continuar'
        }).parse(value);
      }
      
      setErrors(prev => ({ ...prev, [fieldName]: '' }));
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(prev => ({ ...prev, [fieldName]: error.errors[0].message }));
      }
      return false;
    }
  };

  const handleFieldChange = (fieldName: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName, value);
    
    // Auto-preencher região quando estado é selecionado
    if (fieldName === 'estado' && typeof value === 'string') {
      const regiao = getRegiaoFromEstado(value);
      if (regiao) {
        setFormData(prev => ({ ...prev, regiao }));
        setTouched(prev => ({ ...prev, regiao: true }));
        validateField('regiao', regiao);
      }
    }
  };

  const isFieldValid = (fieldName: string) => {
    return touched[fieldName as keyof typeof touched] && formData[fieldName as keyof typeof formData] && !errors[fieldName];
  };

  const isFieldInvalid = (fieldName: string) => {
    return touched[fieldName as keyof typeof touched] && errors[fieldName];
  };

  // Calcular progresso do formulário
  const calculateProgress = () => {
    const requiredFields = ['genero', 'faixa_etaria', 'estado', 'regiao', 'consent'];
    const filledFields = requiredFields.filter(field => {
      const value = formData[field as keyof typeof formData];
      if (typeof value === 'boolean') return value === true;
      return value && value.toString().trim() !== '';
    });
    return {
      filled: filledFields.length,
      total: requiredFields.length,
      percentage: (filledFields.length / requiredFields.length) * 100
    };
  };

  const progress = calculateProgress();

  useEffect(() => {
    if (sessionId && !isValidSessionId) {
      toast.error('Link de acesso inválido. Solicite um novo link ao administrador.');
      logAccess('invalid_sessionid_on_register', { 
        error: 'Invalid UUID format',
        trainingId: finalTrainingId 
      });
    }
  }, [sessionId, isValidSessionId, logAccess, finalTrainingId]);

  // Redirecionar para login se não autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      toast.info('Faça login para continuar o cadastro');
      navigateWithSession(`/training/${finalTrainingId}/login`);
    }
  }, [user, authLoading, finalTrainingId, navigateWithSession]);

  // Auto-redirect para usuário já participante
  useEffect(() => {
    if (authLoading) return;
    
    if (user && finalTrainingId) {
      const checkExistingParticipation = async () => {
        console.log('[TrainingRegister] Verificando participação existente...');
        
        const { data } = await supabase
          .from('training_participants')
          .select('id')
          .eq('user_id', user.id)
          .eq('training_id', finalTrainingId)
          .maybeSingle();

        if (data) {
          console.log('[TrainingRegister] Usuário já é participante, redirecionando para antessala');
          toast.info('Você já está cadastrado neste treinamento');
          await navigateWithSession('/antessala');
        }
      };

      checkExistingParticipation();
    }
  }, [user, finalTrainingId, authLoading, navigateWithSession]);

  useEffect(() => {
    loadTraining();
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
    } finally {
      setLoadingTraining(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verificar debounce
    const now = Date.now();
    if (now - lastSubmitTime < DEBOUNCE_TIME) {
      toast.error('Aguarde alguns segundos antes de enviar novamente');
      return;
    }

    // Verificar se já está enviando
    if (loading) {
      return;
    }

    // Verificar se usuário está autenticado
    if (!user) {
      toast.error('Você precisa estar autenticado para completar o cadastro');
      await navigateWithSession(`/training/${finalTrainingId}/login`);
      return;
    }
    
    setLoading(true);
    setLastSubmitTime(now);

    try {
      const validationResult = profileSchema.safeParse(formData);

      if (!validationResult.success) {
        toast.error(validationResult.error.errors[0].message);
        return;
      }

      // Atualizar/criar perfil do usuário
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            email: user.email || '',
            genero: formData.genero.trim(),
            faixa_etaria: formData.faixa_etaria.trim(),
            estado: formData.estado.trim(),
            pertencimento_racial: formData.pertencimento_racial?.trim() || null,
            experiencia_bancas: formData.experiencia_bancas?.trim() || null,
            regiao: formData.regiao
          },
          { onConflict: 'user_id' }
        );

      if (profileError) throw profileError;

      // Registrar como participante do treinamento
      const { error: participantError } = await supabase
        .from('training_participants')
        .upsert(
          {
            training_id: finalTrainingId,
            user_id: user.id,
            email: user.email || '',
            genero: formData.genero.trim(),
            faixa_etaria: formData.faixa_etaria.trim(),
            estado: formData.estado.trim(),
            pertencimento_racial: formData.pertencimento_racial?.trim() || null,
            experiencia_bancas: formData.experiencia_bancas?.trim() || null,
            regiao: formData.regiao
          },
          { onConflict: 'training_id,user_id' }
        );

      if (participantError) throw participantError;

      console.log('[TrainingRegister] Cadastro concluído com sucesso!');
      toast.success('Cadastro realizado com sucesso!');
      
      await navigateWithSession('/antessala');
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
        </CardHeader>
        <CardContent>
          {currentStep < carouselSteps.length ? (
            <div className="space-y-6">
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

              <div className="min-h-[350px] flex items-center justify-center">
                <div className="animate-fade-in w-full">
                  {carouselSteps[currentStep].content}
                </div>
              </div>

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
                  {currentStep === carouselSteps.length - 1 ? 'Ir para Cadastro' : 'Próximo'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              {/* Indicador de Progresso */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    Progresso do Cadastro
                  </span>
                  <span className="text-muted-foreground">
                    {progress.filled} de {progress.total} campos obrigatórios
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                {progress.percentage === 100 && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Todos os campos obrigatórios preenchidos!
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="genero" className="flex items-center gap-2">
                  Identidade de Gênero
                  {isFieldValid('genero') && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isFieldInvalid('genero') && <AlertCircle className="h-4 w-4 text-destructive" />}
                </Label>
                <Select 
                  value={formData.genero} 
                  onValueChange={(value) => handleFieldChange('genero', value)}
                >
                  <SelectTrigger className={cn(
                    "bg-muted/30 border-border",
                    isFieldValid('genero') && "border-green-500",
                    isFieldInvalid('genero') && "border-destructive"
                  )}>
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
                {isFieldInvalid('genero') && (
                  <p className="text-xs text-destructive">{errors.genero}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  <strong>Cisgênero:</strong> identifica-se com o sexo designado ao nascer<br/>
                  <strong>Transgênero:</strong> identidade diferente da designada ao nascer<br/>
                  <strong>Não binário:</strong> não se define dentro do sistema binário homem/mulher
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faixa_etaria" className="flex items-center gap-2">
                  Faixa Etária
                  {isFieldValid('faixa_etaria') && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isFieldInvalid('faixa_etaria') && <AlertCircle className="h-4 w-4 text-destructive" />}
                </Label>
                <Select 
                  value={formData.faixa_etaria} 
                  onValueChange={(value) => handleFieldChange('faixa_etaria', value)}
                >
                  <SelectTrigger className={cn(
                    "bg-muted/30 border-border",
                    isFieldValid('faixa_etaria') && "border-green-500",
                    isFieldInvalid('faixa_etaria') && "border-destructive"
                  )}>
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
                {isFieldInvalid('faixa_etaria') && (
                  <p className="text-xs text-destructive">{errors.faixa_etaria}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado" className="flex items-center gap-2">
                  Estado
                  {isFieldValid('estado') && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isFieldInvalid('estado') && <AlertCircle className="h-4 w-4 text-destructive" />}
                </Label>
                <Select 
                  value={formData.estado} 
                  onValueChange={(value) => handleFieldChange('estado', value)}
                >
                  <SelectTrigger className={cn(
                    "bg-muted/30 border-border",
                    isFieldValid('estado') && "border-green-500",
                    isFieldInvalid('estado') && "border-destructive"
                  )}>
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
                {isFieldInvalid('estado') && (
                  <p className="text-xs text-destructive">{errors.estado}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="regiao" className="flex items-center gap-2">
                  Região de Origem
                  {isFieldValid('regiao') && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {isFieldInvalid('regiao') && <AlertCircle className="h-4 w-4 text-destructive" />}
                </Label>
                <Select 
                  value={formData.regiao} 
                  onValueChange={(value) => handleFieldChange('regiao', value)}
                  disabled={true}
                >
                  <SelectTrigger className={cn(
                    "bg-muted/30 border-border opacity-70",
                    isFieldValid('regiao') && "border-green-500",
                    isFieldInvalid('regiao') && "border-destructive"
                  )}>
                    <SelectValue placeholder="Preenchida automaticamente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Norte">Norte</SelectItem>
                    <SelectItem value="Nordeste">Nordeste</SelectItem>
                    <SelectItem value="Centro-Oeste">Centro-Oeste</SelectItem>
                    <SelectItem value="Sudeste">Sudeste</SelectItem>
                    <SelectItem value="Sul">Sul</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  A região é preenchida automaticamente baseada no estado selecionado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pertencimento_racial" className="flex items-center gap-2">
                  Pertencimento Racial
                </Label>
                <Select 
                  value={formData.pertencimento_racial} 
                  onValueChange={(value) => handleFieldChange('pertencimento_racial', value)}
                >
                  <SelectTrigger className="bg-muted/30 border-border">
                    <SelectValue placeholder="Selecione (opcional)" />
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
                <Label htmlFor="experiencia_bancas" className="flex items-center gap-2">
                  Experiência com Bancas de Heteroidentificação
                </Label>
                <Select 
                  value={formData.experiencia_bancas} 
                  onValueChange={(value) => handleFieldChange('experiencia_bancas', value)}
                >
                  <SelectTrigger className="bg-muted/30 border-border">
                    <SelectValue placeholder="Selecione (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Não possuo">Não possuo</SelectItem>
                    <SelectItem value="Já participo">Já participo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-2 border border-border rounded-md p-4 bg-muted/30">
                <Checkbox 
                  id="consent" 
                  checked={formData.consent}
                  onCheckedChange={(checked) => handleFieldChange('consent', checked as boolean)}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="consent"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Concordo com os termos
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Confirmo que li e aceito os termos de uso de dados da plataforma Fenotypo, 
                    conforme a Lei Geral de Proteção de Dados (LGPD). Entendo que meus dados 
                    serão utilizados exclusivamente para fins educacionais e análise estatística anônima.
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[hsl(20,70%,65%)] hover:bg-[hsl(20,70%,55%)] text-white relative" 
                disabled={loading || !formData.consent}
              >
                {loading && (
                  <div className="absolute left-4">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
              </Button>
              
              {loading && (
                <p className="text-xs text-center text-muted-foreground">
                  Por favor, aguarde enquanto processamos seu cadastro
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
