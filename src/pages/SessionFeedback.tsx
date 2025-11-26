import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Header } from '@/components/Header';
import { Star, Send, CheckCircle, Loader2, Award } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { feedbackSchema, FeedbackFormData } from '@/lib/feedbackValidation';
import { z } from 'zod';
import { BadgeNotification } from '@/components/BadgeNotification';
import { BadgeDisplay } from '@/components/BadgeDisplay';
import { checkRateLimit } from '@/lib/rateLimiter';

export default function SessionFeedback() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<any>(null);
  const [userBadges, setUserBadges] = useState<any[]>([]);
  const [newBadges, setNewBadges] = useState<any[]>([]);

  const [formData, setFormData] = useState<FeedbackFormData>({
    rating: 0,
    experiencia_geral: '',
    clareza_instrucoes: 0,
    tempo_adequado: 0,
    interface_qualidade: 0,
    sugestoes: '',
    recomendaria: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [sessionId, user]);

  const loadData = async () => {
    try {
      // Load session info
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;
      setSession(sessionData);

      // Load user badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          badge_definitions (
            nome,
            descricao,
            icone
          )
        `)
        .eq('user_id', user?.id);

      if (badgesData) {
        const formattedBadges = badgesData.map((b: any) => ({
          badge_id: b.badge_id,
          badge_nome: b.badge_definitions.nome,
          badge_descricao: b.badge_definitions.descricao,
          badge_icone: b.badge_definitions.icone,
          earned_at: b.earned_at,
        }));
        setUserBadges(formattedBadges);
      }

      // Check if user already submitted feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('training_feedback')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user?.id)
        .maybeSingle();

      if (feedbackData) {
        setExistingFeedback(feedbackData);
        setFormData({
          rating: feedbackData.rating,
          experiencia_geral: feedbackData.experiencia_geral || '',
          clareza_instrucoes: feedbackData.clareza_instrucoes || 0,
          tempo_adequado: feedbackData.tempo_adequado || 0,
          interface_qualidade: feedbackData.interface_qualidade || 0,
          sugestoes: feedbackData.sugestoes || '',
          recomendaria: feedbackData.recomendaria ?? false,
        });
        setSubmitted(true);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados da sessão',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    try {
      // Validate form data
      feedbackSchema.parse(formData);

      // Rate limiting check: max 5 feedbacks por minuto
      const rateLimitResult = await checkRateLimit({
        endpoint: 'submit-feedback',
        maxRequests: 5,
        windowMinutes: 1,
      });

      if (!rateLimitResult.allowed) {
        console.warn('Rate limit exceeded:', rateLimitResult);
        toast({
          title: "Muitas requisições",
          description: rateLimitResult.message || "Por favor, aguarde alguns instantes antes de tentar novamente.",
          variant: "destructive",
        });
        return;
      }

      setSubmitting(true);

      const feedbackData = {
        session_id: sessionId,
        user_id: user?.id,
        ...formData,
      };

      let error;
      if (existingFeedback) {
        // Update existing feedback
        const result = await supabase
          .from('training_feedback')
          .update(feedbackData)
          .eq('id', existingFeedback.id);
        error = result.error;
      } else {
        // Insert new feedback
        const result = await supabase
          .from('training_feedback')
          .insert([feedbackData]);
        error = result.error;
      }

      if (error) throw error;

      // Check for earned badges
      const { data: earnedBadges } = await supabase.rpc('check_and_award_badges', {
        _user_id: user?.id,
        _session_id: sessionId,
        _feedback_data: formData,
      });

      if (earnedBadges && earnedBadges.length > 0) {
        setNewBadges(earnedBadges);
        // Reload badges to show in UI
        await loadData();
      }

      setSubmitted(true);
      toast({
        title: 'Feedback enviado!',
        description: 'Obrigado por compartilhar sua experiência conosco.',
      });

      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(newErrors);
        toast({
          title: 'Erro de validação',
          description: 'Por favor, verifique os campos do formulário',
          variant: 'destructive',
        });
      } else {
        console.error('Error submitting feedback:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível enviar o feedback. Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange: (value: number) => void) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
            disabled={submitted && !existingFeedback}
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (submitted && !existingFeedback) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Feedback Enviado!</h2>
              <p className="text-muted-foreground">
                Obrigado por compartilhar sua experiência. Suas sugestões são muito valiosas para nós!
              </p>
              <Button onClick={() => navigate('/')} className="w-full">
                Voltar para Início
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <BadgeNotification badges={newBadges} onDismiss={() => setNewBadges([])} />
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Avaliação da Sessão</h1>
            <p className="text-muted-foreground mt-2">
              {session?.nome} - {new Date(session?.data).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* User Badges Display */}
          {userBadges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Seus Badges
                </CardTitle>
                <CardDescription>
                  Continue deixando feedback detalhado para conquistar mais badges!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BadgeDisplay badges={userBadges} variant="compact" />
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Overall Rating */}
            <Card>
              <CardHeader>
                <CardTitle>Avaliação Geral *</CardTitle>
                <CardDescription>
                  Como você avalia sua experiência geral na sessão?
                </CardDescription>
              </CardHeader>
              <CardContent>
                {renderStars(formData.rating, (value) =>
                  setFormData({ ...formData, rating: value })
                )}
                {errors.rating && (
                  <p className="text-sm text-destructive mt-2">{errors.rating}</p>
                )}
              </CardContent>
            </Card>

            {/* Detailed Ratings */}
            <Card>
              <CardHeader>
                <CardTitle>Avaliações Específicas</CardTitle>
                <CardDescription>
                  Avalie aspectos específicos da sessão
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Clareza das Instruções</Label>
                  <div className="mt-2">
                    {renderStars(formData.clareza_instrucoes || 0, (value) =>
                      setFormData({ ...formData, clareza_instrucoes: value })
                    )}
                  </div>
                </div>

                <div>
                  <Label>Tempo Adequado para Avaliação</Label>
                  <div className="mt-2">
                    {renderStars(formData.tempo_adequado || 0, (value) =>
                      setFormData({ ...formData, tempo_adequado: value })
                    )}
                  </div>
                </div>

                <div>
                  <Label>Qualidade da Interface</Label>
                  <div className="mt-2">
                    {renderStars(formData.interface_qualidade || 0, (value) =>
                      setFormData({ ...formData, interface_qualidade: value })
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Text Feedback */}
            <Card>
              <CardHeader>
                <CardTitle>Comentários e Sugestões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="experiencia">
                    Descreva sua experiência geral
                  </Label>
                  <Textarea
                    id="experiencia"
                    placeholder="Compartilhe sua experiência durante a sessão..."
                    value={formData.experiencia_geral}
                    onChange={(e) =>
                      setFormData({ ...formData, experiencia_geral: e.target.value })
                    }
                    maxLength={500}
                    rows={4}
                    disabled={submitted && !existingFeedback}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.experiencia_geral?.length || 0}/500 caracteres
                  </p>
                </div>

                <div>
                  <Label htmlFor="sugestoes">
                    Sugestões de Melhoria
                  </Label>
                  <Textarea
                    id="sugestoes"
                    placeholder="Como podemos melhorar a experiência?"
                    value={formData.sugestoes}
                    onChange={(e) =>
                      setFormData({ ...formData, sugestoes: e.target.value })
                    }
                    maxLength={1000}
                    rows={4}
                    disabled={submitted && !existingFeedback}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.sugestoes?.length || 0}/1000 caracteres
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recommendation */}
            <Card className={errors.recomendaria ? 'border-destructive' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <Label>Você recomendaria esta sessão? *</Label>
                    <p className="text-sm text-muted-foreground">
                      Indicaria este tipo de avaliação para outros colegas?
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, recomendaria: false })}
                      disabled={submitted && !existingFeedback}
                      className={`text-sm font-medium transition-all duration-300 ease-out cursor-pointer hover:scale-110 disabled:cursor-not-allowed ${
                        formData.recomendaria === false 
                          ? 'text-foreground scale-110' 
                          : 'text-muted-foreground scale-100 hover:text-foreground'
                      }`}
                    >
                      Não
                    </button>
                    <Switch
                      checked={formData.recomendaria === true}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, recomendaria: checked })
                      }
                      disabled={submitted && !existingFeedback}
                      className={`transition-all duration-300 ${
                        formData.recomendaria === true 
                          ? 'data-[state=checked]:bg-green-600 scale-110' 
                          : 'scale-100'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, recomendaria: true })}
                      disabled={submitted && !existingFeedback}
                      className={`text-sm font-medium transition-all duration-300 ease-out cursor-pointer hover:scale-110 disabled:cursor-not-allowed ${
                        formData.recomendaria === true 
                          ? 'text-green-600 font-semibold scale-110 animate-fade-in' 
                          : 'text-muted-foreground scale-100 hover:text-green-600'
                      }`}
                    >
                      Sim
                    </button>
                  </div>
                </div>
                {errors.recomendaria && (
                  <p className="text-sm text-destructive mt-2 animate-fade-in flex items-center gap-1">
                    <span className="font-semibold">⚠</span> {errors.recomendaria}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={submitting || (submitted && !existingFeedback)}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : existingFeedback ? (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Atualizar Feedback
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
