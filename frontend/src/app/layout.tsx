import type { Metadata } from 'next';
import './globals.css';
import SessionTimeout from '@/components/SessionTimeout';

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
      <body>
        <SessionTimeout 
          warningTime={300}      // Show warning 5 minutes before expiry
          autoRefresh={true}     // Automatically refresh tokens
          showCountdown={true}   // Display countdown timer
        />
        {children}
      </body>
    </html>
  );
}