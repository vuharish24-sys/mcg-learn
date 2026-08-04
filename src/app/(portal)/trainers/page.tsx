import { Search } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { trainerService } from "@/services/trainer.service";
import { enumLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input, fieldClassName } from "@/components/ui/input";
import { ResourceCreateForm } from "@/components/forms/resource-create-form";
import { StatusSelect } from "@/components/forms/status-select";

const statuses = ["ACTIVE", "INACTIVE", "PENDING"];

export default async function TrainersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireRole(["ADMIN", "TRAINER", "CAREER_OFFICER"]);
  const query = await searchParams;
  const search = typeof query.search === "string" ? query.search : undefined;
  const status = typeof query.status === "string" ? query.status : undefined;
  const trainers = await trainerService.list(search, status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-3xl font-bold">Trainer Network</h1><p className="mt-1 text-slate-500">Qualified trainers and their availability.</p></div>
        {user.role.key === "ADMIN" && <ResourceCreateForm title="Add trainer" endpoint="/api/v1/trainers" fields={[
          { name: "fullName", label: "Full name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone" },
          { name: "experienceYears", label: "Years of experience", type: "number", required: true },
          { name: "specializations", label: "Specializations", type: "csv", required: true, placeholder: "ICD-10, CPC, Billing" },
          { name: "availability", label: "Availability", required: true, placeholder: "Weekdays, 6–9 PM" },
          { name: "status", label: "Status", type: "select", defaultValue: "PENDING", options: statuses.map((value) => ({ value, label: enumLabel(value) })) },
          { name: "bio", label: "Professional summary", type: "textarea" },
        ]} />}
      </div>
      <form className="grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[1fr_200px_auto] dark:border-slate-800 dark:bg-slate-900">
        <label className="relative"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><Input className="pl-9" name="search" defaultValue={search} placeholder="Search trainer or specialization" /></label>
        <select className={fieldClassName} name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{statuses.map((value) => <option key={value} value={value}>{enumLabel(value)}</option>)}</select>
        <button type="submit" className="h-10 rounded-lg bg-slate-100 px-4 text-sm font-semibold dark:bg-slate-800">Apply</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {trainers.map((trainer) => (
          <Card key={trainer.id}><CardContent className="p-5">
            <div className="flex items-start justify-between gap-3"><div><h2 className="font-bold">{trainer.fullName}</h2><p className="mt-1 text-sm text-slate-500">{trainer.email}</p></div>{user.role.key === "ADMIN" ? <StatusSelect endpoint={`/api/v1/trainers/${trainer.id}`} value={trainer.status} options={statuses} /> : <Badge>{enumLabel(trainer.status)}</Badge>}</div>
            <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{trainer.bio ?? "Professional trainer profile"}</p>
            <div className="mt-4 flex flex-wrap gap-2">{trainer.specializations.map((item) => <Badge key={item}>{item}</Badge>)}</div>
            <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-sm dark:border-slate-800"><div><p className="text-xs text-slate-500">Experience</p><p className="font-semibold">{trainer.experienceYears} years</p></div><div><p className="text-xs text-slate-500">Availability</p><p className="font-semibold">{trainer.availability}</p></div></div>
          </CardContent></Card>
        ))}
      </div>
      {trainers.length === 0 && <Card><CardContent className="p-12 text-center text-slate-500">No trainers found.</CardContent></Card>}
    </div>
  );
}
