export default function ClientPortal() {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your Wedding Journey</h1>
        <p className="text-sm text-gray-600 mt-1">Everything you need in one place</p>
      </div>

      <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl shadow-lg p-8 text-center">
        <div className="text-7xl mb-4">💍</div>
        <h2 className="text-xl font-bold text-purple-900 mb-2">Your Big Day Awaits</h2>
        <p className="text-purple-700 text-sm">
          Your wedding planner will share all the details here
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-lg shadow p-4 text-center border border-gray-200">
          <div className="text-3xl mb-2">📋</div>
          <p className="text-xs font-semibold text-gray-700">Checklist</p>
          <p className="text-xs text-gray-500 mt-1">0 tasks</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 text-center border border-gray-200">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-xs font-semibold text-gray-700">Guest List</p>
          <p className="text-xs text-gray-500 mt-1">0 guests</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 text-center border border-gray-200">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-xs font-semibold text-gray-700">Budget</p>
          <p className="text-xs text-gray-500 mt-1">Not set</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 text-center border border-gray-200">
          <div className="text-3xl mb-2">📸</div>
          <p className="text-xs font-semibold text-gray-700">Photos</p>
          <p className="text-xs text-gray-500 mt-1">0 photos</p>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-xs text-purple-800 text-center">
          📱 This portal is optimized for your mobile device. Check back for updates from your planner!
        </p>
      </div>
    </div>
  )
}
