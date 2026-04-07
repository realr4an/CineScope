import "server-only";

import {
  assessPromptInjection,
  containsSensitiveDataExfiltrationAttempt
} from "@/lib/security/prompt-injection";

export type AssistantConversationEntry = {
  role: "user" | "assistant";
  content: string;
};

const MAX_SAFETY_TEXT_LENGTH = 420;

export function sanitizeAssistantInputText(input: string) {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/<\/?(system|assistant|developer|tool)>/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SAFETY_TEXT_LENGTH);
}

export type AssistantSafetyGateResult = {
  blocked: boolean;
  reason: "allow" | "regex_strong" | "sensitive_exfiltration";
  sanitizedPrompt: string;
  sanitizedConversation: AssistantConversationEntry[];
};

export function runAssistantSafetyGate(input: {
  prompt: string;
  conversation: AssistantConversationEntry[];
  additionalText?: Array<string | null | undefined>;
}): AssistantSafetyGateResult {
  const sanitizedPrompt = sanitizeAssistantInputText(input.prompt);
  const sanitizedConversation = input.conversation.map(message => ({
    role: message.role,
    content: sanitizeAssistantInputText(message.content)
  }));
  const assessment = assessPromptInjection([
    input.prompt,
    ...input.conversation.map(message => message.content),
    ...(input.additionalText ?? [])
  ]);
  const exfilAttempt = containsSensitiveDataExfiltrationAttempt([
    input.prompt,
    ...input.conversation.map(message => message.content),
    ...(input.additionalText ?? [])
  ]);

  if (assessment.severity === "strong") {
    return {
      blocked: true,
      reason: "regex_strong",
      sanitizedPrompt,
      sanitizedConversation
    };
  }

  if (exfilAttempt) {
    return {
      blocked: true,
      reason: "sensitive_exfiltration",
      sanitizedPrompt,
      sanitizedConversation
    };
  }

  return {
    blocked: false,
    reason: "allow",
    sanitizedPrompt,
    sanitizedConversation
  };
}
