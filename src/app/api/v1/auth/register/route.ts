import { z } from "zod";
import { apiError, apiSuccess, handleApiError } from "@/lib/api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { referralService } from "@/services/referral.service";

const schema = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  referralCode: z.string().trim().max(40).optional(),
  accountType: z.enum(["learner", "trainer"]).optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  experienceYears: z.coerce.number().int().min(0).max(70).optional(),
  specializations: z.array(z.string().trim().min(1)).optional(),
  availability: z.string().trim().min(2).max(200).optional(),
});

async function ensureTrainerProfile(params: {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  bio?: string | null;
  experienceYears?: number;
  specializations?: string[];
  availability?: string;
}) {
  const trainerRole = await prisma.role.findUniqueOrThrow({ where: { key: "TRAINER" } });

  await prisma.user.update({
    where: { id: params.userId },
    data: {
      roleId: trainerRole.id,
      fullName: params.fullName,
      phone: params.phone,
    },
  });

  const existing = await prisma.trainer.findFirst({
    where: {
      OR: [{ userId: params.userId }, { email: { equals: params.email, mode: "insensitive" } }],
    },
  });

  if (existing) {
    return prisma.trainer.update({
      where: { id: existing.id },
      data: {
        userId: params.userId,
        fullName: params.fullName,
        email: params.email,
        phone: params.phone,
        ...(params.bio !== undefined ? { bio: params.bio } : {}),
        ...(params.experienceYears !== undefined ? { experienceYears: params.experienceYears } : {}),
        ...(params.specializations !== undefined ? { specializations: params.specializations } : {}),
        ...(params.availability !== undefined ? { availability: params.availability } : {}),
      },
    });
  }

  return prisma.trainer.create({
    data: {
      userId: params.userId,
      fullName: params.fullName,
      email: params.email,
      phone: params.phone,
      bio: params.bio ?? null,
      experienceYears: params.experienceYears ?? 0,
      specializations: params.specializations?.length ? params.specializations : ["General"],
      availability: params.availability?.trim() || "To be confirmed",
      status: "PENDING",
    },
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return apiError("Unauthorized", 401);

  try {
    const values = schema.parse(await request.json());
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const metaAccountType = typeof meta.account_type === "string" ? meta.account_type : null;
    const accountType = values.accountType ?? (metaAccountType === "trainer" ? "trainer" : "learner");

    const fullName =
      values.fullName?.trim() ||
      (typeof meta.full_name === "string" ? meta.full_name : null) ||
      authUser.email?.split("@")[0] ||
      "User";
    const phone =
      values.phone !== undefined
        ? values.phone
        : typeof meta.phone === "string"
          ? meta.phone
          : null;

    // Ensure public profile exists (auth trigger should create LEARNER; wait/retry briefly).
    let user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { role: true },
    });
    if (!user) {
      await new Promise((r) => setTimeout(r, 400));
      user = await prisma.user.findUnique({
        where: { id: authUser.id },
        include: { role: true },
      });
    }
    if (!user) {
      return apiError("User profile is still provisioning. Sign in again in a moment.", 409);
    }

    if (user.isActive === false) return apiError("Account inactive", 403);

    if (accountType === "trainer") {
      const specializations =
        values.specializations ??
        (typeof meta.specializations === "string"
          ? meta.specializations.split(",").map((s) => s.trim()).filter(Boolean)
          : Array.isArray(meta.specializations)
            ? (meta.specializations as unknown[]).map(String)
            : undefined);

      const trainer = await ensureTrainerProfile({
        userId: authUser.id,
        email: (authUser.email ?? user.email).toLowerCase(),
        fullName,
        phone,
        bio:
          values.bio ??
          (typeof meta.bio === "string" ? meta.bio : null),
        experienceYears:
          values.experienceYears ??
          (typeof meta.experience_years === "number" ? meta.experience_years : undefined),
        specializations,
        availability:
          values.availability ??
          (typeof meta.availability === "string" ? meta.availability : undefined),
      });

      return apiSuccess({
        userId: authUser.id,
        email: authUser.email,
        role: "TRAINER",
        trainerId: trainer.id,
        trainerStatus: trainer.status,
        message: "Trainer profile synchronized. An admin may activate your profile.",
      });
    }

    const updated = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        fullName,
        phone,
      },
      include: { role: true },
    });

    const referralCode =
      values.referralCode?.trim().toUpperCase() ||
      (typeof meta.referral_code === "string" ? meta.referral_code.trim().toUpperCase() : undefined);

    if (referralCode) {
      const attached = await referralService.attachReferredUser(
        referralCode,
        authUser.id,
        updated.email,
      );
      if (!attached.ok) {
        if (attached.reason === "invalid") return apiError("Invalid referral code", 422);
        if (attached.reason === "self_referral") {
          return apiError("You cannot claim your own referral code", 422);
        }
        if (attached.reason === "already_claimed") {
          return apiError("Referral code has already been claimed", 409);
        }
      }
    }

    return apiSuccess({
      userId: updated.id,
      email: updated.email,
      role: updated.role.key,
      message: "Profile synchronized.",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
