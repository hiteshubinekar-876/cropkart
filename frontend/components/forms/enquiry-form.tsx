"use client";

import { useState } from "react";

type EnquiryFormProps = {
  type: "sell" | "bulk" | "contact";
  subjectLabel: string;
  subjectPlaceholder: string;
  requirementLabel: string;
  requirementPlaceholder: string;
};

export function EnquiryForm({
  type,
  subjectLabel,
  subjectPlaceholder,
  requirementLabel,
  requirementPlaceholder,
}: EnquiryFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    subject: "",
    requirement: "",
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        ...form,
      }),
    });

    const data = (await response.json()) as { message?: string; error?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(data.error ?? "Unable to submit right now.");
      return;
    }

    setForm({
      name: "",
      email: "",
      phone: "",
      company: "",
      subject: "",
      requirement: "",
    });
    setMessage(data.message ?? "Submitted successfully.");
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6 sm:p-8">
      <div className="grid gap-4 md:grid-cols-2">
        <input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          className="input-shell"
          placeholder="Full name"
          required
        />
        <input
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          className="input-shell"
          placeholder="Work email"
          required
          type="email"
        />
        <input
          value={form.phone}
          onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          className="input-shell"
          placeholder="Phone number"
        />
        <input
          value={form.company}
          onChange={(event) => setForm((current) => ({ ...current, company: event.target.value }))}
          className="input-shell"
          placeholder="Company or farm name"
        />
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink-600">{subjectLabel}</p>
          <input
            value={form.subject}
            onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
            className="input-shell w-full"
            placeholder={subjectPlaceholder}
          />
        </div>
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-semibold text-ink-600">{requirementLabel}</p>
          <textarea
            value={form.requirement}
            onChange={(event) => setForm((current) => ({ ...current, requirement: event.target.value }))}
            className="input-shell min-h-32 w-full"
            placeholder={requirementPlaceholder}
            required
          />
        </div>
      </div>

      {message ? <p className="mt-4 text-sm text-brand-700">{message}</p> : null}

      <button type="submit" disabled={loading} className="primary-button mt-6 disabled:opacity-60">
        {loading ? "Submitting..." : "Submit enquiry"}
      </button>
    </form>
  );
}
