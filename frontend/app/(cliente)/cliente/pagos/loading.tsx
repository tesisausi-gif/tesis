export default function Loading() {
    return (
        <div className="space-y-4 px-4 py-6">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>

            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-20 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>

            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="border rounded-lg p-6 space-y-4">
                        <div className="flex justify-between">
                            <div className="space-y-2">
                                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse"></div>
                                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
                            </div>
                            <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                        <div className="h-16 bg-gray-200 rounded animate-pulse"></div>
                        <div className="grid grid-cols-3 gap-4">
                            {[1, 2, 3].map((j) => (
                                <div key={j} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
