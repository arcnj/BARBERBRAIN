/** Respostas da pesquisa de satisfação, gravadas em `satisfaction_responses.responses` (jsonb). */
export interface SurveyAnswers {
  q1?: number; // experiência, 0 a 10
  q2?: number; // recomendação (NPS), 0 a 10
  q3?: string;
  q4?: string;
  q5?: string;
  [key: string]: string | number | undefined;
}
