'use client';

import { useCurrentUser } from '@/features/auth/AuthProvider';
import { BrandDashboard } from '@/features/dashboard/BrandDashboard';
import { CreatorDashboard } from '@/features/dashboard/CreatorDashboard';

export default function DashboardPage() {
  const user = useCurrentUser();
  return user.role === 'brand' ? <BrandDashboard /> : <CreatorDashboard />;
}
