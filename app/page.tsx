"use client";

import { FormEvent, useMemo, useState } from "react";
import { extractRequirementsFromChat } from "@/lib/requirements";

type Stakeholder = {
  id: string;
  name: string;
  role: string;
  contact: string;
};

type ChatMessage = {
  id: string;
  author: string;
  content: string;
};

type RequirementCard = {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria: string;
  priority: string;
  stakeholderOwner: string;
  confidence: number;
  sourceMessageId: string;
};

const TEMPLATE_PROMPTS = [
  "What business problem should this project solve?",
  "What does success look like for your team?",
  "Are there compliance, privacy, or security constraints?",
  "Which integrations are required for launch?",
  "What is the highest-priority user outcome?",
];

export default function Home() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([
    { id: "s-1", name: "Avery Johnson", role: "Product Manager", contact: "avery@example.com" },
  ]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m-seed",
      author: "Facilitator",
      content: "Welcome! Please answer the guided prompts so we can draft requirements with traceability.",
    },
  ]);
  const [author, setAuthor] = useState(stakeholders[0]?.name ?? "");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [contact, setContact] = useState("");

  const requirementCards: RequirementCard[] = useMemo(
    () => extractRequirementsFromChat(messages, stakeholders) as RequirementCard[],
    [messages, stakeholders],
  );
  const stakeholderMessageCount = messages.filter((entry) => entry.author !== "Facilitator").length;
  const completionRate = stakeholders.length === 0 ? 0 : Math.round((stakeholderMessageCount / stakeholders.length) * 100);

  function addStakeholder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    const next = {
      id: `s-${Date.now()}`,
      name: name.trim(),
      role: role.trim() || "Contributor",
      contact: contact.trim() || "n/a",
    };

    setStakeholders((current) => [...current, next]);
    setAuthor(next.name);
    setName("");
    setRole("");
    setContact("");
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!author || !message.trim()) return;

    setMessages((current) => [...current, { id: `m-${Date.now()}`, author, content: message.trim() }]);
    setMessage("");
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-6xl gap-4 bg-slate-50 p-4 text-slate-900 md:grid-cols-2">
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Stakeholder Requirements Chat</h1>
        <p className="mt-2 text-sm text-slate-600">Run guided interviews, capture stakeholder input, and generate requirement cards with provenance.</p>
        <div className="mt-4 rounded-md bg-slate-100 p-3">
          <h2 className="font-medium">Guided prompt template</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
            {TEMPLATE_PROMPTS.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </div>

        <div className="mt-4 h-72 space-y-2 overflow-y-auto rounded-md border p-3">
          {messages.map((entry) => (
            <article key={entry.id} className="rounded border border-slate-200 p-2">
              <p className="text-xs font-semibold text-slate-500">{entry.author}</p>
              <p className="text-sm">{entry.content}</p>
            </article>
          ))}
        </div>

        <form onSubmit={sendMessage} className="mt-3 space-y-2">
          <label className="text-xs font-medium" htmlFor="author">Stakeholder</label>
          <select id="author" value={author} onChange={(event) => setAuthor(event.target.value)} className="w-full rounded border p-2 text-sm">
            {stakeholders.map((stakeholder) => (
              <option key={stakeholder.id} value={stakeholder.name}>{stakeholder.name}</option>
            ))}
          </select>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add stakeholder response..." className="min-h-24 w-full rounded border p-2 text-sm" />
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white">Send response</button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Stakeholder Management</h2>
          <form onSubmit={addStakeholder} className="mt-3 grid gap-2 md:grid-cols-2">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="rounded border p-2 text-sm" />
            <input value={role} onChange={(event) => setRole(event.target.value)} placeholder="Role" className="rounded border p-2 text-sm" />
            <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Email / contact" className="rounded border p-2 text-sm md:col-span-2" />
            <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white md:col-span-2">Add stakeholder</button>
          </form>
          <ul className="mt-3 space-y-2 text-sm">
            {stakeholders.map((stakeholder) => (
              <li key={stakeholder.id} className="rounded border p-2">
                <p className="font-medium">{stakeholder.name}</p>
                <p className="text-slate-600">{stakeholder.role} · {stakeholder.contact}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">AI-assisted Requirement Cards</h2>
          <p className="text-sm text-slate-600">Each card links back to a source message for traceability and owner review.</p>
          <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
            {requirementCards.length === 0 && <p className="text-sm text-slate-500">No requirements extracted yet.</p>}
            {requirementCards.map((requirement) => (
              <article key={requirement.id} className="rounded border p-3 text-sm">
                <p className="font-semibold">{requirement.title}</p>
                <p className="mt-1 text-slate-700">{requirement.description}</p>
                <p className="mt-1 text-xs text-slate-600">Priority: {requirement.priority} · Owner: {requirement.stakeholderOwner}</p>
                <p className="mt-1 text-xs text-slate-600">Confidence: {(requirement.confidence * 100).toFixed(0)}% · Source: {requirement.sourceMessageId}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Basic Analytics</h2>
          <p className="text-sm text-slate-700">Stakeholders: {stakeholders.length}</p>
          <p className="text-sm text-slate-700">Responses captured: {stakeholderMessageCount}</p>
          <p className="text-sm text-slate-700">Completion rate: {completionRate}%</p>
        </div>
      </section>
    </main>
  );
}
