import { redirect } from 'next/navigation';

export default function LegacyMappingsPage({ params }: { params: { id: string } }) {
  redirect(`/integrations/${params.id}/mapping`);
}
