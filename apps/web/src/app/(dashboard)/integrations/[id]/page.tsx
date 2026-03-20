import { IntegrationOverviewPage } from '@/components/integration-overview/IntegrationOverviewPage';
import { toIntegrationOverviewViewState } from '@/components/integration-overview/types';

interface IntegrationOverviewRouteProps {
  params: {
    id: string;
  };
  searchParams?: {
    view?: string;
  };
}

export default function IntegrationOverviewRoute({ params, searchParams }: IntegrationOverviewRouteProps) {
  const viewState = toIntegrationOverviewViewState(searchParams?.view);

  return <IntegrationOverviewPage integrationId={params.id} viewState={viewState} />;
}
