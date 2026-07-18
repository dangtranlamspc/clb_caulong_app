export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="h-8 bg-gray-200 rounded w-64 animate-pulse" />
      <div className="card h-32 animate-pulse bg-gray-100" />
      <div className="card h-64 animate-pulse bg-gray-100" />
    </div>
  );
}
