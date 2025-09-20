export type ContactFormFields = {
  name: string;
  email: string;
  message: string;
};

export type ContactValidationError = {
  field: keyof ContactFormFields;
  error: string;
};

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function validateContact(fields: ContactFormFields): ContactValidationError | null {
  const name = (fields.name || "").trim();
  const email = (fields.email || "").trim();
  const message = (fields.message || "").trim();

  if (!email || !isEmail(email)) {
    return { field: "email", error: "Ogiltig e-postadress" };
  }
  if (!name) {
    return { field: "name", error: "Fyll i ditt namn" };
  }
  if (!message) {
    return { field: "message", error: "Skriv ett meddelande" };
  }
  return null;
}

export function contactSubject(name: string) {
  return `Nytt kontaktmeddelande från ${name}`;
}

export function contactText({ name, email, message }: ContactFormFields) {
  return `Namn: ${name}\nE-post: ${email}\n\nMeddelande:\n${message}`;
}

export function contactHtml({ name, email, message }: ContactFormFields) {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">
      <h2 style="margin:0 0 8px">Nytt kontaktmeddelande</h2>
      <p><strong>Namn:</strong> ${escapeHtml(name)}</p>
      <p><strong>E-post:</strong> ${escapeHtml(email)}</p>
      <p style="white-space:pre-line">${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(v: string) {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
