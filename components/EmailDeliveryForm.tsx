"use client";

import { FormEvent, useState } from "react";
import { Loader2, Mail } from "lucide-react";

type EmailDeliveryFormProps = {
  imageUrl: string;
  orderToken: string;
};

export function EmailDeliveryForm({ imageUrl, orderToken }: EmailDeliveryFormProps) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    setIsSending(true);

    try {
      const response = await fetch("/api/send-wallpaper-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, imageUrl, orderToken, website }),
      });
      const data = (await response.json()) as { error?: string; mock?: boolean };

      if (!response.ok) {
        throw new Error(data.error || "Unable to send email.");
      }

      setStatus(data.mock ? "Email mock sent in development." : "Wallpaper sent.");
      setEmail("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to send email.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-cocoa/10 bg-white/55 p-3"
    >
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          Email to myself
        </span>
        <input
          className="field"
          type="email"
          value={email}
          required
          placeholder="you@example.com"
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      <input
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        aria-hidden="true"
      />
      <button
        type="submit"
        disabled={isSending || !imageUrl}
        className="focus-ring mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink transition hover:bg-pearl disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSending ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Mail aria-hidden className="h-4 w-4" />
        )}
        Send Wallpaper
      </button>
      {status ? <p className="mt-2 text-xs text-taupe">{status}</p> : null}
    </form>
  );
}
