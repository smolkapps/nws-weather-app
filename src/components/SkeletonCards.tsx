/** Placeholder cards shown while the first forecast loads. */
export function SkeletonCards() {
  return (
    <div aria-hidden="true">
      <div className="card skeleton-card">
        <div className="skeleton-line w-40" />
        <div className="skeleton-line w-25 tall" />
        <div className="skeleton-line w-60" />
      </div>
      <div className="card skeleton-card">
        <div className="skeleton-line w-30" />
        <div className="skeleton-line w-90" />
        <div className="skeleton-line w-80" />
        <div className="skeleton-line w-85" />
      </div>
    </div>
  );
}
