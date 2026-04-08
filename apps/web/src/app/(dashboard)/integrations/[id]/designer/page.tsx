import { redirect } from 'next/navigation';

export default function DesignerPage({ params }: { params: { id: string } }) {
  redirect(`/integrations/${params.id}/builder`);
}
