export default function Loading() {
  return (
    <div className="space-y-4 px-4 py-6 md:px-6 md:py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="space-y-2 mb-6">
        <div className="h-8 bg-gray-200 rounded w-48"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>

      {/* Cards skeleton */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <div className="border-2 rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="h-14 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div className="border-2 rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
          </div>
          <div className="h-14 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  )
}
