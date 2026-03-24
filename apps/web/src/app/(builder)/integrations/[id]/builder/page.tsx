import IntegrationBuilderPage from '@/components/builder/IntegrationBuilderPage';

export default function BuilderRoute({ params }: { params: { id: string } }) {
  return <IntegrationBuilderPage integrationId={params.id} />;
}
