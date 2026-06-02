import { z } from "zod";

export const documentAutosaveParamsSchema = z.object({
  documentId: z.uuid(),
});

export const documentAutosaveInputSchema = z.object({
  contentJson: z.unknown(),
  contentText: z.string(),
});

export type DocumentAutosaveInput = z.infer<typeof documentAutosaveInputSchema>;
