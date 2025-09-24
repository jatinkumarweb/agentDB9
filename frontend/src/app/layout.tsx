import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentDB9 Coding Agent',
  description: 'AI-powered coding agent environment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}