import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Header } from "@/components/Header";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
          <Header />
          
          <div className="container max-w-2xl py-16 px-4 animate-fade-in">
            <Card className="text-center">
              <CardHeader className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-12 h-12 text-destructive" />
                  </div>
                </div>
                <CardTitle className="text-4xl">Algo deu errado</CardTitle>
                <CardDescription className="text-lg">
                  Ocorreu um erro inesperado. Tente recarregar a página.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="p-4 bg-destructive/10 rounded-lg text-left">
                    <p className="text-sm font-mono text-destructive break-all">
                      {this.state.error.message}
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
                  <Button 
                    onClick={this.handleReload}
                    variant="outline"
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Recarregar
                  </Button>
                  
                  <Button 
                    onClick={this.handleGoHome}
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
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
