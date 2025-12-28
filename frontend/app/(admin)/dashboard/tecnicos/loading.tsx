export default function Loading() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="h-9 bg-gray-200 rounded w-48"></div>

      {/* Tabs skeleton */}
      <div className="flex gap-2 border-b">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 w-32 bg-gray-200 rounded-t"></div>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-gray-200 rounded"></div>
          <div className="h-10 w-40 bg-gray-200 rounded"></div>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4 border rounded">
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-48"></div>
                <div className="h-4 bg-gray-100 rounded w-64"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
