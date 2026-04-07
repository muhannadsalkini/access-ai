import { z } from "zod";

export const createScanSchema = z.object({
  url: z
    .string()
    .min(1, "URL is required")
    .url("Please provide a valid URL")
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ["http:", "https:"].includes(parsed.protocol);
        } catch {
          return false;
        }
      },
      { message: "Only HTTP and HTTPS URLs are allowed" }
    ),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;
