import { redirect } from 'next/navigation';

export default function NewIntegrationRoute() {
  redirect('/integrations/new/blank');
}
