import { ChatAssistant } from "@/components/chat/chat-assistant";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { SectionHeading } from "@/components/shared/section-heading";

export const metadata = {
  title: "Chat Assistant",
};

export default function ChatPage() {
  return (
    <>
      <Navbar />
      <main className="shell py-10">
        <SectionHeading
          eyebrow="Smart assistant"
          title="CropSathi assistant connected to CropKart"
          description="CropSathi answers through the CropKart FastAPI gateway and LangFlow agent, with page context passed along when available."
        />

        <div className="mt-8">
          <ChatAssistant />
        </div>
      </main>
      <Footer />
    </>
  );
}
