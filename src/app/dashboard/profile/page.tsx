import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { officialPhoto, socialPhoto } from "@/lib/profile";
import ProfileForms from "./profile-forms";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [u, trophies] = await Promise.all([
    db.user.findUnique({
      where: { id: me.id },
      select: {
        id: true, fullName: true, preferredName: true, email: true, phone: true,
        dateOfBirth: true, gender: true, idType: true, idNumber: true, crewId: true,
        officialPhotoAt: true, socialPhotoAt: true,
      },
    }),
    db.weeklyResult.count({ where: { winnerId: me.id } }),
  ]);
  if (!u) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">My profile</h1>
        <p className="mt-1 text-sm text-white/50">Your official records and how other members see you.</p>
      </div>
      <ProfileForms
        official={{
          fullName: u.fullName,
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.toISOString().slice(0, 10) : "",
          gender: u.gender ?? "",
          phone: u.phone,
          email: u.email,
          idType: u.idType ?? "",
          idNumber: u.idNumber ?? "",
          photo: officialPhoto(u),
        }}
        social={{
          fullName: u.fullName,
          preferredName: u.preferredName ?? "",
          photo: socialPhoto(u),
          crewId: u.crewId,
          trophies,
        }}
      />
    </div>
  );
}
