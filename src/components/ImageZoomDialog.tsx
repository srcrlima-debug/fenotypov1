import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ZoomIn } from "lucide-react";

interface ImageZoomDialogProps {
  imageUrl: string;
  altText: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageZoomDialog = ({ imageUrl, altText, isOpen, onOpenChange }: ImageZoomDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
        <div className="relative w-full h-full overflow-auto">
          <img
            src={imageUrl}
            alt={altText}
            className="w-full h-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface ImageThumbnailProps {
  fotoId: number;
  onClick: () => void;
  className?: string;
}

export const ImageThumbnail = ({ fotoId, onClick, className = "" }: ImageThumbnailProps) => {
  const imageUrl = `/images/foto-${fotoId}.jpg`;
  
  return (
    <div className={`relative group cursor-pointer ${className}`} onClick={onClick}>
      <img
        src={imageUrl}
        alt={`Foto ${fotoId}`}
        className="w-12 h-12 object-cover rounded border border-border hover:border-primary transition-all"
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
        <ZoomIn className="w-4 h-4 text-white" />
      </div>
    </div>
  );
};
