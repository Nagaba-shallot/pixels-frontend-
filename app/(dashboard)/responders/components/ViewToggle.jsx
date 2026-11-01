import { List, Map as MapIcon } from "lucide-react";
import { cx } from "../lib/classNames";
import "./ViewToggle.css";

const OPTIONS = [
  { value: "map", label: "Map View", icon: MapIcon },
  { value: "list", label: "List View", icon: List },
];

/**
 * @param {Object} props
 * @param {"map"|"list"} props.value  Currently selected view
 * @param {(view: "map"|"list") => void} props.onChange
 */
export function ViewToggle({ value, onChange }) {
  return (
    <div className="view-toggle" role="group" aria-label="Choose view">
      {OPTIONS.map(({ value: optionValue, label, icon: Icon }) => {
        const isActive = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={isActive}
            className={cx(
              "view-toggle__option",
              isActive && "view-toggle__option--active",
            )}
            onClick={() => onChange(optionValue)}
          >
            <Icon size={14} aria-hidden="true" /> {label}
          </button>
        );
      })}
    </div>
  );
}
