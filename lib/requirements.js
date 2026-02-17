const PRIORITY_HINTS = {
  must: "Must",
  should: "Should",
  could: "Could",
  wont: "Won't",
  risk: "High",
  compliance: "High",
};
const HIGH_CONFIDENCE = 0.88;
const BASELINE_CONFIDENCE = 0.72;

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
            acceptanceCriteria: `Given stakeholder input \"${sentence}\", when delivered, then ${message.author} confirms the expected outcome is met.`,
            priority,
            stakeholderOwner: message.author,
            confidence: normalized.includes("must") || normalized.includes("need") ? HIGH_CONFIDENCE : BASELINE_CONFIDENCE,
            sourceMessageId: message.id,
          };
        }),
    )
    .slice(0, 25);
}
