import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { seedDefaultAdmin } from './seeds/001-default-admin';
import { seedDemoData } from './seeds/002-demo-data';

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    // Run migrations if needed
    if (process.env.NODE_ENV !== 'production') {
      await this.runMigrations();
      await this.seedDatabase();
    }
  }

  async runMigrations(): Promise<void> {
    try {
      const pendingMigrations = await this.dataSource.showMigrations();
      if (pendingMigrations) {
        console.log('🔄 Running database migrations...');
        await this.dataSource.runMigrations();
        console.log('✅ Database migrations completed');
      } else {
        console.log('ℹ️  Database is up to date');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
      // Don't throw in development to allow the app to start
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
  }

  async seedDatabase(): Promise<void> {
    try {
      console.log('🌱 Seeding database...');
      
      // Seed default admin
      await seedDefaultAdmin(this.dataSource);
      
      // Seed demo data only in development
      if (process.env.NODE_ENV === 'development') {
        await seedDemoData(this.dataSource);
      }
      
      console.log('✅ Database seeding completed');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      // Don't throw to allow the app to start
    }
  }

  async resetDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset database in production');
    }

    try {
      console.log('🔄 Resetting database...');
      
      // Drop all tables
      await this.dataSource.dropDatabase();
      
      // Recreate database
      await this.dataSource.synchronize();
      
      // Seed data
      await this.seedDatabase();
      
      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  async getHealthStatus(): Promise<{
    connected: boolean;
    migrations: boolean;
    lastMigration?: string;
    error?: string;
  }> {
    try {
      // Check connection
      const isConnected = this.dataSource.isInitialized;
      
      if (!isConnected) {
        return {
          connected: false,
          migrations: false,
          error: 'Database not connected'
        };
      }

      // Check migrations
      const executedMigrations = await this.dataSource.query(
        'SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 1'
      );
      
      return {
        connected: true,
        migrations: true,
        lastMigration: executedMigrations[0]?.name || 'No migrations found'
      };
    } catch (error) {
      return {
        connected: false,
        migrations: false,
        error: error.message
      };
    }
  }
}