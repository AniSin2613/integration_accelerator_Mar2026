import { PlatformAdminShell } from '@/components/platform-admin/PlatformAdminShell';

export default function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  return <PlatformAdminShell>{children}</PlatformAdminShell>;
}
