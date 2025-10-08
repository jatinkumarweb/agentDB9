import { Controller, Post, Body, Get, UseGuards, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthResponse } from './auth.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RateLimitGuard, RateLimit, RateLimitWindow } from '../common/guards/rate-limit.guard';

@ApiTags('Authentication')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit(5)  // 5 registration attempts
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  @ApiResponse({ status: 429, description: 'Too many registration attempts' })
  async register(@Body() createUserDto: CreateUserDto): Promise<AuthResponse> {
    return this.authService.register(createUserDto);
  }

  @Public()
  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(10)  // 10 login attempts
  @RateLimitWindow(60000)  // per minute
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@CurrentUser() user: any) {
    return {
      success: true,
      data: user,
      message: 'Profile retrieved successfully'
    };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateData: Partial<CreateUserDto>
  ) {
    const updatedUser = await this.authService.updateUser(user.id, updateData);
    return {
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit(5)  // 5 password change attempts
  @RateLimitWindow(300000)  // per 5 minutes
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 429, description: 'Too many password change attempts' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    // Validate current password
    const isValid = await this.authService.validateUser(user.email, body.currentPassword);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    await this.authService.updatePassword(user.id, body.newPassword);
    
    return {
      success: true,
      message: 'Password changed successfully'
    };
  }
}