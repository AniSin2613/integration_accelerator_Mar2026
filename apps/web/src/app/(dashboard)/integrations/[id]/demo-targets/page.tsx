import { DemoTargetReceiptsPage } from '@/components/builder/DemoTargetReceiptsPage';

export default function IntegrationDemoTargetsRoute({ params }: { params: { id: string } }) {
  return <DemoTargetReceiptsPage integrationId={params.id} />;
}
