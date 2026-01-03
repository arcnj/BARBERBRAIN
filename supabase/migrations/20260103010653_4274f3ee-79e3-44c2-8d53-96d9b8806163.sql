
-- Tabela de configurações da pesquisa de satisfação
CREATE TABLE public.satisfaction_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO public.satisfaction_settings (enabled) VALUES (false);

-- Tabela de perguntas da pesquisa
CREATE TABLE public.satisfaction_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_order integer NOT NULL,
  question_text text NOT NULL,
  question_type text NOT NULL CHECK (question_type IN ('scale', 'options', 'open')),
  options jsonb,
  is_essential boolean DEFAULT true,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Inserir as 5 perguntas padrão
INSERT INTO public.satisfaction_questions (question_order, question_text, question_type, options, is_essential) VALUES
(1, 'Pensando na última vez que você cortou com a gente, de 0 a 10, como foi sua experiência?', 'scale', '{"min": 0, "max": 10}', true),
(2, 'Depois da última visita, de 0 a 10, o quanto você indicaria nossa barbearia para um amigo ou familiar?', 'scale', '{"min": 0, "max": 10}', true),
(3, 'E o atendimento do barbeiro nessa última vez, como foi?', 'options', '["Excelente", "Bom", "Mais ou menos", "Ruim"]', true),
(4, 'O que você mais curtiu nessa última visita?', 'options', '["O corte/barba", "O atendimento", "O ambiente", "A pontualidade", "O preço", "Outro"]', true),
(5, 'Tem algo dessa última vez que a gente pode melhorar?', 'open', null, true);

-- Tabela de respostas
CREATE TABLE public.satisfaction_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL,
  barber_id uuid REFERENCES public.barbers(id),
  responses jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índice para evitar respostas duplicadas por pedido
CREATE UNIQUE INDEX idx_satisfaction_responses_order ON public.satisfaction_responses(order_id);

-- Enable RLS
ALTER TABLE public.satisfaction_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.satisfaction_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para satisfaction_settings
CREATE POLICY "Anyone can view satisfaction settings"
ON public.satisfaction_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage satisfaction settings"
ON public.satisfaction_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para satisfaction_questions
CREATE POLICY "Anyone can view active questions"
ON public.satisfaction_questions FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage questions"
ON public.satisfaction_questions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas para satisfaction_responses
CREATE POLICY "Customers can insert their own responses"
ON public.satisfaction_responses FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can view their own responses"
ON public.satisfaction_responses FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Admins and barbers can view all responses"
ON public.satisfaction_responses FOR SELECT
USING (has_role(auth.uid(), 'barber'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_satisfaction_settings_updated_at
BEFORE UPDATE ON public.satisfaction_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_satisfaction_questions_updated_at
BEFORE UPDATE ON public.satisfaction_questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
