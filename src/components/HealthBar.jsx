export function HealthBar({ current, max, label }) {
  return (
    <div className="health-bar">
      <span className="health-bar__label">{label}</span>
      <div className="health-bar__track">
        <div
          className="health-bar__fill"
          style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
        />
      </div>
      <span className="health-bar__text">{current}/{max}</span>
    </div>
  );
}
