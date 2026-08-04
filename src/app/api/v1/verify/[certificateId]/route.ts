import { apiError, apiSuccess } from "@/lib/api";
import { certificateService } from "@/services/certificate.service";
import { appUrl } from "@/lib/env";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ certificateId: string }> },
) {
  const { certificateId } = await params;
  const certificate = await certificateService.findByCertificateNumber(certificateId);

  if (!certificate) {
    return apiError("Certificate not found", 404);
  }

  return apiSuccess({
    certificateNumber: certificate.certificateNumber,
    learnerName: certificate.learnerName,
    courseName: certificate.courseName,
    issueDate: certificate.issueDate,
    learningPath: certificate.learningPath,
    verificationUrl: `${appUrl()}/verify/${certificate.certificateNumber}`,
    valid: true,
  });
}
