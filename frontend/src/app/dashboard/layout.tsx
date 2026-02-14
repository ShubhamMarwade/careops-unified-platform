import DashboardLayout from '@/components/layout/DashboardLayout';
import CareOpsGPT from "@/components/layout/CareOpsGPT";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout>
      {children}
      <CareOpsGPT />
    </DashboardLayout>
  );
}
