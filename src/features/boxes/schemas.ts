import { z } from "zod";

export const createBoxSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(80),
  parentBoxId: z.uuid().optional(),
});

export const boxPlacementRequestSchema = z.object({
  boxId: z.uuid(),
});

export type CreateBoxInput = z.infer<typeof createBoxSchema>;
export type BoxPlacementRequestInput = z.infer<typeof boxPlacementRequestSchema>;
