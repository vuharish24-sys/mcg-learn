import { formatDateTime } from "@/lib/utils";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsAppTemplate, toE164 } from "@/lib/notifications/whatsapp";

type NotifyPerson = { fullName: string; email: string; phone: string | null };

type AppointmentDetails = {
  startsAt: Date;
  meetingUrl: string | null;
  learner: NotifyPerson;
  host: NotifyPerson;
};

/**
 * Fires appointment notifications to both parties, best-effort. Never
 * throws — a notification failure must not roll back or fail the booking
 * it's about. Email and WhatsApp are independently optional; each silently
 * no-ops if unconfigured (see lib/notifications/email.ts and whatsapp.ts).
 */
async function notifyBothSides(
  details: AppointmentDetails,
  build: (recipient: NotifyPerson, counterpart: NotifyPerson) => { subject: string; html: string; whatsappParams: string[] },
) {
  const pairs: [NotifyPerson, NotifyPerson][] = [
    [details.learner, details.host],
    [details.host, details.learner],
  ];

  await Promise.allSettled(
    pairs.flatMap(([recipient, counterpart]) => {
      const { subject, html, whatsappParams } = build(recipient, counterpart);
      const tasks = [sendEmail(recipient.email, subject, html)];
      const phone = toE164(recipient.phone);
      if (phone) tasks.push(sendWhatsAppTemplate(phone, whatsappParams));
      return tasks;
    }),
  );
}

export async function notifyAppointmentBooked(details: AppointmentDetails) {
  const when = formatDateTime(details.startsAt);
  await notifyBothSides(details, (recipient, counterpart) => ({
    subject: "Appointment confirmed",
    html: `<p>Hi ${recipient.fullName},</p><p>Your appointment with <strong>${counterpart.fullName}</strong> is confirmed for <strong>${when}</strong>.</p>${
      details.meetingUrl ? `<p>Meeting link: <a href="${details.meetingUrl}">${details.meetingUrl}</a></p>` : ""
    }<p>— MCG Learn</p>`,
    whatsappParams: [recipient.fullName, counterpart.fullName, when],
  }));
}

export async function notifyAppointmentCancelled(details: AppointmentDetails) {
  const when = formatDateTime(details.startsAt);
  await notifyBothSides(details, (recipient, counterpart) => ({
    subject: "Appointment cancelled",
    html: `<p>Hi ${recipient.fullName},</p><p>Your appointment with <strong>${counterpart.fullName}</strong> on <strong>${when}</strong> has been cancelled.</p><p>— MCG Learn</p>`,
    whatsappParams: [recipient.fullName, counterpart.fullName, when],
  }));
}
