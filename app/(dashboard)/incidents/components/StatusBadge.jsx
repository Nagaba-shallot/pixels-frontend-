import { INCIDENT_STATUS } from "../lib/constants";
import "./StatusBadge.css";

export function StatusBadge({ status }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      {INCIDENT_STATUS[status].label}
    </span>
  );
}
