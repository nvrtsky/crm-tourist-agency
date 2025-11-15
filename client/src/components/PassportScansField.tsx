import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface PassportScansFieldProps {
  touristId: string;
  initialScans?: string[];
  onUpdate?: (scans: string[]) => void;
}

export function PassportScansField({
  touristId,
  initialScans = [],
  onUpdate,
}: PassportScansFieldProps) {
  const [scans, setScans] = useState<string[]>(initialScans);
  const [uploading, setUploading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Upload each file
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`/api/tourists/${touristId}/passport-scans`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const data = await response.json();
        
        if (data.tourist && data.tourist.passportScans) {
          setScans(data.tourist.passportScans);
          onUpdate?.(data.tourist.passportScans);
        }
      }

      toast({
        title: "Файлы загружены",
        description: `Загружено файлов: ${files.length}`,
      });

      // Invalidate tourist cache
      queryClient.invalidateQueries({ queryKey: [`/api/tourists/${touristId}`] });
    } catch (error) {
      console.error("Error uploading files:", error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файлы",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileUrl: string) => {
    const filename = fileUrl.split('/').pop();
    if (!filename) return;

    setDeletingFile(filename);

    try {
      const response = await fetch(`/api/tourists/${touristId}/passport-scans/${filename}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      const data = await response.json();

      if (data.tourist && data.tourist.passportScans) {
        setScans(data.tourist.passportScans);
        onUpdate?.(data.tourist.passportScans);
      }

      toast({
        title: "Файл удален",
      });

      // Invalidate tourist cache
      queryClient.invalidateQueries({ queryKey: [`/api/tourists/${touristId}`] });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Ошибка удаления",
        description: "Не удалось удалить файл",
        variant: "destructive",
      });
    } finally {
      setDeletingFile(null);
    }
  };

  const handleView = async (fileUrl: string) => {
    try {
      const filename = fileUrl.split('/').pop();
      if (!filename) return;

      const response = await fetch(`/api/tourists/${touristId}/passport-scans/${filename}/view`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('View failed');
      }

      const data = await response.json();

      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error("Error viewing file:", error);
      toast({
        title: "Ошибка просмотра",
        description: "Не удалось открыть файл",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileUrl: string) => {
    const ext = fileUrl.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <ImageIcon className="h-8 w-8 text-blue-500" />;
  };

  const getFileName = (fileUrl: string) => {
    return fileUrl.split('/').pop() || 'файл';
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        data-testid="file-input-passport-scans"
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        data-testid="button-upload-passport-scan"
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Загрузка...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            Загрузить скан паспорта
          </>
        )}
      </Button>

      {scans.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Загружено файлов: {scans.length}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {scans.map((scan, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-md bg-card"
                data-testid={`scan-item-${index}`}
              >
                {getFileIcon(scan)}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleView(scan)}
                    className="text-sm font-medium hover:underline text-left truncate block w-full"
                  >
                    {getFileName(scan)}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(scan)}
                  disabled={deletingFile === getFileName(scan)}
                  data-testid={`button-delete-scan-${index}`}
                  className="hover-elevate active-elevate-2"
                >
                  {deletingFile === getFileName(scan) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
