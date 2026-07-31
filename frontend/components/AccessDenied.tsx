import { Shield } from 'lucide-react';

export default function AccessDenied({ 
  message = "You don't have permission to access this page",
  requiredRole = "higher privileges"
}: { 
  message?: string;
  requiredRole?: string;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="bg-red-50 p-6 rounded-full mb-6 shadow-lg">
        <Shield className="w-12 h-12 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Restricted</h2>
      <p className="text-gray-600 max-w-md mb-2">{message}</p>
      <p className="text-sm text-gray-500">Required role: <span className="font-semibold text-red-600">{requiredRole}</span></p>
    </div>
  );
}
