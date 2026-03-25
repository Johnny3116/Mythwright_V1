export function StatCard({ label, value, icon }) {
  return (
    <div className="stat-card">
      {icon && <span className="stat-card__icon">{icon}</span>}
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  );
}
