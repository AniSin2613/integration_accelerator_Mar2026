import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { toDashboardViewState } from '@/components/dashboard/types';

interface DashboardRouteProps {
  searchParams?: {
    view?: string;
  };
}

export default function DashboardRoute({ searchParams }: DashboardRouteProps) {
  const viewState = toDashboardViewState(searchParams?.view);

  return <DashboardPage viewState={viewState} />;
}
