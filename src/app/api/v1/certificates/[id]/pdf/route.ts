import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { apiError } from "@/lib/api";
import { getApiUser } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getApiUser();
  if (!user) return apiError("Unauthorized", 401);
  if (!["ADMIN", "LEARNER"].includes(user.role.key)) {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;
  const certificate = await prisma.certificate.findUnique({ where: { id } });
  if (!certificate) return apiError("Certificate not found", 404);
  if (user.role.key === "LEARNER" && certificate.learnerId !== user.id) {
    return apiError("Forbidden", 403);
  }

  const verificationUrl = `${appUrl()}/verify/${certificate.certificateNumber}`;
  const qrPng = await QRCode.toBuffer(verificationUrl, { width: 120, margin: 1 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const teal = rgb(0.05, 0.38, 0.36);
  const qrImage = await pdf.embedPng(qrPng);

  page.drawRectangle({ x: 18, y: 18, width: 806, height: 559, borderWidth: 4, borderColor: teal });
  page.drawText("MEDICAL CODING GLOBAL", { x: 285, y: 515, size: 18, font: bold, color: teal });
  page.drawText("CERTIFICATE OF COMPLETION", { x: 220, y: 440, size: 30, font: bold, color: teal });
  page.drawText("This certificate is proudly presented to", { x: 310, y: 385, size: 13, font: regular });
  const nameWidth = bold.widthOfTextAtSize(certificate.learnerName, 28);
  page.drawText(certificate.learnerName, { x: (842 - nameWidth) / 2, y: 335, size: 28, font: bold });
  page.drawLine({ start: { x: 210, y: 325 }, end: { x: 632, y: 325 }, thickness: 1, color: teal });
  page.drawText("for successfully completing", { x: 340, y: 285, size: 13, font: regular });
  const courseWidth = bold.widthOfTextAtSize(certificate.courseName, 21);
  page.drawText(certificate.courseName, { x: (842 - courseWidth) / 2, y: 245, size: 21, font: bold });
  page.drawText(`Issued: ${certificate.issueDate.toLocaleDateString("en-IN")}`, { x: 90, y: 90, size: 11, font: regular });
  page.drawText(`Certificate ID: ${certificate.certificateNumber}`, { x: 90, y: 72, size: 11, font: regular });
  page.drawText("Verify at:", { x: 555, y: 110, size: 9, font: regular });
  page.drawText(verificationUrl, { x: 555, y: 98, size: 8, font: regular, maxWidth: 250, lineHeight: 10 });
  page.drawImage(qrImage, { x: 700, y: 40, width: 90, height: 90 });

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificateNumber}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
