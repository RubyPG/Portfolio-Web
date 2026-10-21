import styles from "./About.module.css";

export function About() {
  return (
    <section
      id="sobre-mi"
      className={styles.section}
      aria-labelledby="about-title"
      tabIndex={-1}
    >
      <div className={styles.content}>
        <div className={styles.heading} data-about-copy>
          <h2 id="about-title" className={styles.title}>
            SOBRE <span>MÍ</span>
          </h2>
          <a href="#stack" className={styles.back} data-about-back>
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
            Volver al stack
          </a>
        </div>

        <div className={styles.copy} data-about-copy>
          <p className={styles.lead}>
            Soy Rubén. Me gusta seguir descubriendo.
          </p>
          <p>
            Aprendo rápido y me mantengo al día. La IA forma parte de esa
            exploración: una herramienta más para ampliar lo que sé y lo que
            puedo hacer.
          </p>
          <p>
            Me adapto a nuevos retos y estoy abierto a distintas formas de
            trabajar. Siempre hay algo que aprender.
          </p>
          <span className={styles.signature} aria-hidden="true">
            RubenPG
          </span>
          <a href="#contacto" className={styles.next} data-contact-open>
            Hablemos
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M5 12h14m-7-7 7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
