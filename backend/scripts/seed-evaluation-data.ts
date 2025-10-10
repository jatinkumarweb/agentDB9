import { DataSource } from 'typeorm';
import { EvaluationGroundTruth } from '../src/entities/evaluation-ground-truth.entity';
import { ALL_SUITES } from '../src/evaluation/seed-data';

async function seedEvaluationData() {
  const isSqlite = process.env.DATABASE_URL?.startsWith('sqlite:');
  
  const dataSource = new DataSource(
    isSqlite
      ? {
          type: 'sqlite',
          database: (process.env.DATABASE_URL || 'sqlite:./data/dev.db').replace('sqlite:', ''),
          entities: [EvaluationGroundTruth],
          synchronize: false,
        }
      : {
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'coding_agent',
          entities: [EvaluationGroundTruth],
          synchronize: false,
        }
  );

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    const repository = dataSource.getRepository(EvaluationGroundTruth);

    // Check if data already exists
    const existingCount = await repository.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing ground truth entries`);
      const answer = process.argv.includes('--force');
      
      if (!answer) {
        console.log('Use --force flag to clear and reseed data');
        await dataSource.destroy();
        return;
      }

      console.log('Clearing existing data...');
      await repository.clear();
    }

    console.log(`Seeding ${ALL_SUITES.length} ground truth entries...`);

    for (const suite of ALL_SUITES) {
      const entry = repository.create(suite);
      await repository.save(entry);
      console.log(`✓ Created: ${suite.category} - ${suite.taskType}`);
    }

    console.log('\n✅ Seeding completed successfully!');
    console.log(`Total entries: ${ALL_SUITES.length}`);
    console.log(`- Backend: ${ALL_SUITES.filter(s => s.category === 'backend').length}`);
    console.log(`- Frontend: ${ALL_SUITES.filter(s => s.category === 'frontend').length}`);
    console.log(`- DevOps: ${ALL_SUITES.filter(s => s.category === 'devops').length}`);

    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding data:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

seedEvaluationData();
