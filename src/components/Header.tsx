import { Link, useNavigate } from "react-router-dom";
import { CircleUser, Settings, LogOut, BookOpenText, Shield, Menu } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";

export const Header = () => {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [professorModalOpen, setProfessorModalOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
      <header className={`sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-all duration-300 ${
        isScrolled ? "shadow-md" : ""
      }`}>
        <div className={`container flex items-center justify-between px-4 transition-all duration-300 ${
          isScrolled ? "h-14" : "h-16"
        }`}>
          <Link to="/" className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <img 
              src={logo} 
              alt="Fenotypo Logo" 
              className={`transition-all duration-300 ${
                isScrolled ? "h-8" : "h-10"
              }`} 
            />
          </Link>

          <nav className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="sm:hidden">
                <Button variant="ghost" size="sm" className="relative">
                  <Menu className="h-5 w-5" />
                  {hasNotifications && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full animate-pulse" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-amber-900 hover:bg-amber-800 text-white border-amber-800 hover:border-amber-700"
                    onClick={() => {
                      setProfessorModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <BookOpenText className="mr-2 h-4 w-4" />
                    Sobre o Professor
                  </Button>

                  {isAdmin && (
                    <Button
                      variant="outline"
                      className={`w-full justify-start ${
                        hasNotifications ? "animate-pulse" : ""
                      }`}
                      onClick={() => {
                        navigate("/admin/trainings");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <Shield className="mr-2 h-4 w-4" />
                      Painel Admin
                      {hasNotifications && (
                        <span className="ml-auto h-2 w-2 bg-destructive rounded-full" />
                      )}
                    </Button>
                  )}

                  {!user && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <CircleUser className="mr-2 h-4 w-4" />
                      Admin
                    </Button>
                  )}

                  {user && (
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Desktop Menu */}
            <div className="hidden sm:flex items-center gap-2">
              <Button 
                variant="default" 
                size="sm"
                onClick={() => setProfessorModalOpen(true)}
                className="bg-amber-900 hover:bg-amber-800 text-white border border-amber-800 hover:border-amber-700 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
              >
                <BookOpenText className="mr-2 h-4 w-4" />
                Sobre o Professor
              </Button>

              {isAdmin && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate("/admin/trainings")}
                  className={`bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95 ${
                    hasNotifications ? "animate-pulse" : ""
                  }`}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Painel Admin
                </Button>
              )}

              {!user && (
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate("/login")}
                >
                  <CircleUser className="mr-2 h-4 w-4" />
                  Admin
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
            </div>
          </nav>
        </div>
      </header>

      <ProfessorModal open={professorModalOpen} onOpenChange={setProfessorModalOpen} />
    </>
  );
};
