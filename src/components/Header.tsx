import { Link } from "react-router-dom";
import { User, Settings, LogOut, BookOpen } from "lucide-react";
import logo from "@/assets/logo-fenotypo-horiz-2.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { useNavigate } from "react-router-dom";
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
              <BookOpen className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Sobre o Professor</span>
            </Button>

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
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
