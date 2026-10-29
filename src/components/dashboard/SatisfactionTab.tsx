import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { SurveyAnswers } from "@/types/satisfaction";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ClipboardList, Plus, Pencil, Trash2, GripVertical, Star, MessageSquare, BarChart3, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SatisfactionQuestion {
  id: string;
  question_order: number;
  question_text: string;
  question_type: "scale" | "options" | "open";
  options: { min?: number; max?: number } | string[] | null;
  is_essential: boolean;
  active: boolean;
}

interface SatisfactionResponse {
  id: string;
  order_id: string;
  customer_id: string;
  barber_id: string | null;
  responses: SurveyAnswers;
  created_at: string;
  barber_name?: string | null;
  customer_name?: string;
}

export function SatisfactionTab() {
  const queryClient = useQueryClient();
  const [editingQuestion, setEditingQuestion] = useState<SatisfactionQuestion | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "scale" as "scale" | "options" | "open",
    options: "",
  });

  // Fetch settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["satisfaction-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("satisfaction_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch questions
  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ["satisfaction-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("satisfaction_questions")
        .select("*")
        .order("question_order");
      if (error) throw error;
      return data as SatisfactionQuestion[];
    },
  });

  // Fetch responses with related data
  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ["satisfaction-responses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("satisfaction_responses")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      
      // Fetch barber names separately
      const barberIds = [...new Set(data.map(r => r.barber_id).filter(Boolean))];
      let barberMap: Record<string, string> = {};
      if (barberIds.length > 0) {
        const { data: barbers } = await supabase
          .from("barbers")
          .select("id, name")
          .in("id", barberIds);
        barberMap = (barbers || []).reduce((acc, b) => ({ ...acc, [b.id]: b.name }), {});
      }

      // Fetch customer names from profiles
      const customerIds = [...new Set(data.map(r => r.customer_id).filter(Boolean))];
      let customerMap: Record<string, string> = {};
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", customerIds);
        customerMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.user_id]: p.full_name }), {});
      }
      
      return data.map(r => ({
        ...r,
        barber_name: r.barber_id ? barberMap[r.barber_id] : null,
        customer_name: customerMap[r.customer_id] || "Cliente"
      })) as SatisfactionResponse[];
    },
  });

  // Toggle enabled mutation
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from("satisfaction_settings")
        .update({ enabled })
        .eq("id", settings?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["satisfaction-settings"] });
      toast.success("Configuração atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar configuração"),
  });

  // Save question mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async (question: Partial<SatisfactionQuestion>) => {
      let optionsData: Json = null;
      if (questionForm.question_type === "scale") {
        optionsData = { min: 0, max: 10 };
      } else if (questionForm.question_type === "options" && questionForm.options) {
        optionsData = questionForm.options.split(",").map((o) => o.trim());
      }

      if (editingQuestion) {
        const { error } = await supabase
          .from("satisfaction_questions")
          .update({
            question_text: questionForm.question_text,
            question_type: questionForm.question_type,
            options: optionsData,
          })
          .eq("id", editingQuestion.id);
        if (error) throw error;
      } else {
        const maxOrder = questions.length > 0 ? Math.max(...questions.map((q) => q.question_order)) : 0;
        const { error } = await supabase.from("satisfaction_questions").insert({
          question_text: questionForm.question_text,
          question_type: questionForm.question_type,
          options: optionsData,
          question_order: maxOrder + 1,
          is_essential: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["satisfaction-questions"] });
      toast.success(editingQuestion ? "Pergunta atualizada!" : "Pergunta adicionada!");
      setIsDialogOpen(false);
      setEditingQuestion(null);
      setQuestionForm({ question_text: "", question_type: "scale", options: "" });
    },
    onError: () => toast.error("Erro ao salvar pergunta"),
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("satisfaction_questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["satisfaction-questions"] });
      toast.success("Pergunta excluída!");
    },
    onError: () => toast.error("Erro ao excluir pergunta"),
  });

  const handleEditQuestion = (question: SatisfactionQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text,
      question_type: question.question_type,
      options: Array.isArray(question.options) ? question.options.join(", ") : "",
    });
    setIsDialogOpen(true);
  };

  const handleNewQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({ question_text: "", question_type: "scale", options: "" });
    setIsDialogOpen(true);
  };

  // Calculate stats
  const avgExperience = responses.length > 0
    ? (responses.reduce((sum, r) => sum + (r.responses?.q1 || 0), 0) / responses.length).toFixed(1)
    : "0";
  const avgRecommendation = responses.length > 0
    ? (responses.reduce((sum, r) => sum + (r.responses?.q2 || 0), 0) / responses.length).toFixed(1)
    : "0";

  if (settingsLoading || questionsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Pesquisa de Satisfação
          </h2>
          <p className="text-muted-foreground">
            Configure o popup de feedback que aparece para clientes após atendimentos
          </p>
        </div>
      </div>

      {/* Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Ativar pesquisa de satisfação</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativado, clientes verão um popup de feedback ao acessar o site após um atendimento
              </p>
            </div>
            <Switch
              checked={settings?.enabled || false}
              onCheckedChange={(checked) => toggleMutation.mutate(checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Respostas</p>
                <p className="text-2xl font-bold">{responses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média Experiência</p>
                <p className="text-2xl font-bold">{avgExperience}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <MessageSquare className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">NPS (Recomendação)</p>
                <p className="text-2xl font-bold">{avgRecommendation}/10</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Perguntas da Pesquisa</CardTitle>
            <CardDescription>Gerencie as perguntas que serão exibidas aos clientes</CardDescription>
          </div>
          <Button onClick={handleNewQuestion} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Pergunta
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questions.map((question) => (
              <div
                key={question.id}
                className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  <span className="font-medium">{question.question_order}.</span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{question.question_text}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {question.question_type === "scale" && "Escala 0-10"}
                      {question.question_type === "options" && "Múltipla escolha"}
                      {question.question_type === "open" && "Resposta aberta"}
                    </Badge>
                    {question.is_essential && (
                      <Badge variant="outline" className="text-primary border-primary">
                        Essencial
                      </Badge>
                    )}
                  </div>
                  {question.question_type === "options" && Array.isArray(question.options) && (
                    <p className="text-sm text-muted-foreground">
                      Opções: {question.options.join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(question)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. A pergunta será removida permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteQuestionMutation.mutate(question.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Open Responses - Destacado */}
      {responses.filter(r => r.responses?.q5).length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Sugestões dos Clientes
            </CardTitle>
            <CardDescription>Respostas abertas com sugestões de melhoria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {responses
                .filter((r) => r.responses?.q5)
                .map((response) => (
                  <div
                    key={response.id}
                    className="p-4 bg-background border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{response.customer_name}</span>
                        {response.barber_name && (
                          <Badge variant="secondary" className="text-xs">
                            Barbeiro: {response.barber_name}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={Number(response.responses?.q1) >= 8 ? "default" : "destructive"}>
                        Experiência: {response.responses?.q1}/10
                      </Badge>
                      <Badge variant={Number(response.responses?.q2) >= 8 ? "default" : "destructive"}>
                        NPS: {response.responses?.q2}/10
                      </Badge>
                      <Badge variant="outline">{response.responses?.q3}</Badge>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm italic">"{response.responses.q5}"</p>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Responses */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Respostas</CardTitle>
          <CardDescription>Últimas 100 respostas recebidas</CardDescription>
        </CardHeader>
        <CardContent>
          {responsesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : responses.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma resposta recebida ainda
            </p>
          ) : (
            <div className="space-y-3">
              {responses.map((response) => (
                <div key={response.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{response.customer_name}</span>
                      <Badge variant={Number(response.responses?.q1) >= 8 ? "outline" : "destructive"}>
                        Experiência: {response.responses?.q1 || "-"}/10
                      </Badge>
                      <Badge variant={Number(response.responses?.q2) >= 8 ? "outline" : "destructive"}>
                        NPS: {response.responses?.q2 || "-"}/10
                      </Badge>
                      <Badge variant="secondary">
                        {response.responses?.q3 || "-"}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(response.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  {response.barber_name && (
                    <p className="text-sm text-muted-foreground">
                      Barbeiro: {response.barber_name}
                    </p>
                  )}
                  {response.responses?.q4 && (
                    <p className="text-sm">
                      <span className="text-muted-foreground">Mais curtiu:</span> {response.responses.q4}
                    </p>
                  )}
                  {response.responses?.q5 && (
                    <div className="p-2 bg-muted rounded mt-2">
                      <p className="text-sm">
                        <span className="text-muted-foreground font-medium">💬 Sugestão:</span>{" "}
                        <span className="italic">"{response.responses.q5}"</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingQuestion ? "Editar Pergunta" : "Nova Pergunta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Texto da Pergunta</Label>
              <Textarea
                value={questionForm.question_text}
                onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                placeholder="Digite a pergunta..."
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Resposta</Label>
              <Select
                value={questionForm.question_type}
                onValueChange={(value: "scale" | "options" | "open") =>
                  setQuestionForm({ ...questionForm, question_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scale">Escala 0-10</SelectItem>
                  <SelectItem value="options">Múltipla escolha</SelectItem>
                  <SelectItem value="open">Resposta aberta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {questionForm.question_type === "options" && (
              <div className="space-y-2">
                <Label>Opções (separadas por vírgula)</Label>
                <Input
                  value={questionForm.options}
                  onChange={(e) => setQuestionForm({ ...questionForm, options: e.target.value })}
                  placeholder="Ex: Excelente, Bom, Regular, Ruim"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => saveQuestionMutation.mutate({})}
              disabled={!questionForm.question_text || saveQuestionMutation.isPending}
            >
              {saveQuestionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
