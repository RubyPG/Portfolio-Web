"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { formspreeFormId } from "@/config/contact";
import {
  getContactEndpoint,
  sendContactMessage,
  validateContactMessage,
  type ContactErrors,
  type ContactField,
  type ContactMessage,
} from "@/lib/contact-form";
import styles from "./ContactForm.module.css";

const endpoint = getContactEndpoint(formspreeFormId);
const emptyMessage: ContactMessage = {
  name: "",
  email: "",
  message: "",
  _gotcha: "",
};

export function ContactForm() {
  const [values, setValues] = useState(emptyMessage);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [notice, setNotice] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  function focusError(nextErrors: ContactErrors, preserveNavigation = false) {
    // A response must not steal focus if the visitor has left Contact meanwhile.
    if (
      preserveNavigation &&
      !formRef.current?.contains(document.activeElement)
    )
      return;
    const field = (["name", "email", "message"] as const).find(
      (key) => nextErrors[key],
    );
    if (field)
      formRef.current?.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
  }

  function update(field: ContactField, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => ({ ...previous, [field]: undefined }));
    if (status === "success") {
      setStatus("idle");
      setNotice("");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!endpoint || requestRef.current) return;
    const nextErrors = validateContactMessage(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      setStatus("error");
      setNotice("Revisa los campos indicados antes de enviar.");
      focusError(nextErrors);
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 20000);
    setStatus("sending");
    setNotice("Enviando tu mensaje…");
    try {
      const result = await sendContactMessage(
        endpoint,
        values,
        controller.signal,
      );
      if (!formRef.current) return;
      if (result.ok) {
        setStatus("success");
        setNotice("Mensaje enviado. Gracias por escribirme.");
        setValues(emptyMessage);
      } else {
        setStatus("error");
        setNotice(result.message);
        setErrors(result.fields ?? {});
        focusError(result.fields ?? {}, true);
      }
    } catch {
      if (!formRef.current) return;
      setStatus("error");
      setNotice(
        "No se ha podido confirmar el envío. Tu mensaje sigue aquí; comprueba la conexión o escríbeme por correo.",
      );
    } finally {
      window.clearTimeout(timer);
      requestRef.current = null;
    }
  }

  const sending = status === "sending";
  return (
    <form
      ref={formRef}
      className={styles.form}
      action={endpoint ?? undefined}
      method="post"
      onSubmit={submit}
      noValidate
      aria-label="Enviar un mensaje a Rubén"
      aria-busy={sending}
    >
      <div className={styles.fields}>
        <div className={styles.field}>
          <label htmlFor="contact-name">Tu nombre</label>
          <input
            id="contact-name"
            name="name"
            autoComplete="name"
            maxLength={100}
            required
            value={values.name}
            readOnly={sending}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
          />
          {errors.name && (
            <p id="contact-name-error" className={styles.error}>
              {errors.name}
            </p>
          )}
        </div>
        <div className={styles.field}>
          <label htmlFor="contact-email">Tu correo</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            required
            value={values.email}
            readOnly={sending}
            onChange={(event) => update("email", event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
          />
          {errors.email && (
            <p id="contact-email-error" className={styles.error}>
              {errors.email}
            </p>
          )}
        </div>
        <div className={`${styles.field} ${styles.message}`}>
          <label htmlFor="contact-message">¿Qué tienes en mente?</label>
          <textarea
            id="contact-message"
            name="message"
            rows={4}
            maxLength={5000}
            required
            value={values.message}
            readOnly={sending}
            onChange={(event) => update("message", event.target.value)}
            aria-invalid={Boolean(errors.message)}
            aria-describedby={
              errors.message ? "contact-message-error" : undefined
            }
          />
          {errors.message && (
            <p id="contact-message-error" className={styles.error}>
              {errors.message}
            </p>
          )}
        </div>
      </div>

      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="contact-website">Deja este campo vacío</label>
        <input
          id="contact-website"
          name="_gotcha"
          autoComplete="off"
          tabIndex={-1}
          value={values._gotcha}
          onChange={(event) =>
            setValues((previous) => ({
              ...previous,
              _gotcha: event.target.value,
            }))
          }
        />
      </div>

      <div className={styles.actions}>
        <p className={styles.note}>Te responderé al correo que indiques.</p>
        <button
          type="submit"
          className={styles.submit}
          disabled={sending || !endpoint}
          aria-describedby={!endpoint ? "contact-unavailable" : undefined}
        >
          {sending ? "Enviando…" : "Enviar mensaje"}
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M5 12h14m-6-6 6 6-6 6" />
          </svg>
        </button>
      </div>
      {!endpoint && (
        <p id="contact-unavailable" className={styles.note}>
          El formulario aún no está disponible. Puedes escribirme al correo de
          esta sección.
        </p>
      )}
      <p
        className={`${styles.feedback} ${status === "success" ? styles.success : ""}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice}
      </p>
    </form>
  );
}
