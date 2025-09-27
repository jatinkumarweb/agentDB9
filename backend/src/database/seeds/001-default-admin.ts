import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

export async function seedDefaultAdmin(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository('User');
  
  // Check if admin already exists
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@agentdb9.com' }
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await userRepository.save({
      email: 'admin@agentdb9.com',
      username: 'admin',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      isActive: true,
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

    console.log('✅ Default admin user created: admin@agentdb9.com / admin123');
  } else {
    console.log('ℹ️  Default admin user already exists');
  }
}