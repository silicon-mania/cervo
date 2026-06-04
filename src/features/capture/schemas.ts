import { z } from "zod";

export const captureAppendFormSchema = z.object({
  captureId: z.uuid(),
  text: z.string().transform((value) => value.replace(/\r\n?/g, "\n").trimEnd()),
});
