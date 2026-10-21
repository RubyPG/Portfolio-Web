import { stackGroups, type StackTechnology } from "@/data/stack";
import { TechText } from "@/components/ui/TechText";
import styles from "./TechStack.module.css";

function Technology({ technology }: { technology: StackTechnology }) {
  return (
    <li className={styles.technology} data-technology={technology.name}>
      {technology.icon && (
        <span className={styles.mark} aria-hidden="true">
          <span
            className={styles.icon}
            style={{ maskImage: `url("${technology.icon}")` }}
          />
        </span>
      )}
      <span className={styles.name}>{technology.name}</span>
    </li>
  );
}

export function TechStack() {
  return (
    <section
      id="stack"
      className={styles.section}
      aria-labelledby="stack-title"
      tabIndex={-1}
      data-stack-content
    >
      <div className={styles.heading}>
        <div data-stack-heading>
          <h2 id="stack-title" className={styles.title}>
            <TechText text="MI" /> <TechText text="STACK" />
          </h2>
          <p className={styles.intro}>
            Tecnologías usadas en proyectos en producción.
          </p>
          <a className={styles.back} href="#proyectos" data-stack-back>
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
            <span>Volver a proyectos</span>
          </a>
        </div>
      </div>

      <div className={styles.groups}>
        {stackGroups.map((group) => (
          <div
            key={group.id}
            className={styles.group}
            role="group"
            data-stack-group
            aria-labelledby={`stack-${group.id}`}
          >
            <h3 id={`stack-${group.id}`} className={styles.groupTitle}>
              {group.title}
            </h3>
            <ul className={styles.primary}>
              {group.primary.map((technology) => (
                <Technology key={technology.name} technology={technology} />
              ))}
            </ul>
            <ul className={styles.additional}>
              {group.additional.map((technology) => (
                <Technology key={technology.name} technology={technology} />
              ))}
            </ul>
          </div>
        ))}
        <a className={styles.back} href="#sobre-mi" data-about-open>
          <span>Sobre mí</span>
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
    </section>
  );
}
