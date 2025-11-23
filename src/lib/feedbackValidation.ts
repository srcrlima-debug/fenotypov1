import { z } from 'zod';

export const feedbackSchema = z.object({
  rating: z.number()
    .int({ message: 'Avaliação deve ser um número inteiro' })
    .min(1, { message: 'Avaliação mínima é 1' })
    .max(5, { message: 'Avaliação máxima é 5' }),
  experiencia_geral: z.string()
    .trim()
    .max(500, { message: 'Experiência geral deve ter no máximo 500 caracteres' })
    .optional(),
  clareza_instrucoes: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
  tempo_adequado: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
  interface_qualidade: z.number()
    .int()
    .min(1)
    .max(5)
    .optional(),
  sugestoes: z.string()
    .trim()
    .max(1000, { message: 'Sugestões devem ter no máximo 1000 caracteres' })
    .optional(),
  recomendaria: z.boolean().optional(),
});

export type FeedbackFormData = z.infer<typeof feedbackSchema>;
