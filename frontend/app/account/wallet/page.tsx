import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { WalletClient } from "@/components/wallet/wallet-client";
import { authOptions } from "@/lib/auth";
import { getWalletByUserId } from "@/lib/services/wallet";

export default async function AccountWalletPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const wallet = await getWalletByUserId(session.user.id);

  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <WalletClient
          initialWallet={wallet}
          title="My wallet"
          description="Use your wallet for deposits, withdrawals, and purchase history."
        />
      </main>
      <Footer />
    </>
  );
}
