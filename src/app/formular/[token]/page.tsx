import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import QuestionnaireClient from "./QuestionnaireClient";

export const metadata = {
  title: "Frågeformulär | intenzze",
};

// Use service role for public access (no auth required)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Fetch questionnaire by public_token
  const { data: questionnaire, error } = await supabase
    .from("questionnaires")
    .select(`
      *,
      customer:customers(first_name, last_name, company_name)
    `)
    .eq("public_token", token)
    .single();

  if (error || !questionnaire) {
    notFound();
  }

  // Check if already completed
  if (questionnaire.status === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Formuläret är redan besvarat</h1>
          <p className="text-gray-600 mb-6">
            Tack! Vi har redan tagit emot dina svar och återkommer snart.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">i</span>
            </div>
            intenzze
          </div>
        </div>
      </div>
    );
  }

  // Check if expired
  if (questionnaire.expires_at && new Date(questionnaire.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Länken har gått ut</h1>
          <p className="text-gray-600 mb-6">
            Kontakta oss för att få en ny länk till formuläret.
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
              <span className="text-white font-bold text-xs">i</span>
            </div>
            intenzze
          </div>
        </div>
      </div>
    );
  }

  const customerName = questionnaire.customer
    ? `${questionnaire.customer.first_name} ${questionnaire.customer.last_name}`
    : "där";

  return (
    <QuestionnaireClient
      token={token}
      customerName={customerName}
      companyName={questionnaire.customer?.company_name || null}
    />
  );
}
