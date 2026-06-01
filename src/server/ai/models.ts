export function getAssistantModel() {
  const model = process.env.OPENAI_MODEL_ASSISTANT;

  if (!model) {
    throw new Error("OPENAI_MODEL_ASSISTANT is required.");
  }

  return model;
}

export function getStructuredModel() {
  const model = process.env.OPENAI_MODEL_STRUCTURED;

  if (!model) {
    throw new Error("OPENAI_MODEL_STRUCTURED is required.");
  }

  return model;
}
