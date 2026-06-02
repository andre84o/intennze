import type { Metadata } from "next";
import { cookies } from "next/headers";
import PolicyContent from "./PolicyContent";

export async function generateMetadata(): Promise<Metadata> {
  const c = await cookies();
  const lang = c.get("lang")?.value === "en" ? "en" : "sv";
  return lang === "en"
    ? {
        title: "Privacy Policy",
        description: "Privacy policy and information about how we handle your personal data.",
        alternates: { canonical: "/integritetspolicy" },
      }
    : {
        title: "Integritetspolicy",
        description: "Integritetspolicy och information om hur vi hanterar dina personuppgifter.",
        alternates: { canonical: "/integritetspolicy" },
      };
}

export default function IntegritetspolicyPage() {
  return (
    <main className="min-h-screen w-full bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-24 md:py-32">
        <PolicyContent />
      </div>
    </main>
  );
}
