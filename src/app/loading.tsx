export default function Loading() {
  return (
    <div className="container section" aria-label="Loading content">
      <div className="skeleton skeleton-title" />
      <div className="campaign-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
    </div>
  );
}
