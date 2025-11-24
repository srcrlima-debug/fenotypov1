import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { z } from 'zod';
import logoHorizontal from '@/assets/logo-fenotypo-horiz.png';

const emailSchema = z.object({
  email: z.string().email({ message: 'Email inválido' }),
});

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validar email com zod
      const validatedData = emailSchema.parse({ email: email.trim() });
      setLoading(true);

      // Verificar se o email existe no sistema
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', validatedData.email)
        .maybeSingle();

      if (!profile) {
        toast({
          title: "Email não encontrado",
          description: "Este email não está cadastrado no sistema. Verifique o email digitado ou crie uma conta.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Enviar email de recuperação
      const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada e spam para redefinir sua senha. O link expira em 1 hora.",
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Email inválido",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        console.error('Error sending reset email:', error);
        toast({
          title: "Erro ao enviar email",
          description: error.message || "Ocorreu um erro ao enviar o email de recuperação. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-6">
            <img 
              src={logoHorizontal} 
              alt="Fenotypo" 
              className="h-16 mx-auto"
            />
            <div className="space-y-2">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Email Enviado!</h1>
              <p className="text-muted-foreground">
                Enviamos um link de recuperação para <strong>{email}</strong>.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-left">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                  Instruções importantes:
                </p>
                <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                  <li>• Verifique sua caixa de entrada <strong>e pasta de spam</strong></li>
                  <li>• O link expira em <strong>1 hora</strong></li>
                  <li>• Clique no link para criar uma nova senha</li>
                  <li>• Se não receber, tente reenviar</li>
                </ul>
              </div>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full"
                variant="default"
              >
                Voltar para o Login
              </Button>
              <Button 
                onClick={() => setEmailSent(false)} 
                variant="outline"
                className="w-full"
              >
                Enviar novamente
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-6">
          <img 
            src={logoHorizontal} 
            alt="Fenotypo" 
            className="h-16 mx-auto"
          />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Recuperar Senha</h1>
            <p className="text-muted-foreground">
              Insira seu email e enviaremos instruções para redefinir sua senha.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
          <div className="space-y-2">
            <Label htmlFor="email">Email cadastrado</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              disabled={loading}
              required
              autoComplete="email"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Digite o email que você usou para criar sua conta
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              'Enviar Link de Recuperação'
            )}
          </Button>

          <div className="text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para o login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
