import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ExtractedData {
  produto: string;
  marca: string;
  partNumber: string;
  custo: string;
  estoque: string;
  fornecedor: string;
  uf: string;
}

interface ImageUploadProps {
  onExtracted: (data: ExtractedData) => void;
}

export function ImageUpload({ onExtracted }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const processImage = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPreview(base64);

      const { data, error } = await supabase.functions.invoke("analyze-image", {
        body: { image: base64 },
      });

      if (error) throw error;

      onExtracted(data as ExtractedData);
      toast({
        title: "Imagem processada!",
        description: "Os campos foram preenchidos automaticamente.",
      });
    } catch (err: any) {
      console.error("Error processing image:", err);
      toast({
        title: "Erro ao processar imagem",
        description: err?.message || "Verifique se a API key está configurada.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [onExtracted, toast]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Arquivo inválido", description: "Envie apenas imagens.", variant: "destructive" });
      return;
    }
    processImage(file);
  }, [processImage, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  useEffect(() => {
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFile(file);
          return;
        }
      }
    };
    document.addEventListener("paste", handler);
    return () => document.removeEventListener("paste", handler);
  }, [handleFile]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-apple-separator hover:border-muted-foreground bg-card",
          isProcessing && "pointer-events-none opacity-70"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analisando imagem com IA...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-2xl bg-muted p-4 transition-transform duration-200 hover:scale-105">
              <Upload className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Arraste uma imagem, clique ou cole com Ctrl+V</p>
              <p className="text-xs text-apple-placeholder mt-1">Print de tela do portal do distribuidor</p>
            </div>
          </div>
        )}
      </div>

      {preview && (
        <div className="relative inline-block animate-fade-in-up">
          <img src={preview} alt="Preview" className="max-h-40 rounded-2xl shadow-lg" />
          <button
            onClick={(e) => { e.stopPropagation(); setPreview(null); }}
            className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
