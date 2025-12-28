export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-9 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-5 bg-gray-200 rounded w-64"></div>
      </div>

      {/* Form skeleton */}
      <div className="border rounded-lg p-6 space-y-6">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-10 bg-gray-100 rounded"></div>
            </div>
          ))}
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}
