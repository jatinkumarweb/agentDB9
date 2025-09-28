import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Workspace - AgentDB9',
  description: 'VS Code workspace for AI agent development',
};

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen overflow-hidden">
      {children}
    </div>
  );
}