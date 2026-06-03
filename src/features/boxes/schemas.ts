import { z } from "zod";

export const createBoxSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(80),
  parentBoxId: z.uuid().optional(),
});

export type CreateBoxInput = z.infer<typeof createBoxSchema>;
