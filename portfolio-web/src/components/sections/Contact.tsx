import { ContactForm } from "@/components/ui/ContactForm";
import styles from "./Contact.module.css";

export interface ContactChannels {
  email: string | null;
  github?: string | null;
  linkedin?: string | null;
}

function OutwardArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M6 18 18 6M6 6h12v12" />
    </svg>
  );
}

export function Contact({ contact }: { contact: ContactChannels }) {
  const socials = [
    { label: "GitHub", url: contact.github },
    { label: "LinkedIn", url: contact.linkedin },
  ].filter((social): social is { label: string; url: string } =>
    Boolean(social.url),
  );

  return (
    <section
      id="contacto"
      className={styles.section}
      aria-labelledby="contact-title"
      tabIndex={-1}
    >
      <div className={styles.content}>
        <div className={styles.presentation} data-contact-copy>
          <h2 id="contact-title" className={styles.title}>
            HABLEMOS
          </h2>
          <p className={styles.intro}>
            Una idea, una oportunidad o una conversación.
          </p>

          {contact.email && (
            <div className={styles.emailGroup}>
              <a className={styles.email} href={`mailto:${contact.email}`}>
                <span>{contact.email}</span>
                <OutwardArrow />
              </a>
            </div>
          )}

          {socials.length > 0 && (
            <nav className={styles.socials} aria-label="Perfiles de contacto">
              {socials.map((social) => (
                <a key={social.label} href={social.url}>
                  {social.label}
                  <OutwardArrow />
                </a>
              ))}
            </nav>
          )}
        </div>

        <div className={styles.form} data-contact-copy>
          <ContactForm />
        </div>
      </div>

      <div className={styles.navigation} data-contact-copy>
        <a href="#sobre-mi" className={styles.back} data-contact-back>
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M19 12H5m7-7-7 7 7 7" />
          </svg>
          Volver a sobre mí
        </a>
      </div>
    </section>
  );
}
