import { TemplatesPage } from '@/components/templates/TemplatesPage';
import { toTemplatesViewState } from '@/components/templates/types';

interface TemplatesRouteProps {
  searchParams?: {
    view?: string;
  };
}

export default function TemplatesRoute({ searchParams }: TemplatesRouteProps) {
  const viewState = toTemplatesViewState(searchParams?.view);

  return <TemplatesPage viewState={viewState} />;
}
