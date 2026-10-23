export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  _gotcha: string;
}

export type ContactField = "name" | "email" | "message";
export type ContactErrors = Partial<Record<ContactField, string>>;

export function validateContactMessage(values: ContactMessage): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.name.trim()) errors.name = "Indica tu nombre.";
  else if (values.name.trim().length > 100)
    errors.name = "El nombre no puede superar los 100 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
    errors.email = "Escribe un correo válido para poder responderte.";
  else if (values.email.trim().length > 254)
    errors.email = "El correo es demasiado largo.";
  if (!values.message.trim()) errors.message = "Cuéntame qué tienes en mente.";
  else if (values.message.trim().length > 5000)
    errors.message = "El mensaje no puede superar los 5.000 caracteres.";
  return errors;
}

/** Only the public form ID belongs in the client; never SMTP or API credentials. */
export function getContactEndpoint(formId: string | undefined) {
  const id = formId?.trim();
  return id && /^[a-zA-Z0-9]{8,32}$/.test(id)
    ? `https://formspree.io/f/${id}`
    : null;
}

type ContactResult =
  { ok: true } | { ok: false; message: string; fields?: ContactErrors };

/** No retries: a lost response may still correspond to an accepted submission. */
export async function sendContactMessage(
  endpoint: string,
  values: ContactMessage,
  signal: AbortSignal,
): Promise<ContactResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      name: values.name.trim(),
      email: values.email.trim(),
      message: values.message.trim(),
      _gotcha: values._gotcha,
      _subject: "Nuevo mensaje desde el portfolio de RubenPG",
    }),
    signal,
    credentials: "omit",
    redirect: "error",
  });
  const body: unknown = await response.json();
  const data =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  // Formspree's official client recognizes { next: string } as success,
  // after checking error/error(s). Keep explicit ok responses compatible too.
  const hasErrors = data !== null && ("error" in data || "errors" in data);
  if (
    response.ok &&
    data &&
    !hasErrors &&
    data.ok !== false &&
    (data.ok === true ||
      (typeof data.next === "string" && data.next.trim().length > 0))
  )
    return { ok: true };

  const fields: ContactErrors = {};
  let verificationFailed = false;
  if (data && Array.isArray(data.errors)) {
    for (const error of data.errors) {
      if (!error || typeof error !== "object") continue;
      if (
        error.field === "g-recaptcha-response" ||
        error.field === "h-captcha-response" ||
        error.field === "cf-turnstile-response"
      )
        verificationFailed = true;
      if (error.field === "email")
        fields.email = "Revisa este correo e inténtalo de nuevo.";
      if (error.field === "name")
        fields.name = "Revisa tu nombre e inténtalo de nuevo.";
      if (error.field === "message")
        fields.message = "Revisa el mensaje e inténtalo de nuevo.";
    }
  }
  return {
    ok: false,
    fields,
    message:
      response.status === 429
        ? "El envío está temporalmente limitado. Espera un poco o escríbeme por correo."
        : verificationFailed
          ? "No se ha podido completar la verificación de seguridad. Tu mensaje sigue aquí; puedes escribirme por correo."
          : "No se ha podido enviar el mensaje. Tus datos siguen aquí; prueba de nuevo o escríbeme por correo.",
  };
}
