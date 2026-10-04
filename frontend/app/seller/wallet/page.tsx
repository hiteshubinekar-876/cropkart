import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SellerDashboardNav } from "@/components/seller/seller-dashboard-nav";
import { WalletClient } from "@/components/wallet/wallet-client";
import { authOptions } from "@/lib/auth";
import { getWalletByUserId } from "@/lib/services/wallet";

export default async function SellerWalletPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!["farmer", "admin"].includes(session.user.role)) {
    redirect("/");
  }

  const wallet = await getWalletByUserId(session.user.id);

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <div className="space-y-6">
          <SellerDashboardNav />
          <WalletClient
            initialWallet={wallet}
            title="Seller wallet"
            description="Track payouts, top up the wallet, and review your transaction history."
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
