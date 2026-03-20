import { IntegrationsPage } from '@/components/integrations/IntegrationsPage';
import { toIntegrationsViewState } from '@/components/integrations/types';

interface IntegrationsRouteProps {
  searchParams?: {
    view?: string;
  };
}

export default function IntegrationsRoute({ searchParams }: IntegrationsRouteProps) {
  const viewState = toIntegrationsViewState(searchParams?.view);

  return <IntegrationsPage viewState={viewState} />;
}
