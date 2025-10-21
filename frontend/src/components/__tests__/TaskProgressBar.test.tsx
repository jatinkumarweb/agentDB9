import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TaskProgressBar, TaskPlan } from '../TaskProgressBar';

describe('TaskProgressBar', () => {
  const mockTaskPlan: TaskPlan = {
    id: 'plan_123',
    objective: 'Create React application',
    description: 'Set up a new React app with TypeScript',
    estimatedSteps: 5,
    estimatedDuration: '5-10 minutes',
    requiresApproval: true,
    createdAt: new Date(),
    milestones: [
      {
        id: 'milestone_1',
        order: 1,
        title: 'Initialize project',
        description: 'Create project structure',
        type: 'command_execution',
        status: 'completed',
        requiresApproval: true,
        tools: ['execute_command'],
        startedAt: new Date(),
        completedAt: new Date(),
      },
      {
        id: 'milestone_2',
        order: 2,
        title: 'Install dependencies',
        description: 'Install React and TypeScript',
        type: 'command_execution',
        status: 'in_progress',
        requiresApproval: true,
        tools: ['execute_command'],
        startedAt: new Date(),
      },
      {
        id: 'milestone_3',
        order: 3,
        title: 'Configure TypeScript',
        description: 'Set up tsconfig.json',
        type: 'file_operation',
        status: 'pending',
        requiresApproval: false,
        tools: ['write_file'],
      },
      {
        id: 'milestone_4',
        order: 4,
        title: 'Create components',
        description: 'Generate initial components',
        type: 'file_operation',
        status: 'pending',
        requiresApproval: false,
        tools: ['write_file', 'create_directory'],
      },
      {
        id: 'milestone_5',
        order: 5,
        title: 'Verify setup',
        description: 'Run tests and verify installation',
        type: 'validation',
        status: 'pending',
        requiresApproval: false,
        tools: ['execute_command'],
      },
    ],
  };

  describe('Header Section', () => {
    it('should render task objective', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      expect(screen.getByText('Create React application')).toBeInTheDocument();
    });

    it('should render task description', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      expect(screen.getByText('Set up a new React app with TypeScript')).toBeInTheDocument();
    });

    it('should show completion count badge', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      expect(screen.getByText('1/5 Complete')).toBeInTheDocument();
    });

    it('should show estimated duration', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      expect(screen.getByText(/5-10 minutes/)).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('should calculate percentage correctly', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      // 1 completed out of 5 = 20%
      expect(screen.getByText('Progress: 20%')).toBeInTheDocument();
    });

    it('should use provided percentage if given', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} percentage={50} />);
      expect(screen.getByText('Progress: 50%')).toBeInTheDocument();
    });

    it('should show completed count', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      expect(screen.getByText(/1 completed/)).toBeInTheDocument();
    });

    it('should show in progress count', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      expect(screen.getByText(/1 in progress/)).toBeInTheDocument();
    });

    it('should show failed count when there are failures', () => {
      const taskPlanWithFailure: TaskPlan = {
        ...mockTaskPlan,
        milestones: [
          ...mockTaskPlan.milestones.slice(0, 2),
          {
            ...mockTaskPlan.milestones[2],
            status: 'failed',
            error: 'Configuration error',
          },
          ...mockTaskPlan.milestones.slice(3),
        ],
      };

      render(<TaskProgressBar taskPlan={taskPlanWithFailure} />);
      expect(screen.getByText(/1 failed/)).toBeInTheDocument();
    });
  });

  describe('Milestone List', () => {
    it('should render all milestones', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      expect(screen.getByText('1. Initialize project')).toBeInTheDocument();
      expect(screen.getByText('2. Install dependencies')).toBeInTheDocument();
      expect(screen.getByText('3. Configure TypeScript')).toBeInTheDocument();
      expect(screen.getByText('4. Create components')).toBeInTheDocument();
      expect(screen.getByText('5. Verify setup')).toBeInTheDocument();
    });

    it('should show milestone descriptions', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      expect(screen.getByText('Create project structure')).toBeInTheDocument();
      expect(screen.getByText('Install React and TypeScript')).toBeInTheDocument();
    });

    it('should show milestone type badges', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      // Should have command_execution, file_operation, and validation badges
      expect(screen.getAllByText(/command execution/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/file operation/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/validation/i).length).toBeGreaterThan(0);
    });

    it('should show "Requires Approval" badge for milestones that need approval', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      const approvalBadges = screen.getAllByText('Requires Approval');
      expect(approvalBadges.length).toBe(2); // First two milestones require approval
    });

    it('should show tool badges', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      expect(screen.getAllByText('execute_command').length).toBeGreaterThan(0);
      expect(screen.getAllByText('write_file').length).toBeGreaterThan(0);
      expect(screen.getAllByText('create_directory').length).toBeGreaterThan(0);
    });
  });

  describe('Milestone Status Indicators', () => {
    it('should show completed status for completed milestones', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      // First milestone is completed - should have checkmark icon
      const completedMilestone = screen.getByText('1. Initialize project').closest('div');
      expect(completedMilestone).toHaveClass(/green/);
    });

    it('should show in progress status for active milestones', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      // Second milestone is in progress
      const inProgressMilestone = screen.getByText('2. Install dependencies').closest('div');
      expect(inProgressMilestone).toHaveClass(/blue/);
      expect(screen.getByText('In progress...')).toBeInTheDocument();
    });

    it('should show pending status for pending milestones', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      // Third milestone is pending
      const pendingMilestone = screen.getByText('3. Configure TypeScript').closest('div');
      expect(pendingMilestone).toHaveClass(/gray/);
    });

    it('should show failed status with error message', () => {
      const taskPlanWithFailure: TaskPlan = {
        ...mockTaskPlan,
        milestones: [
          ...mockTaskPlan.milestones.slice(0, 2),
          {
            ...mockTaskPlan.milestones[2],
            status: 'failed',
            error: 'TypeScript configuration failed',
          },
          ...mockTaskPlan.milestones.slice(3),
        ],
      };

      render(<TaskProgressBar taskPlan={taskPlanWithFailure} />);
      
      expect(screen.getByText(/TypeScript configuration failed/)).toBeInTheDocument();
    });
  });

  describe('Milestone Type Colors', () => {
    it('should apply correct color for analysis type', () => {
      const taskPlanWithAnalysis: TaskPlan = {
        ...mockTaskPlan,
        milestones: [
          {
            ...mockTaskPlan.milestones[0],
            type: 'analysis',
          },
        ],
      };

      render(<TaskProgressBar taskPlan={taskPlanWithAnalysis} />);
      
      const analysisType = screen.getByText(/analysis/i);
      expect(analysisType).toHaveClass(/purple/);
    });

    it('should apply correct color for file_operation type', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      const fileOperationType = screen.getAllByText(/file operation/i)[0];
      expect(fileOperationType).toHaveClass(/blue/);
    });

    it('should apply correct color for command_execution type', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      const commandType = screen.getAllByText(/command execution/i)[0];
      expect(commandType).toHaveClass(/orange/);
    });

    it('should apply correct color for validation type', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      const validationType = screen.getByText(/validation/i);
      expect(validationType).toHaveClass(/green/);
    });

    it('should apply correct color for git_operation type', () => {
      const taskPlanWithGit: TaskPlan = {
        ...mockTaskPlan,
        milestones: [
          {
            ...mockTaskPlan.milestones[0],
            type: 'git_operation',
          },
        ],
      };

      render(<TaskProgressBar taskPlan={taskPlanWithGit} />);
      
      const gitType = screen.getByText(/git operation/i);
      expect(gitType).toHaveClass(/indigo/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle task plan with no milestones', () => {
      const emptyTaskPlan: TaskPlan = {
        ...mockTaskPlan,
        milestones: [],
      };

      render(<TaskProgressBar taskPlan={emptyTaskPlan} />);
      
      expect(screen.getByText('Create React application')).toBeInTheDocument();
      expect(screen.getByText('0/0 Complete')).toBeInTheDocument();
    });

    it('should handle all milestones completed', () => {
      const completedTaskPlan: TaskPlan = {
        ...mockTaskPlan,
        milestones: mockTaskPlan.milestones.map(m => ({
          ...m,
          status: 'completed' as const,
          completedAt: new Date(),
        })),
      };

      render(<TaskProgressBar taskPlan={completedTaskPlan} />);
      
      expect(screen.getByText('5/5 Complete')).toBeInTheDocument();
      expect(screen.getByText('Progress: 100%')).toBeInTheDocument();
    });

    it('should handle task plan without estimated duration', () => {
      const taskPlanNoDuration: TaskPlan = {
        ...mockTaskPlan,
        estimatedDuration: undefined,
      };

      render(<TaskProgressBar taskPlan={taskPlanNoDuration} />);
      
      expect(screen.queryByText(/minutes/)).not.toBeInTheDocument();
    });

    it('should handle milestone without tools', () => {
      const taskPlanNoTools: TaskPlan = {
        ...mockTaskPlan,
        milestones: [
          {
            ...mockTaskPlan.milestones[0],
            tools: [],
          },
        ],
      };

      render(<TaskProgressBar taskPlan={taskPlanNoTools} />);
      
      // Should still render milestone without crashing
      expect(screen.getByText('1. Initialize project')).toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <TaskProgressBar taskPlan={mockTaskPlan} className="custom-class" />
      );
      
      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('should use custom currentStep and totalSteps', () => {
      render(
        <TaskProgressBar 
          taskPlan={mockTaskPlan} 
          currentStep={3} 
          totalSteps={10} 
        />
      );
      
      // These props don't directly affect display in current implementation
      // but should not cause errors
      expect(screen.getByText('Create React application')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      const heading = screen.getByRole('heading', { name: /Create React application/i });
      expect(heading).toBeInTheDocument();
    });

    it('should have descriptive text for screen readers', () => {
      render(<TaskProgressBar taskPlan={mockTaskPlan} />);
      
      // Progress information should be accessible
      expect(screen.getByText(/Progress: 20%/)).toBeInTheDocument();
      expect(screen.getByText(/1\/5 Complete/)).toBeInTheDocument();
    });
  });
});
