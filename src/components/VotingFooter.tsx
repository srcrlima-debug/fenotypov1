import fistIcon from "@/assets/fist-icon.png";

export const VotingFooter = () => {
  return (
    <footer className="border-t border-border bg-background/80 backdrop-blur-sm py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Feito pelo Prof. Cristhian Lima
            </span>
            <img 
              src={fistIcon} 
              alt="Punho cerrado" 
              className="w-5 h-5"
            />
          </div>
          <p className="text-sm font-medium text-foreground">
            Compromisso Antirracista 2025
          </p>
        </div>
      </div>
    </footer>
  );
};
