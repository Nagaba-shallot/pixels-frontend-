import { formatDistance } from "../lib/format";
import { sortByDistance } from "../lib/responders";
import "./NearestResponders.css";
import { Section } from "./Section";

export function NearestResponders({ responders }) {
  return (
    <Section title="Nearest fishers">
      {responders.length === 0 && (
        <p className="nearest-responders__empty">Nothing to show yet.</p>
      )}
      <div className="nearest-responders__grid">
        {sortByDistance(responders).map((responder) => (
          <article key={responder.id} className="nearest-responders__card">
            <h3 className="nearest-responders__name">{responder.name}</h3>
            <div className="nearest-responders__details">
              <p className="nearest-responders__line">
                {responder.phone ?? "No phone"}
              </p>
              {responder.distance_km != null && (
                <p className="nearest-responders__line">
                  {formatDistance(responder.distance_km)}
                </p>
              )}
              {responder.phone && (
                <a
                  className="nearest-responders__contact"
                  href={`tel:${responder.phone.replace(/\s/g, "")}`}
                >
                  Contact
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
