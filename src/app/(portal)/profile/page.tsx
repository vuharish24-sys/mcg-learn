import { requireUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import {
  getProfileCompleteness,
  profileService,
  toDateInputValue,
} from "@/services/profile.service";

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = await profileService.getById(user.id);
  if (!profile) return null;

  const completeness = getProfileCompleteness(profile);

  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <div>
        <p className="text-sm font-semibold text-teal-700">Your profile</p>
        <h1 className="mt-1 text-3xl font-bold">Course advising details</h1>
        <p className="mt-2 text-slate-500">
          A few details help career officers recommend the right learning paths and courses.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-semibold">Advising readiness</p>
            <p className="mt-1 text-sm text-slate-500">
              {completeness.isReadyForAdvising
                ? "Enough detail for personalized course advice."
                : "Add qualification, goals, and background to unlock better recommendations."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-800">{completeness.percent}%</p>
            <p className="text-xs text-slate-500">
              {completeness.completed}/{completeness.total} fields
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 md:p-6">
          <ProfileForm
            initial={{
              email: profile.email,
              fullName: profile.fullName,
              phone: profile.phone,
              dateOfBirth: toDateInputValue(profile.dateOfBirth),
              qualification: profile.qualification,
              fieldOfStudy: profile.fieldOfStudy,
              yearsExperience: profile.yearsExperience,
              careerGoal: profile.careerGoal,
              preferredLearningMode: profile.preferredLearningMode,
              city: profile.city,
              country: profile.country,
              advisingNotes: profile.advisingNotes,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
