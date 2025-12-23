import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plane, Mail, Phone, ArrowRight, RefreshCw } from "lucide-react";
import logoLight from "@assets/logo_1762426754494.png";

export default function TouristLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"contact" | "verify">("contact");
  const [contactMethod, setContactMethod] = useState<"email" | "phone">("email");
  const [contactValue, setContactValue] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [sessionToken, setSessionToken] = useState("");

  const requestCodeMutation = useMutation({
    mutationFn: async (data: { type: "email" | "phone"; value: string }) => {
      const response = await apiRequest("POST", "/api/portal/auth/request-code", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      setSessionToken(data.token);
      setStep("verify");
      toast({
        title: "Код отправлен",
        description: contactMethod === "email" 
          ? "Проверьте вашу почту" 
          : "Проверьте SMS",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Контакт не найден в системе",
        variant: "destructive",
      });
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: { token: string; code: string }) => {
      const response = await apiRequest("POST", "/api/portal/auth/verify-code", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      localStorage.setItem("touristToken", data.token);
      toast({ title: "Вход выполнен успешно" });
      setLocation("/portal/dashboard");
    },
    onError: () => {
      toast({
        title: "Неверный код",
        description: "Проверьте код и попробуйте снова",
        variant: "destructive",
      });
    },
  });

  const handleRequestCode = () => {
    if (!contactValue.trim()) {
      toast({ title: "Введите контактные данные", variant: "destructive" });
      return;
    }
    requestCodeMutation.mutate({ type: contactMethod, value: contactValue.trim() });
  };

  const handleVerifyCode = () => {
    if (!verificationCode.trim()) {
      toast({ title: "Введите код", variant: "destructive" });
      return;
    }
    verifyCodeMutation.mutate({ token: sessionToken, code: verificationCode.trim() });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            <img src={logoLight} alt="Logo" className="h-12 mx-auto" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl">Личный кабинет туриста</CardTitle>
            <CardDescription>
              {step === "contact"
                ? "Введите email или телефон для входа"
                : "Введите код подтверждения"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === "contact" ? (
            <>
              <div className="flex gap-2">
                <Button
                  variant={contactMethod === "email" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setContactMethod("email")}
                  data-testid="button-method-email"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button
                  variant={contactMethod === "phone" ? "default" : "outline"}
                  className="flex-1"
                  onClick={() => setContactMethod("phone")}
                  data-testid="button-method-phone"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Телефон
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">
                  {contactMethod === "email" ? "Email адрес" : "Номер телефона"}
                </Label>
                <Input
                  id="contact"
                  type={contactMethod === "email" ? "email" : "tel"}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={
                    contactMethod === "email"
                      ? "example@email.com"
                      : "+7 (999) 123-45-67"
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleRequestCode()}
                  data-testid="input-contact"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleRequestCode}
                disabled={requestCodeMutation.isPending}
                data-testid="button-request-code"
              >
                {requestCodeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Отправка...
                  </>
                ) : (
                  <>
                    Получить код
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="text-center text-sm text-muted-foreground">
                Код отправлен на{" "}
                <span className="font-medium text-foreground">{contactValue}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Код подтверждения</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyCode()}
                  data-testid="input-verification-code"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleVerifyCode}
                disabled={verifyCodeMutation.isPending}
                data-testid="button-verify-code"
              >
                {verifyCodeMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Проверка...
                  </>
                ) : (
                  <>
                    Войти
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep("contact");
                  setVerificationCode("");
                }}
                data-testid="button-back"
              >
                Изменить контакт
              </Button>
            </>
          )}

          <div className="text-center text-xs text-muted-foreground">
            <Plane className="h-4 w-4 inline-block mr-1" />
            Ваши данные в безопасности
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
