import ProtectedRoute from "@/components/ProtectedRoute"
import AdminDashboard from "@/app/admin/page"

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requireAdmin>
      <AdminDashboard initialPage="dashboard" />
    </ProtectedRoute>
  )
}
