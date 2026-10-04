import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SellerDashboardNav } from "@/components/seller/seller-dashboard-nav";
import { SellerSettingsForm } from "@/components/seller/seller-settings-form";
import { authOptions } from "@/lib/auth";
import { getSellerProfileByUserId } from "@/lib/services/seller-profile";

export default async function SellerSettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    redirect("/");
  }

  const profile = await getSellerProfileByUserId(session.user.id);

  if (!profile) {
    redirect("/farmer/dashboard");
  }

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="space-y-6">
          <SellerDashboardNav />
          <SellerSettingsForm initialProfile={profile} />
        </div>
      </main>
      <Footer />
    </>
  );
}
