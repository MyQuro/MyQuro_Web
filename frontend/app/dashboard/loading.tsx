export default function Loading() {
  return (
    <div className="h-[calc(100vh-5rem)] w-full flex flex-col items-center justify-center bg-gray-50/50 backdrop-blur-sm">
      <div className="relative w-16 h-16">
        {/* Outer Ring */}
        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
        {/* Spinning Ring */}
        <div className="absolute inset-0 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        {/* Inner Pulse */}
        <div className="absolute inset-4 bg-red-100 rounded-full animate-pulse"></div>
      </div>
      <p className="mt-4 text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );
}
