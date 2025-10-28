import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2 } from "lucide-react";
import TouristCard from "@/components/TouristCard";
import TouristForm from "@/components/TouristForm";
import { useBitrix24 } from "@/hooks/useBitrix24";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TouristWithVisits } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Tourists() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTourist, setEditingTourist] = useState<TouristWithVisits | null>(null);
  const { entityId, entityTypeId } = useBitrix24();
  const { toast } = useToast();

  // Debug logging
  console.log("🔍 Tourists - entityId:", entityId, "enabled:", !!entityId);

  // Fetch tourists for current entity
  const { data: tourists, isLoading, error } = useQuery<TouristWithVisits[]>({
    queryKey: ["/api/tourists", entityId],
    enabled: !!entityId,
  });

  console.log("🔍 Tourists - tourists query:", { tourists, isLoading, error, entityId });

  // Create tourist mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/tourists`, {
        ...data,
        entityId,
        entityTypeId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      setIsDialogOpen(false);
      toast({
        title: "Турист добавлен",
        description: "Турист успешно добавлен в систему и привязан к событию",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить туриста",
        variant: "destructive",
      });
      console.error("Error creating tourist:", error);
    },
  });

  // Update tourist mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest("PATCH", `/api/tourists/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      setEditingTourist(null);
      toast({
        title: "Турист обновлен",
        description: "Информация о туристе успешно обновлена",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить туриста",
        variant: "destructive",
      });
      console.error("Error updating tourist:", error);
    },
  });

  // Delete tourist mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tourists/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tourists", entityId] });
      toast({
        title: "Турист удален",
        description: "Турист удален из системы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить туриста",
        variant: "destructive",
      });
      console.error("Error deleting tourist:", error);
    },
  });

  const filteredTourists = tourists?.filter((tourist) =>
    tourist.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleSubmit = (data: any) => {
    if (editingTourist) {
      updateMutation.mutate({ id: editingTourist.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Удалить туриста ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
        <div className="min-w-0 flex-1 sm:flex-none">
          <h1 className="text-2xl sm:text-3xl font-bold truncate" data-testid="text-page-title">
            Туристы
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Управление списком туристов и их маршрутами
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-tourist" size="sm" className="sm:size-default">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Добавить туриста</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый турист</DialogTitle>
            </DialogHeader>
            <TouristForm
              onSubmit={handleSubmit}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск туристов по имени..."
          className="pl-10"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-tourists"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredTourists.map((tourist) => (
          <TouristCard
            key={tourist.id}
            tourist={tourist}
            onEdit={() => setEditingTourist(tourist)}
            onDelete={() => handleDelete(tourist.id, tourist.name)}
          />
        ))}
      </div>

      {filteredTourists.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "Туристы не найдены" : "Нет добавленных туристов"}
          </p>
          {!searchQuery && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить первого туриста
            </Button>
          )}
        </div>
      )}

      <Dialog open={!!editingTourist} onOpenChange={(open) => !open && setEditingTourist(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать туриста</DialogTitle>
          </DialogHeader>
          <TouristForm
            initialTourist={editingTourist}
            onSubmit={handleSubmit}
            onCancel={() => setEditingTourist(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
