import { formatCoordinates, formatDateTime, formatTime } from "../lib/format";
import { buildTimeline, hasCoordinates } from "../lib/incidents";
import "./IncidentDetails.css";
import { StatusBadge } from "./StatusBadge";

export function IncidentDetails({
  incident,
  fisher,
  responders,
  errors,
  isLoading,
}) {
  const fisherCount = incident.fisherCount;
  const unavailable = isLoading ? "Loading…" : "Not available";
  const timeline = buildTimeline({ incident, fisher, responders });

  return (
    <aside className="incident-details" aria-label="Incident details">
      <h2 className="incident-details__title">Incident Details</h2>

      {errors.map((message) => (
        <p key={message} className="incident-details__error" role="alert">
          {message}
        </p>
      ))}

      <dl className="incident-details__list">
        <dt>Fisher</dt>
        <dd>{fisher?.full_name ?? unavailable}</dd>
        <dt>No. of fishers</dt>
        <dd>{fisherCount ?? unavailable}</dd>
        <dt>Location</dt>
        <dd>
          {hasCoordinates(incident)
            ? formatCoordinates(incident.latitude, incident.longitude)
            : "Not available"}
        </dd>
        <dt>Time</dt>
        <dd>{formatDateTime(incident.triggeredAt)}</dd>
        <dt>Status</dt>
        <dd>
          <StatusBadge status={incident.status} />
        </dd>
      </dl>

      <h3 className="incident-details__subtitle">Response Timeline</h3>
      <ol className="incident-details__timeline">
        {timeline.map((event) => (
          <li key={event.id} className="incident-details__event">
            <time dateTime={event.at} className="incident-details__time">
              {formatTime(event.at)}
            </time>
            <span>{event.text}</span>
          </li>
        ))}
      </ol>
    </aside>
  );
}
