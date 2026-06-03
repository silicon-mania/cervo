import { z } from "zod";

export const documentAutosaveParamsSchema = z.object({
  documentId: z.uuid(),
});

export const documentAutosaveInputSchema = z.object({
  title: z.string().max(200),
  contentJson: z.unknown(),
  contentText: z.string(),
});

export const createNoteInputSchema = z.object({
  id: z.uuid().optional(),
  boxId: z.uuid().nullable().optional(),
});

export const dailyNoteAutosaveParamsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type DocumentAutosaveInput = z.infer<typeof documentAutosaveInputSchema>;
export type CreateNoteInput = z.infer<typeof createNoteInputSchema>;
