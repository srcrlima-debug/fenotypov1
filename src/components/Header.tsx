import { Link, useNavigate } from "react-router-dom";
import { CircleUser, Settings, LogOut, BookOpenText, Shield } from "lucide-react";
import logo from "@/assets/logo-fenotypo-horiz-2.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useState, useEffect } from "react";
import { ProfessorModal } from "@/components/ProfessorModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [professorModalOpen, setProfessorModalOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;

    const checkNotifications = async () => {
      // Verificar se há sessões ativas ou treinamentos pendentes
      const { data: activeSessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("session_status", "active")
        .limit(1);

      setHasNotifications(!!activeSessions && activeSessions.length > 0);
    };

    checkNotifications();

    // Verificar notificações em tempo real
    const channel = supabase
      .channel("admin-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
        },
        () => {
          checkNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <img 
              src={logo} 
              alt="Fenotypo Logo" 
              className="h-10 transition-all" 
            />
          </Link>

          <nav className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setProfessorModalOpen(true)}
                    className="bg-amber-900 hover:bg-amber-800 text-white border border-amber-800 hover:border-amber-700 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 w-10 h-10 p-0 sm:w-auto sm:h-9 sm:px-3 justify-center sm:justify-start"
                  >
                    <BookOpenText className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sobre o Professor</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="sm:hidden">
                  <p>Sobre o Professor</p>
                </TooltipContent>
              </Tooltip>

              {isAdmin && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => navigate("/admin")}
                      className={`bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 w-10 h-10 p-0 sm:w-auto sm:h-9 sm:px-3 justify-center sm:justify-start ${
                        hasNotifications ? "animate-pulse" : ""
                      }`}
                    >
                      <Shield className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Painel Admin</span>
                      {hasNotifications && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-pulse sm:hidden" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="sm:hidden">
                    <p>Painel Admin{hasNotifications ? " (Sessões ativas)" : ""}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>

            {!user && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/login")}
              >
                <CircleUser className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </Button>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <CircleUser className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </nav>
        </div>
      </header>

      <ProfessorModal open={professorModalOpen} onOpenChange={setProfessorModalOpen} />
    </>
  );
};
