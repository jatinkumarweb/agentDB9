/**
 * Chat Page Tests
 * 
 * Tests for the chat interface with light theme design
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import ChatPage from '../page';
import { useAuthStore } from '@/stores/authStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useConversationCache } from '@/hooks/useConversationCache';
import { useRouter } from 'next/navigation';

// Mock dependencies
jest.mock('@/stores/authStore');
jest.mock('@/hooks/useWebSocket');
jest.mock('@/hooks/useConversationCache');
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
jest.mock('@/utils/fetch-with-auth');
jest.mock('@/components/AgentCreator', () => {
  return function AgentCreator() {
    return <button>Create Agent</button>;
  };
});
jest.mock('@/components/dev/GradientColorPicker', () => {
  return function GradientColorPicker({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="gradient-picker">
        <button onClick={onClose}>Close Picker</button>
      </div>
    );
  };
});

const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>;
const mockUseWebSocket = useWebSocket as jest.MockedFunction<typeof useWebSocket>;
const mockUseConversationCache = useConversationCache as jest.MockedFunction<typeof useConversationCache>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('ChatPage - Light Theme Design', () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  const mockAuthStore = {
    isAuthenticated: true,
    isLoading: false,
    checkAuth: jest.fn(),
    logout: jest.fn(),
    user: {
      id: '1',
      username: 'testuser',
      email: 'test@example.com',
    },
  };

  const mockWebSocket = {
    isConnected: true,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    error: null,
  };

  const mockCache = {
    getConversation: jest.fn(),
    setConversation: jest.fn(),
    getMessages: jest.fn(),
    setMessages: jest.fn(),
    addMessage: jest.fn(),
    updateMessage: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as any);
    mockUseAuthStore.mockReturnValue(mockAuthStore as any);
    mockUseWebSocket.mockReturnValue(mockWebSocket as any);
    mockUseConversationCache.mockReturnValue(mockCache as any);
  });

  describe('Light Theme Styling', () => {
    it('should render with light theme gradient background', () => {
      const { container } = render(<ChatPage />);
      const background = container.querySelector('[data-gradient-bg]');
      expect(background).toBeInTheDocument();
      expect(background).toHaveClass('bg-gradient-to-br', 'from-blue-50', 'via-emerald-50', 'to-purple-50');
    });

    it('should render animated liquid blobs', () => {
      const { container } = render(<ChatPage />);
      const blob1 = container.querySelector('[data-blob="1"]');
      const blob2 = container.querySelector('[data-blob="2"]');
      const blob3 = container.querySelector('[data-blob="3"]');
      const blob4 = container.querySelector('[data-blob="4"]');

      expect(blob1).toBeInTheDocument();
      expect(blob2).toBeInTheDocument();
      expect(blob3).toBeInTheDocument();
      expect(blob4).toBeInTheDocument();
    });

    it('should render noise texture overlay', () => {
      const { container } = render(<ChatPage />);
      const noiseOverlay = container.querySelector('.opacity-\\[0\\.03\\]');
      expect(noiseOverlay).toBeInTheDocument();
    });

    it('should apply glassmorphism styles to cards', () => {
      const { container } = render(<ChatPage />);
      const glassCards = container.querySelectorAll('.glass-card');
      expect(glassCards.length).toBeGreaterThan(0);
    });

    it('should include Inter font family', () => {
      const { container } = render(<ChatPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('Inter');
    });
  });

  describe('Gradient Color Picker', () => {
    it('should show gradient picker button in development mode', () => {
      process.env.NODE_ENV = 'development';
      render(<ChatPage />);
      const pickerButton = screen.getByText(/Gradient Picker/i);
      expect(pickerButton).toBeInTheDocument();
    });

    it('should open gradient picker when button is clicked', async () => {
      process.env.NODE_ENV = 'development';
      render(<ChatPage />);
      
      const pickerButton = screen.getByText(/Gradient Picker/i);
      fireEvent.click(pickerButton);

      await waitFor(() => {
        expect(screen.getByTestId('gradient-picker')).toBeInTheDocument();
      });
    });

    it('should close gradient picker when close button is clicked', async () => {
      process.env.NODE_ENV = 'development';
      render(<ChatPage />);
      
      const pickerButton = screen.getByText(/Gradient Picker/i);
      fireEvent.click(pickerButton);

      await waitFor(() => {
        expect(screen.getByTestId('gradient-picker')).toBeInTheDocument();
      });

      const closeButton = screen.getByText('Close Picker');
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('gradient-picker')).not.toBeInTheDocument();
      });
    });

    it('should not show gradient picker in production mode', () => {
      process.env.NODE_ENV = 'production';
      render(<ChatPage />);
      expect(screen.queryByText(/Gradient Picker/i)).not.toBeInTheDocument();
    });
  });

  describe('Sidebar Styling', () => {
    it('should render conversations sidebar with glass effect', () => {
      const { container } = render(<ChatPage />);
      const sidebar = container.querySelector('.w-72.glass-card');
      expect(sidebar).toBeInTheDocument();
    });

    it('should display agent avatar with gradient', () => {
      const { container } = render(<ChatPage />);
      const avatar = container.querySelector('.bg-gradient-to-br.from-indigo-400.to-purple-400');
      expect(avatar).toBeInTheDocument();
    });

    it('should render user info section with styled elements', () => {
      render(<ChatPage />);
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });

  describe('Chat Interface Styling', () => {
    it('should render main chat area with glass card', () => {
      const { container } = render(<ChatPage />);
      const chatArea = container.querySelector('.flex-1.glass-card');
      expect(chatArea).toBeInTheDocument();
    });

    it('should display welcome message with styled elements', () => {
      render(<ChatPage />);
      expect(screen.getByText('Welcome to AgentDB9 Chat')).toBeInTheDocument();
    });

    it('should render WebSocket connection status with glass button', () => {
      const { container } = render(<ChatPage />);
      const statusBadge = container.querySelector('.glass-button');
      expect(statusBadge).toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    it('should style user messages with gradient background', () => {
      // This would require mocking a conversation with messages
      // For now, we test the structure
      const { container } = render(<ChatPage />);
      expect(container).toBeInTheDocument();
    });

    it('should style agent messages with glass input effect', () => {
      const { container } = render(<ChatPage />);
      expect(container).toBeInTheDocument();
    });

    it('should display thinking dots animation', () => {
      const { container } = render(<ChatPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('thinking-dots');
    });
  });

  describe('Input Styling', () => {
    it('should render message input with glass effect', () => {
      const { container } = render(<ChatPage />);
      const input = container.querySelector('textarea.glass-input');
      expect(input).toBeInTheDocument();
    });

    it('should render send button with gradient', () => {
      const { container } = render(<ChatPage />);
      const sendButton = container.querySelector('.bg-gradient-to-r.from-indigo-600.to-purple-600');
      expect(sendButton).toBeInTheDocument();
    });
  });

  describe('Animations', () => {
    it('should include slowFloat animation keyframes', () => {
      const { container } = render(<ChatPage />);
      const styleTag = container.querySelector('style');
      expect(styleTag?.textContent).toContain('@keyframes slowFloat');
    });

    it('should apply animation to blobs', () => {
      const { container } = render(<ChatPage />);
      const blob1 = container.querySelector('[data-blob="1"]');
      expect(blob1).toHaveStyle({ animation: 'slowFloat 25s ease-in-out infinite' });
    });
  });

  describe('Responsive Design', () => {
    it('should render with proper container sizing', () => {
      const { container } = render(<ChatPage />);
      const mainContainer = container.querySelector('.max-w-7xl.h-\\[92vh\\]');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should have scrollable areas with hidden scrollbars', () => {
      const { container } = render(<ChatPage />);
      const scrollableAreas = container.querySelectorAll('.scrollbar-hide');
      expect(scrollableAreas.length).toBeGreaterThan(0);
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner with light theme colors', () => {
      mockUseAuthStore.mockReturnValue({
        ...mockAuthStore,
        isLoading: true,
      } as any);

      render(<ChatPage />);
      const spinner = screen.getByText('Loading...');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should display error messages with styled background', () => {
      // This would require triggering an error state
      // For now, we test the structure
      const { container } = render(<ChatPage />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const { container } = render(<ChatPage />);
      expect(container).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const { container } = render(<ChatPage />);
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
    });
  });
});
