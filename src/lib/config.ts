// Configurações centralizadas do projeto.
// Valores lidos de import.meta.env com fallback hardcoded para garantir
// funcionamento em ambientes que não injetam .env (ex: Lovable).

export const CONFIG = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || 'https://lwusznsduxcqjjmbbobt.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_c0yDYJ79ltCXMGznHYyOQQ_Y2zjyhtY',

  // Google SSO
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || '19779916042-ur7fs5qdorm32bsen7vtfcurkoka4sp7.apps.googleusercontent.com',
  GOOGLE_ALLOWED_DOMAIN: (import.meta.env.VITE_GOOGLE_ALLOWED_DOMAIN || 'appmax.com.br').trim().toLowerCase(),
  GOOGLE_REDIRECT_URI: import.meta.env.VITE_GOOGLE_REDIRECT_URI || 'https://smart-deal-coach.lovable.app/auth/google/callback',

  // Evolution API (WhatsApp)
  EVOLUTION_API_URL: import.meta.env.VITE_EVOLUTION_API_URL || 'https://evolutionapic.contato-lojavirtual.com',
  EVOLUTION_API_TOKEN: import.meta.env.VITE_EVOLUTION_API_TOKEN || '3ce7a42f9bd96ea526b2b0bc39a4faec',

  // OpenAI Tokens
  OPENAI_TOKEN_MEETINGS: import.meta.env.VITE_OPENAI_TOKEN_MEETINGS || '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',
  OPENAI_TOKEN_TRAINING: import.meta.env.VITE_OPENAI_TOKEN_TRAINING || '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',
  OPENAI_TOKEN_WHATSAPP: import.meta.env.VITE_OPENAI_TOKEN_WHATSAPP || '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',
  OPENAI_TOKEN_REPORTS: import.meta.env.VITE_OPENAI_TOKEN_REPORTS || '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',
  OPENAI_TOKEN_AUTOMATIONS: import.meta.env.VITE_OPENAI_TOKEN_AUTOMATIONS || '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',
} as const;
