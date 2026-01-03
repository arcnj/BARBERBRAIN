-- Add message template column to birthday_settings
ALTER TABLE public.birthday_settings 
ADD COLUMN IF NOT EXISTS message_template TEXT DEFAULT 'Olá {nome}! 🎂 Feliz Aniversário! Temos um presente especial para você: um cupom de {desconto}% de desconto válido por {dias} dias. Venha nos visitar!';