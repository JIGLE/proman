import { describe, it, expect, vi, beforeEach } from "vitest";

const sendEmailMock = vi.fn();
vi.mock("@/lib/services/email/email-service", () => ({
  emailService: { sendEmail: (...args: unknown[]) => sendEmailMock(...args) },
}));

const incrementEmailSentMock = vi.fn();
const incrementEmailFailedMock = vi.fn();
vi.mock("@/app/api/metrics/route", () => ({
  incrementEmailSent: () => incrementEmailSentMock(),
  incrementEmailFailed: () => incrementEmailFailedMock(),
}));

import { sendReminderEmail, resetReminderEmailCache } from "./reminder-email";

function makePrisma(user: unknown) {
  const findUnique = vi.fn().mockResolvedValue(user);
  return { user: { findUnique } } as unknown as Parameters<typeof sendReminderEmail>[0];
}

describe("sendReminderEmail", () => {
  beforeEach(() => {
    resetReminderEmailCache();
    sendEmailMock.mockReset();
    incrementEmailSentMock.mockReset();
    incrementEmailFailedMock.mockReset();
  });

  it("sends an email when notifications are enabled", async () => {
    sendEmailMock.mockResolvedValue({ success: true, messageId: "abc" });
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: true, taxReminderNotifications: true },
    });

    await sendReminderEmail(prisma, "user-1", "rentReminder", {
      tenant: "Maria Silva",
      property: "Sunset Apt. 2A",
      amount: "€950.00",
      date: "12/31/2026",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const [emailData] = sendEmailMock.mock.calls[0];
    expect(emailData.to).toBe("owner@example.com");
    expect(emailData.subject).toBe("Rent payment due in 5 days — Sunset Apt. 2A");
    expect(incrementEmailSentMock).toHaveBeenCalledTimes(1);
  });

  it("skips sending when emailNotifications is disabled", async () => {
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: false, taxReminderNotifications: true },
    });

    await sendReminderEmail(prisma, "user-1", "rentReminder", {
      tenant: "T",
      property: "P",
      amount: "€1",
      date: "d",
    });

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("defaults to notifications enabled when the user has no settings row", async () => {
    sendEmailMock.mockResolvedValue({ success: true });
    const prisma = makePrisma({ email: "owner@example.com", settings: null });

    await sendReminderEmail(prisma, "user-1", "rentReminder", {
      tenant: "T",
      property: "P",
      amount: "€1",
      date: "d",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("gates the tax-reminder kind on taxReminderNotifications specifically", async () => {
    sendEmailMock.mockResolvedValue({ success: true });
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: true, taxReminderNotifications: false },
    });

    await sendReminderEmail(
      prisma,
      "user-1",
      "receiptDeadline",
      { tenant: "T", property: "P", amount: "€1" },
      { gate: "tax" },
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not gate non-tax reminders on taxReminderNotifications", async () => {
    sendEmailMock.mockResolvedValue({ success: true });
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: true, taxReminderNotifications: false },
    });

    await sendReminderEmail(prisma, "user-1", "rentReminder", {
      tenant: "T",
      property: "P",
      amount: "€1",
      date: "d",
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("localizes the email using the user's settings.language", async () => {
    sendEmailMock.mockResolvedValue({ success: true });
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "pt", emailNotifications: true, taxReminderNotifications: true },
    });

    await sendReminderEmail(prisma, "user-1", "leaseRenewal", {
      tenant: "Maria",
      property: "Sunset",
      date: "31/12/2026",
    });

    const [emailData] = sendEmailMock.mock.calls[0];
    expect(emailData.subject).toBe("Contrato expira em 60 dias — Sunset");
  });

  it("does nothing (no throw) when the user no longer exists", async () => {
    const prisma = makePrisma(null);
    await expect(
      sendReminderEmail(prisma, "gone", "rentReminder", {
        tenant: "T",
        property: "P",
        amount: "€1",
        date: "d",
      }),
    ).resolves.toBeUndefined();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("swallows send failures, increments the failure metric, and never throws", async () => {
    sendEmailMock.mockResolvedValue({ success: false, error: "not configured" });
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: true, taxReminderNotifications: true },
    });

    await expect(
      sendReminderEmail(prisma, "user-1", "rentReminder", {
        tenant: "T",
        property: "P",
        amount: "€1",
        date: "d",
      }),
    ).resolves.toBeUndefined();
    expect(incrementEmailFailedMock).toHaveBeenCalledTimes(1);
    expect(incrementEmailSentMock).not.toHaveBeenCalled();
  });

  it("swallows a thrown error from the email layer", async () => {
    sendEmailMock.mockRejectedValue(new Error("network down"));
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: true, taxReminderNotifications: true },
    });

    await expect(
      sendReminderEmail(prisma, "user-1", "rentReminder", {
        tenant: "T",
        property: "P",
        amount: "€1",
        date: "d",
      }),
    ).resolves.toBeUndefined();
    expect(incrementEmailFailedMock).toHaveBeenCalledTimes(1);
  });

  it("caches the user/settings lookup across calls for the same userId within a run", async () => {
    sendEmailMock.mockResolvedValue({ success: true });
    const prisma = makePrisma({
      email: "owner@example.com",
      settings: { language: "en", emailNotifications: true, taxReminderNotifications: true },
    });

    await sendReminderEmail(prisma, "user-1", "rentReminder", {
      tenant: "A",
      property: "P",
      amount: "€1",
      date: "d",
    });
    await sendReminderEmail(prisma, "user-1", "overdueNotice", {
      tenant: "B",
      property: "P",
      amount: "€1",
      days: 1,
    });

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
  });
});
