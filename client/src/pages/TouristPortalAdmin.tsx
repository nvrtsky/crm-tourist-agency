import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckSquare, 
  Star, 
  BarChart3, 
  Users, 
  ExternalLink,
  Copy,
  Settings,
  ListChecks,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import type { 
  ChecklistTemplate, 
  ChecklistTemplateItem, 
  Review, 
  Event 
} from "@shared/schema";

type ChecklistTemplateWithItems = ChecklistTemplate & {
  items: ChecklistTemplateItem[];
};

type ReviewWithDetails = Review & {
  contact?: { name: string };
  event?: { name: string };
  guide?: { firstName: string; lastName: string };
};

export default function TouristPortalAdmin() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("checklists");
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplateWithItems | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    country: "",
    tourType: "",
    phase: "before" as "before" | "during" | "after",
    isActive: true,
    sortOrder: 0,
    items: [] as { text: string; description: string; isRequired: boolean; sortOrder: number }[],
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<ChecklistTemplateWithItems[]>({
    queryKey: ["/api/checklist-templates"],
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<ReviewWithDetails[]>({
    queryKey: ["/api/reviews"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: typeof newTemplate) => {
      const response = await apiRequest("POST", "/api/checklist-templates", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      setIsTemplateDialogOpen(false);
      setNewTemplate({
        name: "",
        country: "",
        tourType: "",
        phase: "before",
        isActive: true,
        sortOrder: 0,
        items: [],
      });
      toast({ title: "Шаблон создан" });
    },
    onError: () => {
      toast({ title: "Ошибка создания шаблона", variant: "destructive" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/checklist-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      toast({ title: "Шаблон удален" });
    },
  });

  const portalUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/portal` 
    : "/portal";

  const copyPortalLink = () => {
    navigator.clipboard.writeText(portalUrl);
    toast({ title: "Ссылка скопирована" });
  };

  const phaseLabels: Record<string, string> = {
    before: "До поездки",
    during: "Во время тура",
    after: "После возвращения",
  };

  const addNewItem = () => {
    setNewTemplate((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { text: "", description: "", isRequired: false, sortOrder: prev.items.length },
      ],
    }));
  };

  const updateItem = (index: number, field: string, value: string | boolean) => {
    setNewTemplate((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const removeItem = (index: number) => {
    setNewTemplate((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const calculateNPS = () => {
    const npsReviews = reviews.filter((r) => r.type === "overall");
    if (npsReviews.length === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0 };

    const promoters = npsReviews.filter((r) => r.rating >= 9).length;
    const passives = npsReviews.filter((r) => r.rating >= 7 && r.rating <= 8).length;
    const detractors = npsReviews.filter((r) => r.rating <= 6).length;
    const total = npsReviews.length;

    return {
      score: Math.round(((promoters - detractors) / total) * 100),
      promoters: Math.round((promoters / total) * 100),
      passives: Math.round((passives / total) * 100),
      detractors: Math.round((detractors / total) * 100),
    };
  };

  const nps = calculateNPS();

  const getAverageRating = (type: string) => {
    const typeReviews = reviews.filter((r) => r.type === type);
    if (typeReviews.length === 0) return 0;
    return (typeReviews.reduce((sum, r) => sum + r.rating, 0) / typeReviews.length).toFixed(1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Личный кабинет туриста</h1>
          <p className="text-muted-foreground">Управление чек-листами, отзывами и аналитикой</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={copyPortalLink} data-testid="button-copy-portal-link">
            <Copy className="h-4 w-4 mr-2" />
            Скопировать ссылку
          </Button>
          <Button variant="outline" asChild data-testid="button-open-portal">
            <a href="/portal" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Открыть портал
            </a>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checklists" className="flex items-center gap-2" data-testid="tab-checklists">
            <ListChecks className="h-4 w-4" />
            Чек-листы
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex items-center gap-2" data-testid="tab-reviews">
            <MessageSquare className="h-4 w-4" />
            Отзывы
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2" data-testid="tab-analytics">
            <BarChart3 className="h-4 w-4" />
            Аналитика NPS
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checklists" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Шаблоны чек-листов</h2>
            <Button onClick={() => setIsTemplateDialogOpen(true)} data-testid="button-add-template">
              <Plus className="h-4 w-4 mr-2" />
              Добавить шаблон
            </Button>
          </div>

          {templatesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Шаблоны чек-листов не созданы</p>
                <p className="text-sm">Создайте первый шаблон для автоматической подстановки туристам</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {["before", "during", "after"].map((phase) => {
                const phaseTemplates = templates.filter((t) => t.phase === phase);
                if (phaseTemplates.length === 0) return null;

                return (
                  <div key={phase} className="space-y-2">
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      {phaseLabels[phase]}
                    </h3>
                    <div className="grid gap-3">
                      {phaseTemplates.map((template) => (
                        <Card key={template.id} data-testid={`card-template-${template.id}`}>
                          <CardHeader className="py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <CardTitle className="text-base">{template.name}</CardTitle>
                                <div className="flex gap-2">
                                  {template.country && (
                                    <Badge variant="secondary">{template.country}</Badge>
                                  )}
                                  {template.tourType && (
                                    <Badge variant="outline">{template.tourType}</Badge>
                                  )}
                                  {!template.isActive && (
                                    <Badge variant="destructive">Неактивен</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {template.items?.length || 0} пунктов
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteTemplateMutation.mutate(template.id)}
                                  data-testid={`button-delete-template-${template.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {template.items && template.items.length > 0 && (
                            <CardContent className="py-2 border-t">
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {template.items.slice(0, 3).map((item, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <CheckSquare className="h-3 w-3" />
                                    {item.text}
                                    {item.isRequired && (
                                      <span className="text-destructive">*</span>
                                    )}
                                  </li>
                                ))}
                                {template.items.length > 3 && (
                                  <li className="text-xs">
                                    ...и ещё {template.items.length - 3}
                                  </li>
                                )}
                              </ul>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <h2 className="text-lg font-semibold">Отзывы туристов</h2>

          {reviewsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Отзывов пока нет</p>
                <p className="text-sm">Отзывы появятся после того, как туристы оставят их в Личном кабинете</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} data-testid={`card-review-${review.id}`}>
                  <CardHeader className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`h-4 w-4 ${
                                i < (review.type === "overall" ? review.rating / 2 : review.rating)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-muted-foreground"
                              }`}
                            />
                          ))}
                        </div>
                        <Badge variant="outline">
                          {review.type === "overall"
                            ? "NPS"
                            : review.type === "tour"
                            ? "Тур"
                            : review.type === "guide"
                            ? "Гид"
                            : review.type === "hotel"
                            ? "Отель"
                            : "Транспорт"}
                        </Badge>
                        {review.type === "overall" && (
                          <Badge
                            variant={
                              review.rating >= 9
                                ? "default"
                                : review.rating >= 7
                                ? "secondary"
                                : "destructive"
                            }
                          >
                            {review.rating}/10
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {review.contact?.name || "Турист"}
                        {review.event?.name && ` • ${review.event.name}`}
                      </div>
                    </div>
                  </CardHeader>
                  {review.comment && (
                    <CardContent className="py-2 border-t">
                      <p className="text-sm">{review.comment}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <h2 className="text-lg font-semibold">Аналитика NPS и отзывов</h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>NPS Score</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {nps.score}
                  {nps.score > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : nps.score < 0 ? (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  ) : (
                    <Minus className="h-5 w-5 text-muted-foreground" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600">{nps.promoters}% промоутеры</span>
                  <span className="text-muted-foreground">{nps.passives}% нейтральные</span>
                  <span className="text-destructive">{nps.detractors}% критики</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Средняя оценка тура</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {getAverageRating("tour")}
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {reviews.filter((r) => r.type === "tour").length} отзывов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Средняя оценка гидов</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {getAverageRating("guide")}
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {reviews.filter((r) => r.type === "guide").length} отзывов
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Средняя оценка отелей</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  {getAverageRating("hotel")}
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {reviews.filter((r) => r.type === "hotel").length} отзывов
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Слабые места</CardTitle>
              <CardDescription>Отзывы с низкими оценками требуют внимания</CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.filter((r) => r.rating <= 3 || (r.type === "overall" && r.rating <= 6)).length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  Низких оценок не обнаружено
                </p>
              ) : (
                <div className="space-y-3">
                  {reviews
                    .filter((r) => r.rating <= 3 || (r.type === "overall" && r.rating <= 6))
                    .slice(0, 5)
                    .map((review) => (
                      <div
                        key={review.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                      >
                        <Badge variant="destructive">{review.rating}</Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {review.type === "tour"
                              ? "Тур"
                              : review.type === "guide"
                              ? "Гид"
                              : review.type === "hotel"
                              ? "Отель"
                              : review.type === "overall"
                              ? "NPS"
                              : "Транспорт"}
                            {review.event?.name && ` — ${review.event.name}`}
                          </p>
                          {review.comment && (
                            <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Новый шаблон чек-листа</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Название шаблона *</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: Подготовка к туру в Китай"
                  data-testid="input-template-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Фаза *</Label>
                <Select
                  value={newTemplate.phase}
                  onValueChange={(value) =>
                    setNewTemplate((prev) => ({ ...prev, phase: value as any }))
                  }
                >
                  <SelectTrigger data-testid="select-template-phase">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">До поездки</SelectItem>
                    <SelectItem value="during">Во время тура</SelectItem>
                    <SelectItem value="after">После возвращения</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Страна (опционально)</Label>
                <Select
                  value={newTemplate.country || "all"}
                  onValueChange={(value) =>
                    setNewTemplate((prev) => ({ ...prev, country: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger data-testid="select-template-country">
                    <SelectValue placeholder="Все страны" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все страны</SelectItem>
                    <SelectItem value="Китай">Китай</SelectItem>
                    <SelectItem value="Марокко">Марокко</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Тип тура (опционально)</Label>
                <Select
                  value={newTemplate.tourType || "all"}
                  onValueChange={(value) =>
                    setNewTemplate((prev) => ({ ...prev, tourType: value === "all" ? "" : value }))
                  }
                >
                  <SelectTrigger data-testid="select-template-tourType">
                    <SelectValue placeholder="Все типы" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="group">Групповой</SelectItem>
                    <SelectItem value="individual">Индивидуальный</SelectItem>
                    <SelectItem value="excursion">Экскурсия</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Пункты чек-листа</Label>
                <Button variant="outline" size="sm" onClick={addNewItem} data-testid="button-add-item">
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить пункт
                </Button>
              </div>

              {newTemplate.items.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg border-dashed">
                  Добавьте пункты чек-листа
                </div>
              ) : (
                <div className="space-y-3">
                  {newTemplate.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                      <div className="flex-1 space-y-2">
                        <Input
                          value={item.text}
                          onChange={(e) => updateItem(index, "text", e.target.value)}
                          placeholder="Текст пункта"
                          data-testid={`input-item-text-${index}`}
                        />
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, "description", e.target.value)}
                          placeholder="Описание (опционально)"
                          className="text-sm"
                          data-testid={`input-item-description-${index}`}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={item.isRequired}
                            onCheckedChange={(checked) =>
                              updateItem(index, "isRequired", checked as boolean)
                            }
                            data-testid={`checkbox-item-required-${index}`}
                          />
                          <span className="text-xs">Обяз.</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(index)}
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
              Отмена
            </Button>
            <Button
              onClick={() => createTemplateMutation.mutate(newTemplate)}
              disabled={!newTemplate.name || createTemplateMutation.isPending}
              data-testid="button-save-template"
            >
              {createTemplateMutation.isPending ? "Сохранение..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
