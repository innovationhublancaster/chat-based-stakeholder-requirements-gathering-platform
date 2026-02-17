const PRIORITY_HINTS = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
  risk: "High",
  compliance: "High",
};

export function extractRequirementsFromChat(messages, stakeholders) {
  const stakeholderNames = new Set(stakeholders.map((s) => s.name));
  const stakeholderMessages = messages.filter((message) => stakeholderNames.has(message.author));

  return stakeholderMessages
    .flatMap((message) =>
      message.content
        .split(/[.!?]\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean)
        .map((sentence, index) => {
          const normalized = sentence.toLowerCase();
          const priority =
            Object.entries(PRIORITY_HINTS).find(([hint]) => normalized.includes(hint))?.[1] ?? "Medium";

          return {
            id: `${message.id}-${index}`,
            title: sentence.slice(0, 80),
            description: sentence,
            acceptanceCriteria: `Given the requirement \"${sentence}\", when implemented, then stakeholders can validate the outcome.`,
            priority,
            stakeholderOwner: message.author,
            confidence: normalized.includes("must") || normalized.includes("need") ? 0.88 : 0.72,
            sourceMessageId: message.id,
          };
        }),
    )
    .slice(0, 25);
}
