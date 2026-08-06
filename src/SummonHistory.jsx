export default function SummonHistory({ onBack }) {
  return (
    <div className="page-card">
      <button className="back-btn" onClick={onBack}>&larr; Back</button>
      <h1>Pull Tracking</h1>
      <p className="subtitle">
        Stub for now. This will track your actual pull history, not simulate it.
      </p>
    </div>
  );
}