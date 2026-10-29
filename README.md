# BarberBrain AI

# Product Requirements Document (PRD)
## BarberBrain: Sistema de Retenção e Inteligência para Barbearias

**Versão:** 1.0  
**Data:** Dezembro 2025  
**Autor:** Produto BarberBrain  
**Status:** Draft para aprovação

---

## 1. Visão Geral do Produto

### 1.1 Nome e Posicionamento
**Nome:** BarberBrain  
**Tagline:** "O cérebro da sua barbearia"

**Tipo:** SaaS B2B com IA generativa para barbearias independentes e pequenas redes (1-20 unidades)

### 1.2 Visão
Transformar cada barbearia em um negócio orientado por dados e ação automática, onde o sistema:
- Mostra faturamento e métricas operacionais em tempo real
- Recupera clientes automaticamente antes que deixem de voltar
- Sugere promoções, combos e estratégias de ocupação
- Segmenta clientes inteligentemente (VIP, em risco, perdidos)
- Age como consultor de negócios 24/7, simples e acessível

---

## 2. Problema e Oportunidade

### 2.1 Problema
Donos de barbearias enfrentam desafios críticos que impactam diretamente o faturamento:

**Falta de visibilidade:**
- Não sabem com precisão quanto faturam por dia/semana/mês
- Desconhecem quantos clientes atenderam ou quem são os melhores
- Não identificam quando clientes param de voltar

**Falta de tempo e expertise:**
- Não fazem marketing estruturado
- Não criam promoções estratégicas
- Não têm tempo para lembrar clientes na hora certa
- Não sabem quais serviços combinam ou geram mais margem

**Sistemas inadequados:**
- Ferramentas de agenda/caixa existentes são passivas
- Não trabalham ativamente para aumentar receita
- Não oferecem inteligência ou automação

### 2.2 Oportunidade
O mercado de barbearias no Brasil movimenta bilhões anualmente, com:
- Crescimento constante no setor de cuidados masculinos
- Alta fragmentação (muitas barbearias pequenas e independentes)
- Baixa adoção de tecnologia além de agendamento básico
- Oportunidade de aumentar faturamento em 15-30% com retenção e upsell

---

## 3. Personas

### Persona Primária: Dono de Barbearia de Bairro
**Perfil:**
- 1-5 barbeiros
- Faturamento: R$ 15k-80k/mês
- Usa intensamente WhatsApp
- Conhecimento técnico limitado
- Busca crescimento mas rejeita sistemas complexos

**Dores principais:**
- Clientes somem sem aviso
- Horários ociosos (especialmente meio de semana)
- Não sabe como aumentar ticket médio
- Dificuldade em fazer marketing

**Jobs to be Done:**
- Aumentar faturamento recorrente
- Reduzir trabalho operacional
- Ter clareza dos números do negócio
- Recuperar clientes perdidos

### Persona Secundária: Gerente de Pequena Rede
**Perfil:**
- 3-20 lojas
- Já possui sistema de agendamento
- Busca padronização e escala
- Quer aumentar resultado por unidade

**Dores principais:**
- Dificuldade em replicar boas práticas
- Falta de comparação entre unidades
- Custo de gerenciar marketing para várias lojas

---

## 4. Proposta de Valor

### 4.1 Value Proposition
**"Um sistema que traz clientes de volta, enche os horários vazios e mostra quanto dinheiro a barbearia está ganhando — tudo com IA, sem complicação."**

### 4.2 Diferenciais Competitivos
1. **IA Proativa:** Decide automaticamente quem chamar e quando
2. **Dashboard Acionável:** Focado em ações concretas, não apenas números
3. **Mensagens Prontas:** IA gera textos personalizados para cada contexto
4. **Sugestões Inteligentes:** Combos, promoções e estratégias baseadas em dados reais
5. **Mobile-First:** Interface simples, pensada para uso em celular

---

## 5. Objetivos e Métricas de Sucesso

### 5.1 Objetivos de Negócio
1. Aumentar faturamento recorrente das barbearias em 20-30%
2. Reduzir churn de clientes das barbearias em 40%
3. Aumentar ocupação de horários ociosos em 25%
4. Elevar ticket médio em 15% via combos e upsell

### 5.2 KPIs do Produto
**Métricas de Impacto (para as barbearias):**
- Faturamento incremental por barbearia/mês
- Número de clientes reativados/mês
- Taxa de ocupação em horários fracos
- Aumento de ticket médio
- Taxa de resposta às campanhas

**Métricas de Produto (para o BarberBrain):**
- Taxa de ativação (setup completo em 7 dias)
- DAU/MAU (engajamento)
- Churn rate de clientes
- NPS
- Tempo médio no sistema por sessão

---

## 6. Escopo Funcional

### 6.1 Arquitetura de Módulos

```
┌─────────────────────────────────────────────────────────────┐
│                    DASHBOARD CENTRAL                        │
│         Hoje | Clientes | Negócio | Sugestões IA           │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │   CRM   │          │ Motor de│          │   IA    │
   │Clientes │◄─────────┤Retenção │◄─────────┤ Coach   │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                     │
   ┌────▼────────────────────▼─────────────────────▼────┐
   │        Registro de Atendimentos & Serviços         │
   └────────────────────────────────────────────────────┘
```

---

## 7. Especificação Detalhada dos Módulos

### 7.1 CRM de Clientes

#### 7.1.1 Dados do Cliente
**Campos obrigatórios:**
- Nome completo
- Telefone (WhatsApp)
- Data de cadastro

**Campos opcionais:**
- E-mail
- Data de nascimento
- Preferências de atendimento
- Notas do barbeiro

**Dados calculados automaticamente:**
- Data do último atendimento
- Intervalo médio entre visitas
- Valor total gasto (lifetime value)
- Número de visitas
- Serviços mais frequentes
- Status (ativo/em risco/perdido)
- Classificação (regular/VIP)

#### 7.1.2 Funcionalidades
- Cadastro manual
- Importação via CSV (template fornecido)
- Busca por nome/telefone
- Filtros por status e classificação
- Histórico completo de atendimentos
- Edição de dados

**Regras de Negócio:**
- Telefone é único (sem duplicatas)
- Normalização automática de telefone (+55)
- Merge de clientes duplicados (sugerido pela IA)

---

### 7.2 Registro de Atendimentos & Serviços

#### 7.2.1 Dados do Atendimento
```
Atendimento {
  id: UUID
  cliente_id: UUID
  barbeiro_id: UUID
  data_atendimento: DateTime
  servicos: Array[Serviço]
  produtos: Array[Produto] // futuro
  valor_servicos: Decimal
  valor_produtos: Decimal // futuro
  valor_total: Decimal
  forma_pagamento: Enum
  observacoes: Text
  status: Enum (agendado/realizado/faltou/cancelado)
}

Serviço {
  id: UUID
  nome: String
  categoria: Enum
  preco_base: Decimal
  preco_cobrado: Decimal
  duracao_minutos: Integer
}
```

#### 7.2.2 Categorias de Serviço
- Corte (tradicional, degradê, navalhado, etc.)
- Barba (aparar, desenhar, completa, etc.)
- Sobrancelha
- Hidratação
- Pigmentação
- Tratamentos especiais
- Outros

#### 7.2.3 Funcionalidades
- Registro rápido de atendimento (3 cliques)
- Seleção de serviços pré-cadastrados
- Criação de novos serviços
- Aplicação de descontos
- Marcação de no-show
- Edição de atendimentos passados (até 7 dias)

**Integrações Futuras:**
- API de sistemas de agendamento (Agendor, etc.)
- PDV/caixa existentes

---

### 7.3 Motor de Retenção (Recuperação Automática)

#### 7.3.1 Lógica de Janela Ideal
**Cálculo inicial (MVP):**
```
janela_ideal = data_último_atendimento + intervalo_médio_padrão
```

**Intervalo médio padrão:** 20 dias (configurável)

**Evolução (Fase 2):**
```
janela_ideal_personalizada = ML_model(
  histórico_cliente,
  sazonalidade,
  tipo_serviço,
  comportamento_similar_clients
)
```

#### 7.3.2 Classificação de Status

| Status | Regra | Ação |
|--------|-------|------|
| **Ativo** | Dentro da janela ou passou até 5 dias | Nenhuma |
| **Em Risco** | Passou 6-25 dias da janela | Campanha preventiva |
| **Perdido** | Passou 26-90 dias da janela | Campanha de reativação |
| **Inativo** | Passou +90 dias | Campanha especial ou exclusão |

#### 7.3.3 Lista Diária de Recuperação
**Geração automática todo dia às 8h:**
1. Identifica clientes "em risco" e "perdidos"
2. Prioriza por valor histórico (VIP primeiro)
3. Remove clientes contatados nos últimos 7 dias
4. Gera mensagens personalizadas com IA

**Output:**
- Lista de 10-30 clientes para contatar
- Mensagens individuais ou em lote
- Botão "Copiar todas as mensagens"
- Botão "Marcar como contatado"

#### 7.3.4 Geração de Mensagens (IA)
**Input para LLM:**
- Nome do cliente
- Dias desde último atendimento
- Serviço(s) que costuma fazer
- Segmento (VIP/regular)
- Tom de voz da barbearia (configuração)
- Contexto (recuperação/promo/combo)

**Exemplos de Output:**

*Tom descontraído, cliente em risco:*
> Fala Diego! Tá sumido ein? 😅 Faz 30 dias que tu não aparece aqui. Bora marcar um horário essa semana? Tenho umas vagas boas na quinta à tarde!

*Tom profissional, cliente VIP perdido:*
> Olá Sr. Roberto, tudo bem? Notamos que faz algum tempo que não nos visita. Como um dos nossos clientes mais especiais, gostaríamos de oferecer um agendamento prioritário com 15% de desconto. Quando poderia passar?

---

### 7.4 Dashboard: Três Abas Principais

#### 7.4.1 Aba HOJE (Operação do Dia)

**Card 1: Faturamento**
```
┌──────────────────────────────────┐
│ Faturamento Hoje                 │
│ R$ 847,50                        │
│ ↑ +12% vs média 7 dias          │
│ ↓ -8% vs terça passada          │
└──────────────────────────────────┘
```

**Card 2: Clientes Atendidos**
```
┌──────────────────────────────────┐
│ Clientes Hoje                    │
│ 14 clientes                      │
│ Ticket médio: R$ 60,54          │
│ 2 no-shows 😞                   │
└──────────────────────────────────┘
```

**Card 3: Agenda**
- Próximos atendimentos (lista com horário, cliente, barbeiro)
- Botão: "Ver agenda completa"

**Card 4: Ocupação por Horário**
- Gráfico de barras horizontal (9h-20h)
- Verde: ocupado | Cinza: livre
- Indicador de horários ociosos

**Alertas Inteligentes:**
```
⚠️ 2 clientes faltaram hoje
   [Enviar mensagem para remarcar]

📊 Você tem 5 horários livres à tarde
   [Ver clientes para oferecer encaixe]
```

---

#### 7.4.2 Aba CLIENTES (Segmentação)

**Layout:**
```
┌─────────────────────────────────────────────────┐
│  🏆 CLIENTES VIP                                │
│  12 clientes • 45% do faturamento              │
│  [Ver lista] [Criar campanha]                  │
├─────────────────────────────────────────────────┤
│  ⚠️ EM RISCO                                    │
│  23 clientes • R$ 14.500 em risco              │
│  [Recuperar agora]                              │
├─────────────────────────────────────────────────┤
│  😞 PERDIDOS                                    │
│  47 clientes • Sem vir há 60+ dias             │
│  [Campanha de reativação]                       │
├─────────────────────────────────────────────────┤
│  ✨ NOVOS CLIENTES                              │
│  8 este mês • 6 retornaram (75%)               │
│  [Ver retenção]                                 │
└─────────────────────────────────────────────────┘
```

**Critérios de Classificação:**

**VIP:**
- ≥6 visitas nos últimos 12 meses OU
- Valor total gasto ≥ R$ 1.500 OU
- Frequência regular (<25 dias entre visitas)

**Em Risco:**
- Passou 6-25 dias da janela ideal
- Não é classificado como inativo

**Perdidos:**
- Passou 26-90 dias da janela ideal
- Já foi cliente ativo

**Novos:**
- Primeira visita nos últimos 30 dias
- Métrica de retenção: voltou pelo menos 1 vez

---

#### 7.4.3 Aba NEGÓCIO (Inteligência)

**Seção 1: Visão Financeira**
- Gráfico de faturamento (últimos 30/90 dias)
- Comparativo mês atual vs anterior
- Projeção para o mês (baseada em histórico)

**Seção 2: Desempenho por Barbeiro**
```
┌────────────────────────────────────────────────┐
│ Carlos                                         │
│ R$ 18.450 • 87 clientes • R$ 212 ticket médio│
│ ⭐⭐⭐⭐⭐ 4.8 (23 avaliações)                  │
├────────────────────────────────────────────────┤
│ Junior                                         │
│ R$ 12.300 • 62 clientes • R$ 198 ticket médio│
│ ⭐⭐⭐⭐ 4.5 (18 avaliações)                    │
└────────────────────────────────────────────────┘
```

**Seção 3: Ranking de Serviços**
```
┌────────────────────────────────────────────────┐
│ 1. Corte Degradê         142x • R$ 35         │
│ 2. Barba Completa        98x  • R$ 25         │
│ 3. Corte + Barba         87x  • R$ 55 💰      │
│ 4. Sobrancelha           45x  • R$ 15         │
│ 5. Hidratação            12x  • R$ 40         │
└────────────────────────────────────────────────┘

💡 87 clientes fazem "Corte + Barba" junto
   (61% de todos que fazem barba)
```

**Seção 4: Análise de Combos**
- Serviços frequentemente feitos juntos
- Oportunidade de combo (quando ainda não existe pacote)
- Performance de combos existentes

---

### 7.5 Módulo de Sugestões Inteligentes (IA Coach)

#### 7.5.1 Feed de Sugestões
Aparece na aba "Negócio", no topo, como cards acionáveis.

**Tipos de Sugestões:**

---

**1. Sugestão de Combo**

**Trigger:** Dois ou mais serviços aparecem juntos em ≥40% dos casos

```
┌────────────────────────────────────────────────┐
│ 🔁 OPORTUNIDADE DE COMBO                       │
│                                                │
│ 61% dos clientes que fazem barba também       │
│ fazem corte no mesmo dia.                     │
│                                                │
│ 💡 Sugestão: Criar combo "Corte + Barba"     │
│    Por R$ 55 (em vez de R$ 35 + R$ 25)       │
│    Economia de R$ 5 pro cliente               │
│    Ticket garantido maior pra você            │
│                                                │
│ [Criar campanha] [Ver dados] [Ignorar]        │
└────────────────────────────────────────────────┘
```

Ao clicar em **[Criar campanha]**:
- IA gera mensagem pronta
- Sugere segmento alvo (clientes que já fazem ambos)
- Permite edição

---

**2. Horário Ocioso**

**Trigger:** Faixa horária com <30% de ocupação por 4+ semanas

```
┌────────────────────────────────────────────────┐
│ ⏰ HORÁRIO VAZIO                               │
│                                                │
│ Terças-feiras 14h-17h estão apenas 18%        │
│ ocupadas nas últimas 4 semanas.               │
│                                                │
│ 💡 Sugestão: "Horário do Patrão"              │
│    10% de desconto para quem agendar          │
│    nesse período.                              │
│                                                │
│ Público sugerido: 23 clientes em risco        │
│                                                │
│ [Gerar mensagens] [Ver ocupação] [Ignorar]    │
└────────────────────────────────────────────────┘
```

---

**3. Serviço de Alta Margem Subutilizado**

**Trigger:** Serviço aparece em <10% dos atendimentos mas aumenta ticket em >R$ 15

```
┌────────────────────────────────────────────────┐
│ 💎 SERVIÇO PREMIUM IGNORADO                    │
│                                                │
│ Hidratação aparece em apenas 8% dos           │
│ atendimentos, mas aumenta o ticket            │
│ médio em R$ 28.                                │
│                                                │
│ 💡 Sugestão: Oferecer "Primeira hidratação    │
│    com 50% off" para clientes VIP.            │
│                                                │
│ Potencial: 12 clientes VIP nunca fizeram      │
│                                                │
│ [Criar oferta] [Ver VIPs] [Ignorar]           │
└────────────────────────────────────────────────┘
```

---

**4. Campanha Sazonal**

**Trigger:** Proximidade de datas especiais (Natal, Dia dos Pais, etc.)

```
┌────────────────────────────────────────────────┐
│ 🎯 CAMPANHA SAZONAL                            │
│                                                │
│ Dia dos Pais se aproxima (15 dias)            │
│                                                │
│ No último Dia dos Pais você atendeu           │
│ 28% a mais que a média do mês.                │
│                                                │
│ 💡 Sugestão: Campanha "Pai & Filho"           │
│    Combo especial: 2 cortes por R$ 100       │
│                                                │
│ [Gerar campanha] [Ver histórico] [Ignorar]    │
└────────────────────────────────────────────────┘
```

---

**5. Recuperação Urgente**

**Trigger:** Número alto de clientes em risco ou perdidos

```
┌────────────────────────────────────────────────┐
│ 🚨 ALERTA DE RETENÇÃO                          │
│                                                │
│ 23 clientes estão em risco de não voltar      │
│ (18 deles são VIPs! 😰)                       │
│                                                │
│ 💡 Ação recomendada: Enviar mensagem hoje     │
│    oferecendo agendamento prioritário.        │
│                                                │
│ Mensagens personalizadas prontas!             │
│                                                │
│ [Ver lista e mensagens] [Agendar envio]       │
└────────────────────────────────────────────────┘
```

#### 7.5.2 Geração de Campanha
Quando usuário clica em qualquer botão de campanha:

**Tela de Criação:**
```
┌────────────────────────────────────────────────┐
│ Nova Campanha: Combo Corte + Barba            │
├────────────────────────────────────────────────┤
│ Público-alvo:                                  │
│ ☑️ Clientes que já fazem corte E barba        │
│ ☐ Clientes VIP                                 │
│ ☐ Todos os clientes ativos                    │
│                                                │
│ 47 clientes selecionados                       │
├────────────────────────────────────────────────┤
│ Mensagem (gerada por IA):                      │
│ ┌────────────────────────────────────────────┐│
│ │ E aí mano! Tá precisando do corte?        ││
│ │                                            ││
│ │ Criei um combo novo aqui: Corte + Barba   ││
│ │ por R$ 55 (tu economiza R$ 5! 🤙)         ││
│ │                                            ││
│ │ Bora agendar? Responde aqui que a gente   ││
│ │ acha um horário bom pra tu!               ││
│ └────────────────────────────────────────────┘│
│                                                │
│ [Editar mensagem] [Regenerar com IA]          │
├────────────────────────────────────────────────┤
│ [Copiar mensagens] [Salvar campanha]          │
└────────────────────────────────────────────────┘
```

---

### 7.6 IA Coach (Insights Diários)

#### 7.6.1 Feed na Home
Seção destacada na tela inicial com insights contextuais:

```
┌────────────────────────────────────────────────┐
│ 💬 Seu assistente IA                           │
├────────────────────────────────────────────────┤
│ Hoje, 9h47                                     │
│ Você ainda tem 5 horários vagos à tarde.      │
│ Quer que eu envie mensagens para 12 clientes  │
│ em risco oferecendo encaixe?                   │
│ [Ver clientes] [Gerar mensagens]               │
├────────────────────────────────────────────────┤
│ Hoje, 8h30                                     │
│ ⚠️ Faturamento desta semana está 12% abaixo   │
│ da semana passada. Principais causas:         │
│ • 3 no-shows (terça e quarta)                 │
│ • Menos cortes + barba (combo)                │
│ [Ver detalhes]                                 │
├────────────────────────────────────────────────┤
│ Ontem, 20h15                                   │
│ ✅ Boa! Você atendeu 2 clientes a mais que    │
│ a média de segunda. Continue assim!            │
└────────────────────────────────────────────────┘
```

#### 7.6.2 Tipos de Insights

**Operacionais:**
- Horários vagos + sugestão de quem chamar
- No-shows do dia (ação de remarcar)
- Previsão de movimento (baseado em histórico)

**Performance:**
- Comparação com períodos anteriores
- Alertas de queda de faturamento
- Reconhecimento de boas performances

**Retenção:**
- Número de clientes em risco
- Clientes VIP que estão sumindo
- Taxa de retorno de novos clientes

**Estratégicos:**
- Serviços que estão caindo
- Oportunidades de cross-sell
- Análise de concorrência (futuro, via dados públicos)

---

### 7.7 Módulo de Comunicação e Campanhas

#### 7.7.1 Gestão de Campanhas

**Lista de Campanhas:**
```
┌────────────────────────────────────────────────┐
│ Campanhas                      [+ Nova]        │
├────────────────────────────────────────────────┤
│ 🟢 Ativa: Combo Corte+Barba                   │
│    47 enviadas • 12 respostas • 8 agendamentos│
│    Criada há 3 dias                            │
│    [Ver] [Pausar] [Relatório]                  │
├────────────────────────────────────────────────┤
│ ⚪ Finalizada: Recuperação VIPs               │
│    18 enviadas • 6 respostas • 5 retornos     │
│    R$ 1.240 em faturamento                     │
│    [Ver relatório]                             │
├────────────────────────────────────────────────┤
│ ⚫ Rascunho: Horário da Tarde                  │
│    23 clientes selecionados                    │
│    [Editar] [Ativar] [Excluir]                 │
└────────────────────────────────────────────────┘
```

#### 7.7.2 Estrutura de Campanha
```
Campanha {
  id: UUID
  nome: String
  tipo: Enum (recuperacao/promo/combo/sazonal/manual)
  status: Enum (rascunho/ativa/pausada/finalizada)
  
  segmento_alvo: {
    tipo: Enum (vip/em_risco/perdidos/novos/todos/filtro_custom)
    filtros_custom: Object
    clientes_ids: Array[UUID]
  }
  
  mensagem: {
    texto: Text
    gerada_por_ia: Boolean
    prompt_usado: Text
    editada_por_usuario: Boolean
  }
  
  canal: Enum (whatsapp_manual/whatsapp_api/sms) // MVP: apenas manual
  
  metricas: {
    total_enviado: Integer
    total_respostas: Integer
    total_agendamentos: Integer
    faturamento_atribuido: Decimal
    taxa_conversao: Float
  }
  
  data_criacao: DateTime
  data_inicio: DateTime
  data_fim: DateTime
}
```

#### 7.7.3 Registro de Performance (MVP)

**Tracking Manual:**
Quando usuário envia mensagens:
1. Sistema marca clientes como "contatados"
2. Usuário pode marcar manualmente:
   - "Respondeu"
   - "Agendou"
   - "Compareceu"

**Tracking Automático (Fase 2):**
- Integração com WhatsApp Business API
- Detecção automática de respostas
- Atribuição de agendamentos

---

### 7.8 Configurações

#### 7.8.1 Configurações Gerais
```
┌────────────────────────────────────────────────┐
│ ⚙️ Configurações                               │
├────────────────────────────────────────────────┤
│ Barbearia                                      │
│ • Nome da barbearia                            │
│ • Endereço                                     │
│ • Telefone                                     │
│ • Horário de funcionamento                     │
│                                                │
│ Equipe                                         │
│ • Barbeiros cadastrados                        │
│ • Permissões                                   │
│                                                │
│ Serviços                                       │
│ • Lista de serviços                            │
│ • Preços padrão                                │
│ • Duração média                                │
│ • Categorias                                   │
│                                                │
│ Integração                                     │
│ • Sistema de agendamento (futuro)              │
│ • WhatsApp Business API (futuro)               │
└────────────────────────────────────────────────┘
```

#### 7.8.2 Configurações de Retenção
```
Intervalo médio entre cortes: [20] dias

Critérios de classificação:
┌────────────────────────────────────────────────┐
│ Cliente VIP quando:                            │
│ ☑️ ≥ 6 visitas nos últimos 12 meses           │
│ ☑️ OU valor total gasto ≥ R$ [1500]           │
│ ☑️ OU frequência regular (< 25 dias)          │
├────────────────────────────────────────────────┤
│ Cliente EM RISCO quando:                       │
│ • Passou [6] a [25] dias da janela ideal      │
├────────────────────────────────────────────────┤
│ Cliente PERDIDO quando:                        │
│ • Passou [26] a [90] dias da janela ideal     │
├────────────────────────────────────────────────┤
│ Cliente INATIVO quando:                        │
│ • Passou mais de [90] dias da janela          │
└────────────────────────────────────────────────┘

[Restaurar padrões] [Salvar alterações]
```

#### 7.8.3 Tom de Voz da Comunicação
```
Escolha o estilo de comunicação da sua barbearia:

◉ Descontraído / Brother
  Exemplo: "E aí mano! Tá sumido ein? 😅"
  
○ Profissional / Respeitoso
  Exemplo: "Olá! Notamos sua ausência. Gostaria de agendar?"
  
○ Premium / Sofisticado
  Exemplo: "Prezado cliente, sentimos sua falta em nosso espaço."
  
○ Personalizado
  [Descrever o tom desejado para a IA]
```

#### 7.8.4 Horários de Envio
```
Permitir envio de mensagens:
Segunda a Sexta: [09:00] às [20:00]
Sábado: [09:00] às [18:00]
Domingo: [ Não enviar ]

☑️ Respeitar fusos horários
☑️ Nunca enviar em feriados
```

---

## 8. Jornada do Usuário

### 8.1 Onboarding (Primeiros 7 dias)

#### Dia 0: Setup Inicial
**Objetivo:** Deixar o sistema funcional em 10 minutos

```
Tela 1: Bem-vindo ao BarberBrain! 🧠
────────────────────────────────────
Vamos configurar sua barbearia em 3 passos

[Começar]


Tela 2: Dados da Barbearia
────────────────────────────────────
Nome: [_________________]
Telefone: [_________________]
Cidade: [_________________]

Quantos barbeiros trabalham aqui?
○ Só eu  ○ 2-3  ○ 4-5  ○ Mais de 5

[Próximo]


Tela 3: Seus Serviços
────────────────────────────────────
Selecione os serviços que você oferece:

☑️ Corte (R$ 35)
☑️ Barba (R$ 25)
☑️ Sobrancelha (R$ 15)
☐ Hidratação (R$ 40)
☐ Pigmentação (R$ 80)

[+ Adicionar outro serviço]

[Próximo]


Tela 4: Importar Clientes
────────────────────────────────────
Você já tem uma lista de clientes?

○ Sim, tenho uma planilha
  [Fazer upload de CSV]
  
○ Sim, estão em outro sistema
  [Ver integrações disponíveis]
  
○ Não, vou cadastrar conforme atender
  [Pular esta etapa]

[Finalizar]


Tela 5: Tudo pronto! 🎉
────────────────────────────────────
Sua barbearia está configurada!

Próximos passos:
1. Registre seus atendimentos de hoje
2. A IA vai começar a aprender seus padrões
3. Em 7 dias, terá as primeiras sugestões

[Ir para o Dashboard]
```

#### Dias 1-7: Aprendizado
**Objetivo:** Formar base de dados inicial

**Checklist Gamificado:**
```
┌────────────────────────────────────────────────┐
│ 🎯 Missões de Setup (4/7 completas)           │
├────────────────────────────────────────────────┤
│ ✅ Configurar barbearia                        │
│ ✅ Cadastrar serviços                          │
│ ✅ Adicionar barbeiros                         │
│ ✅ Registrar 5 atendimentos                    │
│ ⬜ Registrar 20 atendimentos (12/20)          │
│ ⬜ Importar clientes antigos                   │
│ ⬜ Configurar tom de voz da IA                 │
└────────────────────────────────────────────────┘
```

**Dicas Contextuais:**
- Após 5 atendimentos: "Ótimo! Continue registrando para a IA aprender seus padrões"
- Após 10 atendimentos: "Já dá pra ver que Corte + Barba é seu combo campeão!"
- Dia 7: "Pronto! A partir de agora você verá sugestões inteligentes"

---

### 8.2 Fluxo de Uso Diário

#### Manhã (8h-9h)
**Usuário abre o app:**

```
┌────────────────────────────────────────────────┐
│ Bom dia! ☀️                                    │
│                                                │
│ 💬 Seu assistente IA tem 2 alertas:           │
│                                                │
│ 🚨 15 clientes em risco precisam de atenção   │
│    [Ver lista e mensagens]                     │
│                                                │
│ ⏰ 7 horários vagos hoje à tarde               │
│    [Oferecer para clientes]                    │
├────────────────────────────────────────────────┤
│ 📅 Agenda de Hoje                              │
│ 11:00 - João Silva (Corte)                    │
│ 11:30 - Pedro Santos (Corte + Barba)          │
│ ...                                            │
└────────────────────────────────────────────────┘
```

**Ação:** Usuário clica em "Ver lista e mensagens"

```
┌────────────────────────────────────────────────┐
│ 15 Clientes em Risco                           │
├────────────────────────────────────────────────┤
│ 🏆 Carlos Mendes (VIP)                         │
│ Último corte: há 28 dias                       │
│ Costuma vir a cada 20 dias                     │
│                                                │
│ Mensagem sugerida:                             │
│ "E aí Carlos! Faz tempo que tu não aparece... │
│ [copiar] [editar]                              │
├────────────────────────────────────────────────┤
│ Diego Souza                                    │
│ Último corte: há 32 dias                       │
│ ...                                            │
└────────────────────────────────────────────────┘

[Copiar todas (15 mensagens)] [Marcar como enviado]
```

---

#### Durante o Dia
**Registro Rápido de Atendimento:**

```
Fluxo em 3 telas (30 segundos total)

Tela 1:
────────────────────
Cliente: [Buscar nome...]
         
         João Silva
         ↓
[Próximo]


Tela 2:
────────────────────
Serviços:
☑️ Corte - R$ 35
☑️ Barba - R$ 25
☐ Sobrancelha - R$ 15

Total: R$ 60
[Aplicar desconto]

[Próximo]


Tela 3:
────────────────────
Forma de pagamento:
○ Dinheiro
◉ PIX
○ Cartão débito
○ Cartão crédito

Barbeiro: [Carlos ▼]

[Finalizar] ✅
```

---

#### Fim do Dia (18h-20h)
**Resumo Automático:**

```
┌────────────────────────────────────────────────┐
│ Resumo de Hoje 📊                              │
├────────────────────────────────────────────────┤
│ Faturamento: R$ 1.240,00                       │
│ ↑ +18% vs média da semana                     │
│                                                │
│ Clientes atendidos: 22                         │
│ Ticket médio: R$ 56,36                         │
│                                                │
│ ✅ 2 clientes recuperados voltaram hoje!      │
│                                                │
│ 💡 Insight do dia:                             │
│ "Combo Corte+Barba representou 45% do         │
│  faturamento. Continue oferecendo!"            │
│                                                │
│ [Ver dashboard completo]                       │
└────────────────────────────────────────────────┘
```

---

## 9. Especificações Técnicas

### 9.1 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                       │
│  Next.js 14 + React + TailwindCSS + shadcn/ui  │
│  (Progressive Web App - PWA)                    │
└──────────────────┬──────────────────────────────┘
                   │ API REST / GraphQL
┌──────────────────▼──────────────────────────────┐
│                  BACKEND                        │
│              Node.js + NestJS                   │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Business Logic Layer                    │  │
│  │  • Retenção Engine                       │  │
│  │  • Segmentação Service                   │  │
│  │  • Sugestões Engine                      │  │
│  │  • Campanhas Manager                     │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  AI/ML Layer                             │  │
│  │  • OpenAI GPT-4o (mensagens)            │  │
│  │  • Anthropic Claude (análises complexas)│  │
│  │  • Regras + ML híbrido                   │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│               DATABASE                          │
│  PostgreSQL (dados estruturados)                │
│  Redis (cache + filas)                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│            INTEGRAÇÕES (Futuro)                 │
│  • WhatsApp Business API                        │
│  • SMS Gateway (Twilio)                         │
│  • Sistemas de Agendamento                      │
│  • PDV/Caixa                                    │
└─────────────────────────────────────────────────┘
```

### 9.2 Stack Tecnológica

**Frontend:**
- Framework: Next.js 14 (App Router)
- UI: React 18 + TailwindCSS
- Componentes: shadcn/ui
- Charts: Recharts / Chart.js
- Estado: Zustand / React Query
- PWA: next-pwa
- Mobile: Capacitor (para app nativo futuro)

**Backend:**
- Runtime: Node.js 20+
- Framework: NestJS
- API: REST + GraphQL (Mercurius/Apollo)
- Autenticação: JWT + Passport
- Validação: Zod

**Database:**
- Principal: PostgreSQL 16
- ORM: Prisma
- Cache: Redis 7
- Fila: BullMQ

**IA/ML:**
- LLM: OpenAI GPT-4o / Anthropic Claude Sonnet 4
- Embeddings: OpenAI text-embedding-3
- Vector DB: Pinecone (para futuro RAG)

**Infraestrutura:**
- Cloud: AWS / Google Cloud
- Hosting: Vercel (frontend) + AWS ECS (backend)
- Storage: S3
- CDN: CloudFront
- Monitoring: Sentry + DataDog

---

### 9.3 Modelo de Dados (Principais Entidades)

```sql
-- Barbearias
CREATE TABLE barbearias (
  id UUID PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  cidade VARCHAR(100),
  estado CHAR(2),
  config JSONB, -- configurações específicas
  plano VARCHAR(50),
  status VARCHAR(20),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Barbeiros
CREATE TABLE barbeiros (
  id UUID PRIMARY KEY,
  barbearia_id UUID REFERENCES barbearias(id),
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  email VARCHAR(255),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY,
  barbearia_id UUID REFERENCES barbearias(id),
  nome VARCHAR(255) NOT NULL,
  telefone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  data_nascimento DATE,
  data_cadastro DATE DEFAULT CURRENT_DATE,
  
  -- Campos calculados (atualizados por triggers)
  data_ultimo_atendimento DATE,
  intervalo_medio_dias INTEGER,
  numero_visitas INTEGER DEFAULT 0,
  valor_total_gasto DECIMAL(10,2) DEFAULT 0,
  ticket_medio DECIMAL(10,2),
  
  -- Classificação
  status VARCHAR(20), -- ativo, em_risco, perdido, inativo
  classificacao VARCHAR(20), -- regular, vip
  
  -- Metadados
  preferencias JSONB,
  notas TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  
  UNIQUE(barbearia_id, telefone)
);

CREATE INDEX idx_clientes_status ON clientes(status);
CREATE INDEX idx_clientes_classificacao ON clientes(classificacao);
CREATE INDEX idx_clientes_telefone ON clientes(telefone);

-- Serviços
CREATE TABLE servicos (
  id UUID PRIMARY KEY,
  barbearia_id UUID REFERENCES barbearias(id),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(50),
  preco_base DECIMAL(10,2) NOT NULL,
  duracao_minutos INTEGER,
  ativo BOOLEAN DEFAULT true,
  margem_percentual DECIMAL(5,2),
  created_at TIMESTAMP
);

-- Atendimentos
CREATE TABLE atendimentos (
  id UUID PRIMARY KEY,
  barbearia_id UUID REFERENCES barbearias(id),
  cliente_id UUID REFERENCES clientes(id),
  barbeiro_id UUID REFERENCES barbeiros(id),
  
  data_atendimento TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'realizado', -- agendado, realizado, faltou, cancelado
  
  valor_servicos DECIMAL(10,2) NOT NULL,
  valor_produtos DECIMAL(10,2) DEFAULT 0,
  desconto DECIMAL(10,2) DEFAULT 0,
  valor_total DECIMAL(10,2) NOT NULL,
  
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_atendimentos_data ON atendimentos(data_atendimento);
CREATE INDEX idx_atendimentos_cliente ON atendimentos(cliente_id);
CREATE INDEX idx_atendimentos_barbeiro ON atendimentos(barbeiro_id);

-- Atendimentos_Serviços (many-to-many)
CREATE TABLE atendimentos_servicos (
  id UUID PRIMARY KEY,
  atendimento_id UUID REFERENCES atendimentos(id) ON DELETE CASCADE,
  servico_id UUID REFERENCES servicos(id),
  preco_cobrado DECIMAL(10,2) NOT NULL,
  quantidade INTEGER DEFAULT 1
);

-- Campanhas
CREATE TABLE campanhas (
  id UUID PRIMARY KEY,
  barbearia_id UUID REFERENCES barbearias(id),
  nome VARCHAR(255) NOT NULL,
  tipo VARCHAR(50), -- recuperacao, promo, combo, sazonal, manual
  status VARCHAR(20), -- rascunho, ativa, pausada, finalizada
  
  segmento_alvo JSONB, -- configuração do público
  mensagem TEXT,
  mensagem_gerada_por_ia BOOLEAN DEFAULT false,
  prompt_usado TEXT,
  
  canal VARCHAR(20) DEFAULT 'whatsapp_manual',
  
  -- Métricas
  total_enviado INTEGER DEFAULT 0,
  total_respostas INTEGER DEFAULT 0,
  total_agendamentos INTEGER DEFAULT 0,
  faturamento_atribuido DECIMAL(10,2) DEFAULT 0,
  
  data_criacao TIMESTAMP,
  data_inicio TIMESTAMP,
  data_fim TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Campanhas_Clientes (controle de envio)
CREATE TABLE campanhas_clientes (
  id UUID PRIMARY KEY,
  campanha_id UUID REFERENCES campanhas(id),
  cliente_id UUID REFERENCES clientes(id),
  
  enviado BOOLEAN DEFAULT false,
  data_envio TIMESTAMP,
  
  respondeu BOOLEAN DEFAULT false,
  data_resposta TIMESTAMP,
  
  agendou BOOLEAN DEFAULT false,
  atendimento_id UUID REFERENCES atendimentos(id),
  
  created_at TIMESTAMP
);

-- Sugestões da IA (log para análise)
CREATE TABLE sugestoes_ia (
  id UUID PRIMARY KEY,
  barbearia_id UUID REFERENCES barbearias(id),
  tipo VARCHAR(50), -- combo, horario_ocioso, servico_premium, etc
  titulo VARCHAR(255),
  descricao TEXT,
  dados_suporte JSONB,
  
  status VARCHAR(20), -- nova, visualizada, aceita, ignorada
  
  campanha_gerada_id UUID REFERENCES campanhas(id),
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

### 9.4 APIs Principais

#### 9.4.1 Autenticação
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
```

#### 9.4.2 Dashboard
```
GET /api/dashboard/hoje
  → Retorna métricas do dia (faturamento, clientes, agenda, alertas)

GET /api/dashboard/clientes
  → Retorna segmentação (VIP, em risco, perdidos, novos)

GET /api/dashboard/negocio
  → Retorna análises (faturamento histórico, barbeiros, serviços, combos)
```

#### 9.4.3 Clientes
```
GET    /api/clientes
POST   /api/clientes
GET    /api/clientes/:id
PUT    /api/clientes/:id
DELETE /api/clientes/:id

POST   /api/clientes/importar
  → Upload de CSV

GET    /api/clientes/segmento/:tipo
  → Lista clientes por segmento (vip, em_risco, perdidos)
```

#### 9.4.4 Atendimentos
```
GET    /api/atendimentos
POST   /api/atendimentos
GET    /api/atendimentos/:id
PUT    /api/atendimentos/:id

GET    /api/atendimentos/hoje
GET    /api/atendimentos/periodo?inicio=YYYY-MM-DD&fim=YYYY-MM-DD
```

#### 9.4.5 Retenção
```
GET /api/retencao/lista-recuperacao
  → Lista diária de clientes a contatar

POST /api/retencao/gerar-mensagens
  Body: { cliente_ids: [], contexto: 'recuperacao' }
  → IA gera mensagens personalizadas

POST /api/retencao/marcar-contatado
  Body: { cliente_ids: [], campanha_id?: UUID }
```

#### 9.4.6 Sugestões IA
```
GET /api/sugestoes
  → Lista sugestões ativas para a barbearia

POST /api/sugestoes/:id/aceitar
POST /api/sugestoes/:id/ignorar

POST /api/sugestoes/gerar-campanha
  Body: { sugestao_id: UUID, personalizacao?: {} }
  → Cria campanha baseada na sugestão
```

#### 9.4.7 Campanhas
```
GET    /api/campanhas
POST   /api/campanhas
GET    /api/campanhas/:id
PUT    /api/campanhas/:id
DELETE /api/campanhas/:id

POST   /api/campanhas/:id/ativar
POST   /api/campanhas/:id/pausar
GET    /api/campanhas/:id/relatorio
```

---

### 9.5 Lógica de Cálculo (Regras de Negócio)

#### 9.5.1 Atualização de Status do Cliente
**Trigger após cada atendimento:**

```javascript
function atualizarStatusCliente(cliente_id) {
  const cliente = getCliente(cliente_id);
  const config = getBarbeariaConfig(cliente.barbearia_id);
  
  // Calcular intervalo médio
  const atendimentos = getAtendimentos(cliente_id);
  const intervalos = calcularIntervalos(atendimentos);
  const intervalo_medio = mean(intervalos) || config.intervalo_padrao;
  
  // Calcular janela ideal
  const janela_ideal = addDays(
    cliente.data_ultimo_atendimento,
    intervalo_medio
  );
  
  // Calcular dias desde último atendimento
  const dias_desde = diffDays(hoje(), cliente.data_ultimo_atendimento);
  const dias_apos_janela = diffDays(hoje(), janela_ideal);
  
  // Determinar status
  let status;
  if (dias_apos_janela <= 5) {
    status = 'ativo';
  } else if (dias_apos_janela <= 25) {
    status = 'em_risco';
  } else if (dias_apos_janela <= 90) {
    status = 'perdido';
  } else {
    status = 'inativo';
  }
  
  // Determinar classificação
  const classificacao = determinarClassificacao(cliente, config);
  
  // Atualizar
  updateCliente(cliente_id, {
    intervalo_medio_dias: intervalo_medio,
    status,
    classificacao
  });
}

function determinarClassificacao(cliente, config) {
  const criterios_vip = config.criterios_vip || {
    min_visitas_12m: 6,
    min_valor_total: 1500,
    max_intervalo: 25
  };
  
  const visitas_12m = countVisitas(cliente.id, last12Months());
  
  const is_vip = (
    visitas_12m >= criterios_vip.min_visitas_12m ||
    cliente.valor_total_gasto >= criterios_vip.min_valor_total ||
    cliente.intervalo_medio_dias <= criterios_vip.max_intervalo
  );
  
  return is_vip ? 'vip' : 'regular';
}
```

#### 9.5.2 Geração de Lista de Recuperação
**Job diário às 8h:**

```javascript
async function gerarListaRecuperacao(barbearia_id) {
  // Buscar clientes em risco ou perdidos
  const clientes = await db.clientes.findMany({
    where: {
      barbearia_id,
      status: { in: ['em_risco', 'perdido'] },
      ultimo_contato_em: {
        lt: subDays(hoje(), 7) // não contatou nos últimos 7 dias
      }
    },
    orderBy: [
      { classificacao: 'desc' }, // VIP primeiro
      { valor_total_gasto: 'desc' } // depois por valor
    ],
    take: 30
  });
  
  // Gerar mensagens personalizadas
  const lista_com_mensagens = await Promise.all(
    clientes.map(async (cliente) => {
      const mensagem = await gerarMensagemIA({
        cliente,
        contexto: 'recuperacao',
        tom: getBarbeariaConfig(barbearia_id).tom_voz
      });
      
      return {
        ...cliente,
        mensagem_sugerida: mensagem
      };
    })
  );
  
  return lista_com_mensagens;
}
```

#### 9.5.3 Detecção de Oportunidades de Combo
**Job semanal:**

```javascript
async function detectarOportunidadesCombos(barbearia_id) {
  // Buscar pares de serviços frequentes
  const query = `
    SELECT 
      s1.id as servico1_id,
      s1.nome as servico1_nome,
      s2.id as servico2_id,
      s2.nome as servico2_nome,
      COUNT(*) as frequencia,
      COUNT(*) * 100.0 / (
        SELECT COUNT(DISTINCT atendimento_id) 
        FROM atendimentos_servicos 
        WHERE servico_id = s1.id
      ) as percentual
    FROM atendimentos_servicos as1
    JOIN atendimentos_servicos as2 
      ON as1.atendimento_id = as2.atendimento_id 
      AND as1.servico_id < as2.servico_id
    JOIN servicos s1 ON as1.servico_id = s1.id
    JOIN servicos s2 ON as2.servico_id = s2.id
    WHERE s1.barbearia_id = $1
    GROUP BY s1.id, s1.nome, s2.id, s2.nome
    HAVING percentual >= 40
    ORDER BY percentual DESC
    LIMIT 5
  `;
  
  const combos_promissores = await db.raw(query, [barbearia_id]);
  
  // Para cada combo, criar sugestão
  for (const combo of combos_promissores) {
    const preco_separado = combo.servico1_preco + combo.servico2_preco;
    const preco_sugerido = preco_separado * 0.92; // 8% desconto
    
    await criarSugestao({
      barbearia_id,
      tipo: 'combo',
      titulo: `Combo ${combo.servico1_nome} + ${combo.servico2_nome}`,
      descricao: `${combo.percentual.toFixed(0)}% dos clientes fazem esses serviços juntos`,
      dados_suporte: {
        servicos: [combo.servico1_id, combo.servico2_id],
        frequencia: combo.frequencia,
        percentual: combo.percentual,
        preco_separado,
        preco_sugerido
      }
    });
  }
}
```

---

## 10. Roadmap e Fases de Desenvolvimento

### 10.1 Fase 1: MVP (8 semanas) - Q1 2026

**Objetivo:** Produto funcional para primeiros clientes beta

**Semanas 1-2: Setup e Fundação**
- [ ] Setup de infraestrutura (repos, CI/CD, ambientes)
- [ ] Design system e componentes base (shadcn/ui)
- [ ] Autenticação e gestão de usuários
- [ ] Modelo de dados e migrations

**Semanas 3-4: Core Features**
- [ ] CRUD de clientes
- [ ] CRUD de serviços
- [ ] Registro de atendimentos
- [ ] Importação CSV
- [ ] Cálculos básicos (ticket médio, frequência)

**Semanas 5-6: Retenção e IA**
- [ ] Motor de cálculo de status (ativo/risco/perdido)
- [ ] Classificação VIP
- [ ] Integração com OpenAI para mensagens
- [ ] Lista diária de recuperação
- [ ] Geração de mensagens personalizadas

**Semanas 7-8: Dashboard e Lançamento**
- [ ] Dashboard "Hoje"
- [ ] Dashboard "Clientes" (segmentação)
- [ ] Dashboard "Negócio" (básico)
- [ ] Testes com usuários beta
- [ ] Ajustes e lançamento MVP

**Entregáveis:**
- Sistema funcional web/mobile
- Geração de mensagens com IA
- Segmentação básica
- Dashboard operacional
- 10 barbearias beta usando

---

### 10.2 Fase 2: Inteligência e Automação (10 semanas) - Q2 2026

**Objetivo:** IA Coach completo e sugestões automáticas

**Features:**
- [ ] Feed de sugestões inteligentes
  - [ ] Detecção de combos promissores
  - [ ] Identificação de horários ociosos
  - [ ] Serviços de alta margem subutilizados
  - [ ] Campanhas sazonais (calendário)
- [ ] IA Coach com insights diários
- [ ] Módulo de campanhas completo
- [ ] Geração automática de promos
- [ ] Analytics avançado (tendências, previsões)
- [ ] Ajuste automático de janela ideal (ML simples)
- [ ] Onboarding gamificado
- [ ] Notificações push (PWA)

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://barberbrain.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2582ea6a-8172-4ad3-a562-ee71fee1ee6b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
