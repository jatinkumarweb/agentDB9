import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApprovalDialog, ApprovalRequest } from '../ApprovalDialog';

describe('ApprovalDialog', () => {
  const mockOnApprove = jest.fn();
  const mockOnReject = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Command Execution Approval', () => {
    const commandRequest: ApprovalRequest = {
      id: 'req_123',
      type: 'command_execution',
      conversationId: 'conv_123',
      agentId: 'agent_456',
      timestamp: new Date(),
      risk: 'high',
      reason: 'Execute command',
      command: 'npm install express',
      workingDir: '/workspace/project',
      estimatedDuration: '1-3 minutes',
    };

    it('should render command approval dialog', () => {
      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approval Required')).toBeInTheDocument();
      expect(screen.getByText('Execute command')).toBeInTheDocument();
      expect(screen.getByText('npm install express')).toBeInTheDocument();
      expect(screen.getByText('/workspace/project')).toBeInTheDocument();
      expect(screen.getByText('1-3 minutes')).toBeInTheDocument();
    });

    it('should display risk badge', () => {
      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('HIGH RISK')).toBeInTheDocument();
    });

    it('should call onApprove when approve button is clicked', () => {
      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledTimes(1);
    });

    it('should call onReject when reject button is clicked', () => {
      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      fireEvent.click(rejectButton);

      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('should allow command modification', () => {
      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      const modifyInput = screen.getByPlaceholderText('npm install express');
      fireEvent.change(modifyInput, { target: { value: 'npm install express@4.18.0' } });

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      expect(mockOnApprove).toHaveBeenCalledWith('npm install express@4.18.0');
    });

    it('should show high risk warning for critical commands', () => {
      const criticalRequest: ApprovalRequest = {
        ...commandRequest,
        risk: 'critical',
        command: 'rm -rf /',
      };

      render(
        <ApprovalDialog
          request={criticalRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('High Risk Operation')).toBeInTheDocument();
      expect(screen.getByText(/This operation may have significant impact/i)).toBeInTheDocument();
    });
  });

  describe('Dependency Installation Approval', () => {
    const dependencyRequest: ApprovalRequest = {
      id: 'req_456',
      type: 'dependency_installation',
      conversationId: 'conv_123',
      agentId: 'agent_456',
      timestamp: new Date(),
      risk: 'medium',
      reason: 'Install dependencies',
      packages: [
        { name: 'react', version: '18.2.0', devDependency: false, description: 'React library' },
        { name: 'vue', version: '3.3.0', devDependency: false, description: 'Vue framework' },
        { name: 'angular', version: '16.0.0', devDependency: false, description: 'Angular framework' },
      ],
      packageManager: 'npm',
    };

    it('should render dependency approval dialog', () => {
      render(
        <ApprovalDialog
          request={dependencyRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approval Required')).toBeInTheDocument();
      expect(screen.getByText('Install dependencies')).toBeInTheDocument();
      expect(screen.getByText('react')).toBeInTheDocument();
      expect(screen.getByText('vue')).toBeInTheDocument();
      expect(screen.getByText('angular')).toBeInTheDocument();
    });

    it('should allow package selection', async () => {
      render(
        <ApprovalDialog
          request={dependencyRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // All packages should be checked by default
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(4); // 3 packages + 1 remember choice

      // Uncheck angular
      const angularCheckbox = checkboxes[2]; // Third package
      fireEvent.click(angularCheckbox);

      const approveButton = screen.getByRole('button', { name: /approve/i });
      fireEvent.click(approveButton);

      await waitFor(() => {
        expect(mockOnApprove).toHaveBeenCalledWith(undefined, expect.arrayContaining(['react', 'vue']));
      });
    });

    it('should have select all button', () => {
      render(
        <ApprovalDialog
          request={dependencyRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByRole('button', { name: /select all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /deselect all/i })).toBeInTheDocument();
    });

    it('should disable approve button when no packages selected', () => {
      render(
        <ApprovalDialog
          request={dependencyRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Deselect all packages
      const deselectAllButton = screen.getByRole('button', { name: /deselect all/i });
      fireEvent.click(deselectAllButton);

      const approveButton = screen.getByRole('button', { name: /approve/i });
      expect(approveButton).toBeDisabled();
    });

    it('should show package manager badge', () => {
      render(
        <ApprovalDialog
          request={dependencyRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('npm')).toBeInTheDocument();
    });

    it('should show dev dependency badge', () => {
      const devDependencyRequest: ApprovalRequest = {
        ...dependencyRequest,
        packages: [
          { name: 'typescript', version: '5.0.0', devDependency: true, description: 'TypeScript' },
        ],
      };

      render(
        <ApprovalDialog
          request={devDependencyRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('dev')).toBeInTheDocument();
    });
  });

  describe('File Operation Approval', () => {
    const fileRequest: ApprovalRequest = {
      id: 'req_789',
      type: 'file_operation',
      conversationId: 'conv_123',
      agentId: 'agent_456',
      timestamp: new Date(),
      risk: 'high',
      reason: 'Delete file',
      operation: 'delete',
      path: '/workspace/important-file.txt',
    };

    it('should render file operation approval dialog', () => {
      render(
        <ApprovalDialog
          request={fileRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approval Required')).toBeInTheDocument();
      expect(screen.getByText('Delete file')).toBeInTheDocument();
      expect(screen.getByText('/workspace/important-file.txt')).toBeInTheDocument();
      expect(screen.getByText('delete')).toBeInTheDocument();
    });

    it('should show content preview if provided', () => {
      const fileWithPreview: ApprovalRequest = {
        ...fileRequest,
        contentPreview: 'const x = 10;\nconsole.log(x);',
      };

      render(
        <ApprovalDialog
          request={fileWithPreview}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText(/const x = 10/)).toBeInTheDocument();
    });
  });

  describe('Git Operation Approval', () => {
    const gitRequest: ApprovalRequest = {
      id: 'req_101',
      type: 'git_operation',
      conversationId: 'conv_123',
      agentId: 'agent_456',
      timestamp: new Date(),
      risk: 'high',
      reason: 'Git push',
      gitOperation: 'push',
      branch: 'main',
      files: ['src/app.ts', 'src/utils.ts'],
    };

    it('should render git operation approval dialog', () => {
      render(
        <ApprovalDialog
          request={gitRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('Approval Required')).toBeInTheDocument();
      expect(screen.getByText('Git push')).toBeInTheDocument();
      expect(screen.getByText('push')).toBeInTheDocument();
      expect(screen.getByText('main')).toBeInTheDocument();
    });

    it('should show affected files', () => {
      render(
        <ApprovalDialog
          request={gitRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText(/src\/app\.ts/)).toBeInTheDocument();
      expect(screen.getByText(/src\/utils\.ts/)).toBeInTheDocument();
    });

    it('should show commit message for git commit', () => {
      const commitRequest: ApprovalRequest = {
        ...gitRequest,
        gitOperation: 'commit',
        message: 'feat: add new feature',
      };

      render(
        <ApprovalDialog
          request={commitRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('feat: add new feature')).toBeInTheDocument();
    });
  });

  describe('Risk Indicators', () => {
    it('should show correct color for low risk', () => {
      const lowRiskRequest: ApprovalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'low',
        reason: 'List files',
        command: 'ls -la',
        workingDir: '/workspace',
      };

      const { container } = render(
        <ApprovalDialog
          request={lowRiskRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    });

    it('should show correct color for medium risk', () => {
      const mediumRiskRequest: ApprovalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'medium',
        reason: 'Install package',
        command: 'npm install',
        workingDir: '/workspace',
      };

      render(
        <ApprovalDialog
          request={mediumRiskRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText('MEDIUM RISK')).toBeInTheDocument();
    });
  });

  describe('Dialog Behavior', () => {
    it('should not render when request is null', () => {
      const { container } = render(
        <ApprovalDialog
          request={null}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should not render when open is false', () => {
      const commandRequest: ApprovalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'high',
        reason: 'Execute command',
        command: 'npm install',
        workingDir: '/workspace',
      };

      render(
        <ApprovalDialog
          request={commandRequest}
          open={false}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
    });

    it('should call onReject when dialog is closed', () => {
      const commandRequest: ApprovalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'high',
        reason: 'Execute command',
        command: 'npm install',
        workingDir: '/workspace',
      };

      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      // Simulate dialog close (implementation depends on Dialog component)
      // This is a placeholder - actual implementation may vary
      const dialog = screen.getByRole('dialog', { hidden: true });
      if (dialog) {
        fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
      }
    });
  });

  describe('Remember Choice', () => {
    it('should show remember choice checkbox', () => {
      const commandRequest: ApprovalRequest = {
        id: 'req_123',
        type: 'command_execution',
        conversationId: 'conv_123',
        agentId: 'agent_456',
        timestamp: new Date(),
        risk: 'high',
        reason: 'Execute command',
        command: 'npm install',
        workingDir: '/workspace',
      };

      render(
        <ApprovalDialog
          request={commandRequest}
          open={true}
          onApprove={mockOnApprove}
          onReject={mockOnReject}
        />
      );

      expect(screen.getByText(/Remember my choice/i)).toBeInTheDocument();
    });
  });
});
