import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SatisfactionQuestion {
  id: string;
  question_order: number;
  question_text: string;
  question_type: "scale" | "options" | "open";
  options: { min?: number; max?: number } | string[] | null;
}

interface LastOrder {
  id: string;
  scheduled_at: string;
  barber_id: string | null;
  barber_name?: string | null;
}

interface SatisfactionPopupProps {
  userId: string;
}

export function SatisfactionPopup({ userId }: SatisfactionPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if survey is enabled
  const { data: settings } = useQuery({
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

  // Get last completed order
  const { data: lastOrder } = useQuery({
    queryKey: ["last-completed-order", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, scheduled_at, barber_id")
        .eq("customer_id", userId)
        .eq("status", "completed")
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      
      // Fetch barber name separately
      let barberName: string | null = null;
      if (data.barber_id) {
        const { data: barber } = await supabase
          .from("barbers")
          .select("name")
          .eq("id", data.barber_id)
          .maybeSingle();
        barberName = barber?.name || null;
      }
      
      return { ...data, barber_name: barberName } as LastOrder;
    },
    enabled: !!userId && settings?.enabled,
  });

  // Check if already responded for this order
  const { data: existingResponse } = useQuery({
    queryKey: ["satisfaction-response-check", lastOrder?.id],
    queryFn: async () => {
      if (!lastOrder?.id) return null;
      const { data, error } = await supabase
        .from("satisfaction_responses")
        .select("id")
        .eq("order_id", lastOrder.id)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!lastOrder?.id,
  });

  // Get questions
  const { data: questions = [] } = useQuery({
    queryKey: ["satisfaction-questions-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("satisfaction_questions")
        .select("*")
        .eq("active", true)
        .order("question_order");
      if (error) throw error;
      return data as SatisfactionQuestion[];
    },
    enabled: settings?.enabled && !!lastOrder && !existingResponse,
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("satisfaction_responses").insert({
        order_id: lastOrder!.id,
        customer_id: userId,
        barber_id: lastOrder!.barber_id,
        responses: answers,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setIsCompleted(true);
      setTimeout(() => setIsOpen(false), 3000);
    },
  });

  // Show popup if conditions are met
  useEffect(() => {
    if (settings?.enabled && lastOrder && !existingResponse && questions.length > 0) {
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [settings?.enabled, lastOrder, existingResponse, questions.length]);

  const currentQuestion = questions[currentStep];
  const totalSteps = questions.length;

  // Check if question 5 should show (only if score <= 8 in q1 or q2)
  const shouldShowQ5 = () => {
    if (currentQuestion?.question_order === 5) {
      return (answers.q1 !== undefined && answers.q1 <= 8) || 
             (answers.q2 !== undefined && answers.q2 <= 8);
    }
    return true;
  };

  const handleAnswer = (value: any) => {
    const key = `q${currentQuestion.question_order}`;
    setAnswers({ ...answers, [key]: value });
  };

  const handleNext = () => {
    let nextStep = currentStep + 1;
    
    // Skip question 5 if scores are high
    if (questions[nextStep]?.question_order === 5) {
      const q1Score = answers.q1;
      const q2Score = answers.q2;
      if ((q1Score === undefined || q1Score > 8) && (q2Score === undefined || q2Score > 8)) {
        nextStep++;
      }
    }

    if (nextStep >= totalSteps) {
      submitMutation.mutate();
    } else {
      setCurrentStep(nextStep);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  if (!isOpen || isCompleted) {
    if (isCompleted && isOpen) {
      return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <p className="text-xl font-medium">
                Valeu pelo feedback! Isso ajuda muito a gente a melhorar 🙌
              </p>
            </div>
          </DialogContent>
        </Dialog>
      );
    }
    return null;
  }

  if (!currentQuestion) return null;

  const barberName = lastOrder?.barber_name || "nosso barbeiro";
  const orderDate = lastOrder?.scheduled_at 
    ? format(new Date(lastOrder.scheduled_at), "dd 'de' MMMM", { locale: ptBR })
    : "sua última visita";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              É rapidinho, leva menos de 30 segundos 😉
            </p>
            <DialogTitle className="text-lg">
              E aí, como foi com {barberName} no dia {orderDate}?
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Progress */}
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  idx <= currentStep ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Question */}
          <div className="space-y-4">
            <p className="text-center font-medium">{currentQuestion.question_text}</p>

            {/* Scale type */}
            {currentQuestion.question_type === "scale" && (
              <div className="grid grid-cols-11 gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    className={cn(
                      "aspect-square rounded-lg border text-sm font-medium transition-all",
                      answers[`q${currentQuestion.question_order}`] === i
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted border-border"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
            )}

            {/* Options type */}
            {currentQuestion.question_type === "options" && Array.isArray(currentQuestion.options) && (
              <div className="grid grid-cols-2 gap-2">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={cn(
                      "p-3 rounded-lg border text-sm font-medium transition-all text-center",
                      answers[`q${currentQuestion.question_order}`] === option
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 hover:bg-muted border-border"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Open type */}
            {currentQuestion.question_type === "open" && (
              <Textarea
                value={answers[`q${currentQuestion.question_order}`] || ""}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder="Conta pra gente... (opcional)"
                className="min-h-[100px]"
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {currentQuestion.question_type === "open" && (
              <Button variant="outline" className="flex-1" onClick={handleSkip}>
                Pular
              </Button>
            )}
            <Button
              className="flex-1"
              onClick={handleNext}
              disabled={
                currentQuestion.question_type !== "open" &&
                answers[`q${currentQuestion.question_order}`] === undefined
              }
            >
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : currentStep === totalSteps - 1 || 
                (questions[currentStep + 1]?.question_order === 5 && 
                  (answers.q1 === undefined || answers.q1 > 8) && 
                  (answers.q2 === undefined || answers.q2 > 8)) ? (
                "Enviar"
              ) : (
                "Próxima"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
