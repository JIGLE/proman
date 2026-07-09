"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Send } from "lucide-react";
import { Input } from "@/ui/input";
import { Button } from "@/ui/button";

export function ResendLinkForm(): React.ReactElement {
  const t = useTranslations("tenantPortal.landing");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setSending(true);
    setMsg(null);
    try {
      const res = await fetch("/api/tenant-portal/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setMsg({ type: "success", text: t("resendSuccess") });
      setEmail("");
    } catch {
      setMsg({ type: "error", text: t("resendError") });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-left space-y-3">
      <p className="text-sm font-medium text-[var(--color-foreground)]">{t("orRequestNew")}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          aria-label={t("emailLabel")}
          className="flex-1"
        />
        <Button type="submit" disabled={sending} className="shrink-0">
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              {t("sendLink")}
            </>
          )}
        </Button>
      </form>
      {msg && (
        <p
          className={`text-sm ${msg.type === "success" ? "text-[var(--color-success)]" : "text-[var(--color-destructive)]"}`}
        >
          {msg.text}
        </p>
      )}
    </div>
  );
}
