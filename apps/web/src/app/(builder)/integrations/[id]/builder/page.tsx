import IntegrationBuilderPage from '@/components/builder/IntegrationBuilderPage';
import { headers } from 'next/headers';

export default function BuilderRoute({ params }: { params: { id: string } }) {
  const ua = headers().get('user-agent') ?? '';
  const forceMobileUnsupported = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  return <IntegrationBuilderPage integrationId={params.id} forceMobileUnsupported={forceMobileUnsupported} />;
}
