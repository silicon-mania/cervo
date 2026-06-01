import { openai } from "@ai-sdk/openai";

import { getAssistantModel, getStructuredModel } from "./models";

export function assistantModel() {
  return openai(getAssistantModel());
}

export function structuredModel() {
  return openai(getStructuredModel());
}
