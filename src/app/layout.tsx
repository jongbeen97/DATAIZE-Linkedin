import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/shared/ui/toast';

export const metadata: Metadata = {
  title: 'DATAIZE Admin — LinkedIn 운영 관리자',
  description: 'LinkedIn SNS 게시·성과·유입을 한 곳에서 관리하는 운영자용 관리자 페이지',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
