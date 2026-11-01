import { cx } from "../lib/classNames";
import "./Section.css";

export function Section({ title, action, bordered = false, children }) {
  return (
    <section
      className={cx(
        "responders-section",
        bordered && "responders-section--bordered",
      )}
    >
      <div className="responders-section__header">
        <h2 className="responders-section__title">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
