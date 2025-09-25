import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginDto } from '../dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: [
        { email: createUserDto.email },
        { username: createUserDto.username }
      ]
    });

    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const user = this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
      preferences: {
        theme: 'dark',
        defaultModel: 'codellama:7b',
        codeStyle: {
          indentSize: 2,
          useSpaces: true,
          semicolons: true
        },
        notifications: {
          email: true,
          browser: true
        }
      }
    });

    const savedUser = await this.usersRepository.save(user);
    
    // Generate tokens
    const payload: JwtPayload = {
      sub: savedUser.id,
      email: savedUser.email,
      username: savedUser.username,
      role: savedUser.role
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    const { password, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword,
      accessToken
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last login
    await this.usersRepository.update(user.id, {
      lastLoginAt: new Date()
    });

    // Generate tokens
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role
    };

    const accessToken = this.jwtService.sign(payload);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken
    };
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersRepository.findOne({
      where: { email }
    });

    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }

    return null;
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: ['agents', 'conversations']
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email }
    });
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User | null> {
    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    await this.usersRepository.update(id, {
      password: hashedPassword
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  // Create default admin user if none exists
  async createDefaultAdmin(): Promise<void> {
    const adminExists = await this.usersRepository.findOne({
      where: { role: 'admin' }
    });

    if (!adminExists) {
      const defaultAdmin = {
        email: 'admin@agentdb9.com',
        username: 'admin',
        password: 'admin123', // Should be changed on first login
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin' as const
      };

      await this.register(defaultAdmin);
      console.log('Default admin user created: admin@agentdb9.com / admin123');
    }
  }
}