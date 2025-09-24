// Conversation management routes
import { Router } from 'express';
import { 
  AgentConversation, 
  ConversationMessage,
  APIResponse,
  MessageMetadata
} from '@agentdb9/shared';

const router = Router();

// In-memory storage for now (replace with database later)
const conversations = new Map<string, AgentConversation>();
const messages = new Map<string, ConversationMessage[]>();

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const { agentId, title } = req.body;
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      } as APIResponse);
    }

    const conversation: AgentConversation = {
      id: generateId(),
      agentId,
      userId: 'default-user', // TODO: Get from auth
      projectId: req.body.projectId,
      title: title || `Conversation ${new Date().toLocaleString()}`,
      messages: [],
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    conversations.set(conversation.id, conversation);
    messages.set(conversation.id, []);

    res.status(201).json({
      success: true,
      data: conversation
    } as APIResponse<AgentConversation>);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get conversations for an agent
router.get('/', async (req, res) => {
  try {
    const agentId = req.query.agentId as string;
    const userId = req.query.userId as string || 'default-user';
    
    if (!agentId) {
      return res.status(400).json({
        success: false,
        error: 'Agent ID is required'
      } as APIResponse);
    }

    const agentConversations = Array.from(conversations.values())
      .filter(conv => conv.agentId === agentId && conv.userId === userId);
    
    res.json({
      success: true,
      data: agentConversations
    } as APIResponse<AgentConversation[]>);
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get a specific conversation
router.get('/:id', async (req, res) => {
  try {
    const conversation = conversations.get(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      } as APIResponse);
    }

    // Include recent messages
    const conversationMessages = messages.get(req.params.id) || [];
    conversation.messages = conversationMessages.slice(-50); // Last 50 messages

    res.json({
      success: true,
      data: conversation
    } as APIResponse<AgentConversation>);
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get conversations for a specific agent
router.get('/agent/:agentId', async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const agentConversations = Array.from(conversations.values())
      .filter(conv => conv.agentId === agentId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({
      success: true,
      data: agentConversations
    } as APIResponse<AgentConversation[]>);
  } catch (error) {
    console.error('Get agent conversations error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Send a message in a conversation
router.post('/:id/messages', async (req, res) => {
  try {
    const conversation = conversations.get(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      } as APIResponse);
    }

    const { content, role = 'user' } = req.body;
    
    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      } as APIResponse);
    }

    const message: ConversationMessage = {
      id: generateId(),
      conversationId: conversation.id,
      role,
      content,
      timestamp: new Date()
    };

    const conversationMessages = messages.get(conversation.id) || [];
    conversationMessages.push(message);
    messages.set(conversation.id, conversationMessages);

    // Update conversation
    conversation.updatedAt = new Date();
    conversations.set(conversation.id, conversation);

    // If this is a user message, generate an agent response
    if (role === 'user') {
      setTimeout(async () => {
        try {
          const agentResponse = await generateAgentResponse(conversation, message);
          conversationMessages.push(agentResponse);
          messages.set(conversation.id, conversationMessages);
        } catch (error) {
          console.error('Agent response error:', error);
        }
      }, 1000);
    }

    res.status(201).json({
      success: true,
      data: message
    } as APIResponse<ConversationMessage>);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Get messages for a conversation
router.get('/:id/messages', async (req, res) => {
  try {
    const conversation = conversations.get(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      } as APIResponse);
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    
    const conversationMessages = messages.get(req.params.id) || [];
    const paginatedMessages = conversationMessages
      .slice(offset, offset + limit);

    res.json({
      success: true,
      data: paginatedMessages,
      pagination: {
        page,
        limit,
        total: conversationMessages.length,
        totalPages: Math.ceil(conversationMessages.length / limit)
      }
    } as APIResponse<ConversationMessage[]>);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Update conversation (e.g., change title, archive)
router.put('/:id', async (req, res) => {
  try {
    const conversation = conversations.get(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      } as APIResponse);
    }

    const { title, status } = req.body;
    
    const updatedConversation: AgentConversation = {
      ...conversation,
      title: title || conversation.title,
      status: status || conversation.status,
      updatedAt: new Date()
    };

    conversations.set(conversation.id, updatedConversation);

    res.json({
      success: true,
      data: updatedConversation
    } as APIResponse<AgentConversation>);
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Delete a conversation
router.delete('/:id', async (req, res) => {
  try {
    const conversation = conversations.get(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      } as APIResponse);
    }

    conversations.delete(req.params.id);
    messages.delete(req.params.id);

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    } as APIResponse);
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    } as APIResponse);
  }
});

// Helper functions
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function generateAgentResponse(
  conversation: AgentConversation, 
  userMessage: ConversationMessage
): Promise<ConversationMessage> {
  // Mock agent response - replace with actual LLM service integration
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const responses = [
    "I understand your request. Let me help you with that.",
    "That's an interesting problem. Here's how I would approach it:",
    "I can help you implement that. Let me break it down:",
    "Good question! Here's what I think:",
    "Let me analyze this and provide a solution:"
  ];
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  const metadata: MessageMetadata = {
    executionTime: 2000,
    tokenUsage: {
      prompt: 50,
      completion: 30,
      total: 80
    }
  };
  
  return {
    id: generateId(),
    conversationId: conversation.id,
    role: 'agent',
    content: `${randomResponse}\n\nYou said: "${userMessage.content}"\n\nI'm still learning, but I'm here to help you with your coding tasks!`,
    metadata,
    timestamp: new Date()
  };
}

export default router;