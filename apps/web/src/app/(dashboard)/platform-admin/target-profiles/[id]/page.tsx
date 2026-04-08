import { TargetProfileDetailPage } from '@/components/platform-admin/TargetProfileDetailPage';

export default function TargetProfileDetailRoute({ params }: { params: { id: string } }) {
  return <TargetProfileDetailPage profileId={params.id} />;
}
