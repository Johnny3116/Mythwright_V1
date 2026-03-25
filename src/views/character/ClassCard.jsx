export function ClassCard({ classData }) {
  return <div className="class-card">{classData?.name ?? 'Class Card — Coming Soon'}</div>;
}
