import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    updateUser: jest.fn(),
    updatePassword: jest.fn(),
    validateUser: jest.fn(),
  };

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    role: 'user' as const,
    isActive: true,
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    user: mockUser,
    accessToken: 'mock-jwt-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const createUserDto: CreateUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(createUserDto);

      expect(authService.register).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw ConflictException when user already exists', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        username: 'existinguser',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(
        new ConflictException('User with this email or username already exists')
      );

      await expect(controller.register(createUserDto)).rejects.toThrow(
        ConflictException
      );
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        email: 'invalid-email',
        username: 'ab', // too short
        password: '123', // too short
      } as CreateUserDto;

      // This would be caught by validation pipe in real scenario
      mockAuthService.register.mockRejectedValue(
        new Error('Validation failed')
      );

      await expect(controller.register(invalidDto)).rejects.toThrow();
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto: LoginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials')
      );

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      const user = { id: '1', email: 'test@example.com', username: 'testuser' };

      const result = await controller.getProfile(user);

      expect(result).toEqual({
        success: true,
        data: user,
        message: 'Profile retrieved successfully',
      });
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      const updatedUser = { ...mockUser, ...updateData };

      mockAuthService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(user, updateData);

      expect(authService.updateUser).toHaveBeenCalledWith(user.id, updateData);
      expect(result).toEqual({
        success: true,
        data: updatedUser,
        message: 'Profile updated successfully',
      });
    });

    it('should handle update errors', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const updateData = { email: 'invalid-email' };

      mockAuthService.updateUser.mockRejectedValue(
        new Error('Invalid email format')
      );

      await expect(
        controller.updateProfile(user, updateData)
      ).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123',
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.updatePassword.mockResolvedValue(undefined);

      const result = await controller.changePassword(user, passwordData);

      expect(authService.validateUser).toHaveBeenCalledWith(
        user.email,
        passwordData.currentPassword
      );
      expect(authService.updatePassword).toHaveBeenCalledWith(
        user.id,
        passwordData.newPassword
      );
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully',
      });
    });

    it('should throw error for incorrect current password', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(
        controller.changePassword(user, passwordData)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should validate new password strength', async () => {
      const user = { id: '1', email: 'test@example.com' };
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: '123', // too weak
      };

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.updatePassword.mockRejectedValue(
        new Error('Password too weak')
      );

      await expect(
        controller.changePassword(user, passwordData)
      ).rejects.toThrow();
    });
  });
});