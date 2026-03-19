import ProtectedRoute from "@/components/ProtectedRoute"
import AdminDashboard from "@/app/admin/page"

export default function MemberDashboardPage() {
  return (
    <ProtectedRoute>
      <AdminDashboard initialPage="dashboard" />
    </ProtectedRoute>
  )
}
