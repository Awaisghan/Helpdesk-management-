import type { Metadata } from 'next';
import './globals.css';
import { PreviewProvider } from '@/components/preview-provider';

export const metadata: Metadata = {
  title: 'CodxPy Helpdesk — Software support, clearly managed',
  description: 'CodxPy software support for bug reports, technical help, account access and feature requests.',
  icons: { icon: '/codxpy.svg' },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="en"><body><PreviewProvider>{children}</PreviewProvider></body></html>;
}
