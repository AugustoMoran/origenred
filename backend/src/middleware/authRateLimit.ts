import rateLimit from 'express-rate-limit';

/** Solo protege login/registro; el resto del API no tiene límite global (evita 429 al cargar catálogo + imágenes). */
export const authAttemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de acceso. Esperá unos minutos e intentá de nuevo.' },
});
