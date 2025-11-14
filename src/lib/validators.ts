import { z } from "zod";

// Schema de validação para perfil de usuário
export const profileSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email muito longo" }),
  faixa_etaria: z
    .string()
    .trim()
    .min(1, { message: "Faixa etária é obrigatória" })
    .max(50, { message: "Faixa etária muito longa" }),
  genero: z
    .string()
    .trim()
    .min(1, { message: "Gênero é obrigatório" })
    .max(50, { message: "Gênero muito longo" }),
  estado: z
    .string()
    .trim()
    .min(2, { message: "Estado é obrigatório" })
    .max(2, { message: "Estado deve ter 2 caracteres" }),
});

// Schema de validação para criação de sessão
export const sessionSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, { message: "Nome deve ter no mínimo 3 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  data: z.string().min(1, { message: "Data é obrigatória" }),
  photo_duration: z
    .number()
    .min(10, { message: "Duração mínima é 10 segundos" })
    .max(300, { message: "Duração máxima é 300 segundos" }),
});

// Schema de validação para avaliação
export const avaliacaoSchema = z.object({
  foto_id: z.number().int().positive(),
  resposta: z.enum(["DEFERIDO", "INDEFERIDO", "NAO_RESPONDIDO"], {
    message: "Resposta inválida",
  }),
  tempo_gasto: z.number().int().min(0).max(1000),
  session_id: z.string().uuid({ message: "ID de sessão inválido" }),
});

// Função para sanitizar strings (remover HTML e scripts)
export const sanitizeString = (input: string): string => {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

// Função para validar UUID
export const isValidUUID = (uuid: string): boolean => {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// Função para verificar se sessão está expirada
export const isSessionExpired = (
  photoStartTime: string | null,
  photoDuration: number
): boolean => {
  if (!photoStartTime) return false;

  const startTime = new Date(photoStartTime).getTime();
  const currentTime = new Date().getTime();
  const elapsedSeconds = (currentTime - startTime) / 1000;

  return elapsedSeconds > photoDuration;
};

// Rate limiting simples no lado do cliente
const requestTimestamps: { [key: string]: number[] } = {};

export const checkRateLimit = (
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  
  if (!requestTimestamps[key]) {
    requestTimestamps[key] = [];
  }

  // Remover timestamps antigos
  requestTimestamps[key] = requestTimestamps[key].filter(
    (timestamp) => now - timestamp < windowMs
  );

  // Verificar se excedeu o limite
  if (requestTimestamps[key].length >= maxRequests) {
    return false;
  }

  // Adicionar novo timestamp
  requestTimestamps[key].push(now);
  return true;
};
