export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Skeleton filtros */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 animate-pulse">
        <div className="h-5 w-24 bg-gray-200 rounded-lg" />
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="flex gap-2">
                <div className="h-8 w-16 bg-gray-100 rounded-full" />
                <div className="h-8 w-20 bg-gray-100 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton contador */}
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-gray-200 rounded animate-pulse" />
        <div className="h-8 w-20 bg-gray-100 rounded-xl animate-pulse" />
      </div>

      {/* Skeleton grid de productos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded" />
              <div className="h-3 w-1/2 bg-gray-100 rounded" />
              <div className="flex gap-1">
                {[1, 2, 3].map(j => (
                  <div key={j} className="w-3.5 h-3.5 bg-gray-200 rounded-full" />
                ))}
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="h-5 w-16 bg-gray-200 rounded" />
                <div className="h-6 w-14 bg-blue-50 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
