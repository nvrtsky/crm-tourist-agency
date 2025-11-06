import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { useState } from "react";
import type { Form as FormType, FormSubmission } from "@shared/schema";
import { format } from "date-fns";

interface FormWithFields extends FormType {
  fields: Array<{
    id: string;
    key: string;
    label: string;
    type: string;
  }>;
}

export default function FormSubmissions() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);

  const { data: formData, isLoading: formLoading } = useQuery<FormWithFields>({
    queryKey: [`/api/forms/${id}`],
    enabled: !!id,
  });

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<FormSubmission[]>({
    queryKey: [`/api/forms/${id}/submissions`],
    enabled: !!id,
  });

  const isLoading = formLoading || submissionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="p-6">
        <p>Форма не найдена</p>
      </div>
    );
  }

  const sortedSubmissions = [...submissions].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return (
    <div className="p-6 space-y-6" data-testid="page-form-submissions">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/forms")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{formData.name}</h1>
            <p className="text-muted-foreground mt-1">
              Отправки формы
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation(`/forms/${id}/builder`)}
          data-testid="button-builder"
        >
          Конструктор
        </Button>
      </div>

      {submissions.length === 0 ? (
        <Card data-testid="card-empty-state">
          <CardHeader>
            <CardTitle>Нет отправок</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Пока никто не отправил эту форму
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-submissions-table">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Данные (preview)</TableHead>
                  <TableHead>IP адрес</TableHead>
                  <TableHead>Лид</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedSubmissions.map((submission) => {
                  const data = submission.data as Record<string, unknown>;
                  const preview = Object.entries(data)
                    .slice(0, 2)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ");
                  
                  return (
                    <TableRow key={submission.id} data-testid={`row-submission-${submission.id}`}>
                      <TableCell className="font-medium">
                        {format(new Date(submission.submittedAt), "dd.MM.yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="max-w-md truncate text-muted-foreground">
                        {preview}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {submission.ipAddress || "—"}
                      </TableCell>
                      <TableCell>
                        {submission.leadId ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation("/leads")}
                            data-testid={`link-lead-${submission.leadId}`}
                          >
                            Просмотр
                          </Button>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setSelectedSubmission(submission)}
                          data-testid={`button-view-${submission.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Submission Details Dialog */}
      <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <DialogContent className="max-w-2xl" data-testid="dialog-submission-details">
          <DialogHeader>
            <DialogTitle>Детали отправки</DialogTitle>
            <DialogDescription>
              {selectedSubmission &&
                `Отправлено ${format(
                  new Date(selectedSubmission.submittedAt),
                  "dd.MM.yyyy в HH:mm"
                )}`}
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">IP адрес</p>
                  <p className="font-medium">{selectedSubmission.ipAddress || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">User Agent</p>
                  <p className="font-medium truncate" title={selectedSubmission.userAgent || ""}>
                    {selectedSubmission.userAgent || "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Данные формы</p>
                <div className="space-y-2 border rounded-lg p-4">
                  {Object.entries(selectedSubmission.data as Record<string, unknown>).map(
                    ([key, value]) => {
                      const field = formData.fields.find((f) => f.key === key);
                      return (
                        <div key={key} className="flex justify-between py-2 border-b last:border-0">
                          <span className="font-medium">{field?.label || key}:</span>
                          <span className="text-muted-foreground">
                            {typeof value === "boolean"
                              ? value
                                ? "Да"
                                : "Нет"
                              : String(value)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
              {selectedSubmission.leadId && (
                <div>
                  <Badge>Создан лид: {selectedSubmission.leadId}</Badge>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
