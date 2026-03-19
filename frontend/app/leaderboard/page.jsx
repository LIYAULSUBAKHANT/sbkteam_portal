import ProtectedRoute from "@/components/ProtectedRoute"
import AdminDashboard from "@/app/admin/page"

export default function LeaderboardPage() {
  return (
    <ProtectedRoute blockMembers>
      <AdminDashboard initialPage="leaderboard" />
    </ProtectedRoute>
  )
}
