import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// Allow skipping validation for specialized build environments if explicitly requested
// (e.g. Docker builds without secrets)
const skipValidation = !!process.env.SKIP_ENV_VALIDATION;

// Parse or return process.env if skipping. 
// Note: Skipping validation may lead to runtime errors if keys are effectively missing.
export const env = skipValidation
    ? (process.env as unknown as z.infer<typeof envSchema>)
    : envSchema.parse(process.env);
