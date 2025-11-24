import { Link, useNavigate } from "react-router-dom";
import { CircleUser, Settings, LogOut, BookOpenText, Shield } from "lucide-react";
import logo from "@/assets/logo-fenotypo-horiz-2.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useState } from "react";
import { ProfessorModal } from "@/components/ProfessorModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, logout } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [professorModalOpen, setProfessorModalOpen] = useState(false);

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
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setProfessorModalOpen(true)}
            >
              <BookOpenText className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sobre o Professor</span>
            </Button>

            {isAdmin && (
              <Button 
                variant="default" 
                size="sm"
                onClick={() => navigate("/admin")}
                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
              >
                <Shield className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Painel Admin</span>
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
