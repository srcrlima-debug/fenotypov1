import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft, Search } from "lucide-react";
import { Header } from "@/components/Header";

const Error404 = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Header />
      
      <div className="container max-w-2xl py-16 px-4 animate-fade-in">
        <Card className="text-center">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                <Search className="w-12 h-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-4xl">Página Não Encontrada</CardTitle>
            <CardDescription className="text-lg">
              A página que você está procurando não existe ou foi movida.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="text-8xl font-bold text-muted-foreground/20">404</div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
              <Button 
                onClick={() => navigate(-1)}
                variant="outline"
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Button>
              
              <Button 
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Ir para Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Error404;
