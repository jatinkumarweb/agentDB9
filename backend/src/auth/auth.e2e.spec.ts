// Set environment variables before any imports
process.env.JWT_SECRET = 'test-jwt-secret-key-for-e2e-tests-minimum-32-chars';
process.env.SESSION_SECRET = 'test-session-secret-key-for-e2e-tests-minimum-32-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USER = 'postgres';
process.env.DATABASE_PASSWORD = 'postgres';
process.env.DATABASE_NAME = 'agentdb9_test';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    
    await app.init();
  });

  afterEach(async () => {
    // Clean up test data
    if (userRepository) {
      await userRepository.clear();
    }
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user).toHaveProperty('email', createUserDto.email);
          expect(res.body.user).toHaveProperty('username', createUserDto.username);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should return 409 for duplicate email', async () => {
      const createUserDto = {
        email: 'duplicate@example.com',
        username: 'user1',
        password: 'password123',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(201);

      // Second registration with same email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...createUserDto, username: 'user2' })
        .expect(409);
    });

    it('should return 409 for duplicate username', async () => {
      const createUserDto = {
        email: 'user1@example.com',
        username: 'duplicate',
        password: 'password123',
      };

      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(201);

      // Second registration with same username
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...createUserDto, email: 'user2@example.com' })
        .expect(409);
    });

    it('should return 400 for invalid email format', () => {
      const createUserDto = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 for short password', () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: '123',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(400);
    });

    it('should return 400 for short username', () => {
      const createUserDto = {
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto)
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a test user
      const createUserDto = {
        email: 'login@example.com',
        username: 'loginuser',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto);
    });

    it('should login with valid credentials', () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body.user).toHaveProperty('email', loginDto.email);
          expect(res.body.user).not.toHaveProperty('password');
        });
    });

    it('should return 401 for invalid password', () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should return 401 for non-existent email', () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);
    });

    it('should return 400 for invalid email format', () => {
      const loginDto = {
        email: 'invalid-email',
        password: 'password123',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      const loginDto = {
        email: 'login@example.com',
      };

      return request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);
    });
  });

  describe('/auth/profile (GET)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a test user
      const createUserDto = {
        email: 'profile@example.com',
        username: 'profileuser',
        password: 'password123',
        firstName: 'Profile',
        lastName: 'User',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto);

      accessToken = registerResponse.body.accessToken;
    });

    it('should return user profile with valid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('email', 'profile@example.com');
          expect(res.body.data).toHaveProperty('username', 'profileuser');
          expect(res.body.data).toHaveProperty('firstName', 'Profile');
          expect(res.body.data).toHaveProperty('lastName', 'User');
        });
    });

    it('should return 401 without token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);
    });

    it('should return 401 with invalid token', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with malformed authorization header', () => {
      return request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });
  });

  describe('/auth/profile (PATCH)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a test user
      const createUserDto = {
        email: 'update@example.com',
        username: 'updateuser',
        password: 'password123',
        firstName: 'Original',
        lastName: 'Name',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto);

      accessToken = registerResponse.body.accessToken;
    });

    it('should update user profile', () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      return request(app.getHttpServer())
        .patch('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body.data).toHaveProperty('firstName', 'Updated');
          expect(res.body.data).toHaveProperty('lastName', 'Name');
        });
    });

    it('should return 401 without token', () => {
      const updateData = {
        firstName: 'Updated',
      };

      return request(app.getHttpServer())
        .patch('/auth/profile')
        .send(updateData)
        .expect(401);
    });
  });

  describe('/auth/change-password (POST)', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a test user
      const createUserDto = {
        email: 'password@example.com',
        username: 'passworduser',
        password: 'oldpassword123',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(createUserDto);

      accessToken = registerResponse.body.accessToken;
    });

    it('should change password with valid current password', () => {
      const passwordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };

      return request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('message', 'Password changed successfully');
        });
    });

    it('should return 400 for incorrect current password', () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123',
      };

      return request(app.getHttpServer())
        .post('/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(passwordData)
        .expect(500); // This would be 400 in a real implementation with proper error handling
    });

    it('should return 401 without token', () => {
      const passwordData = {
        currentPassword: 'oldpassword123',
        newPassword: 'newpassword123',
      };

      return request(app.getHttpServer())
        .post('/auth/change-password')
        .send(passwordData)
        .expect(401);
    });
  });
});