import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const profileSchema = z.object({
  genero: z.string().min(1, { message: 'Selecione um gênero' }),
  faixaEtaria: z.string().min(1, { message: 'Selecione uma faixa etária' }),
  estado: z.string().min(1, { message: 'Selecione um estado' }),
});

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const CompleteProfile = () => {
  const [formData, setFormData] = useState({
    genero: '',
    faixaEtaria: '',
    estado: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const checkProfile = async () => {
      if (!user) {
        navigate('/login', { replace: true });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('genero, faixa_etaria, estado')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile && profile.genero && profile.faixa_etaria && profile.estado) {
        navigate('/', { replace: true });
      } else {
        setLoading(false);
      }
    };

    checkProfile();
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validatedData = profileSchema.parse(formData);
      setSubmitting(true);

      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user?.id,
          email: user?.email || '',
          genero: validatedData.genero,
          faixa_etaria: validatedData.faixaEtaria,
          estado: validatedData.estado,
        });

      if (error) {
        toast({
          title: 'Erro ao salvar perfil',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Perfil completo!',
        description: 'Agora você pode começar o treinamento',
      });
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-soft p-8">
          <h1 className="text-3xl font-bold text-center mb-2">Complete seu Perfil</h1>
          <p className="text-muted-foreground text-center mb-8">
            Precisamos de algumas informações para personalizar sua experiência
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="genero">Gênero</Label>
              <Select value={formData.genero} onValueChange={(value) => setFormData({ ...formData, genero: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? 'Salvando...' : 'Continuar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
