import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWorkspaces1734105000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create workspaces table
    await queryRunner.createTable(
      new Table({
        name: 'workspaces',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'type',
            type: 'varchar',
            length: '50',
            default: "'vscode'",
            isNullable: false,
          },
          {
            name: 'currentProjectId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'config',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'active'",
            isNullable: false,
          },
          {
            name: 'containerName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'volumeName',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'isDefault',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'workspaces',
      new TableIndex({
        name: 'IDX_workspaces_userId',
        columnNames: ['userId'],
      }),
    );

    await queryRunner.createIndex(
      'workspaces',
      new TableIndex({
        name: 'IDX_workspaces_type',
        columnNames: ['type'],
      }),
    );

    await queryRunner.createIndex(
      'workspaces',
      new TableIndex({
        name: 'IDX_workspaces_isDefault',
        columnNames: ['isDefault'],
      }),
    );

    // Add foreign key to users table
    await queryRunner.query(`
      ALTER TABLE workspaces
      ADD CONSTRAINT FK_workspaces_userId
      FOREIGN KEY ("userId") REFERENCES users(id)
      ON DELETE CASCADE;
    `);

    // Add foreign key to projects table (optional reference)
    await queryRunner.query(`
      ALTER TABLE workspaces
      ADD CONSTRAINT FK_workspaces_currentProjectId
      FOREIGN KEY ("currentProjectId") REFERENCES projects(id)
      ON DELETE SET NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys
    await queryRunner.query(`
      ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS FK_workspaces_currentProjectId;
    `);
    await queryRunner.query(`
      ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS FK_workspaces_userId;
    `);

    // Drop indexes
    await queryRunner.dropIndex('workspaces', 'IDX_workspaces_isDefault');
    await queryRunner.dropIndex('workspaces', 'IDX_workspaces_type');
    await queryRunner.dropIndex('workspaces', 'IDX_workspaces_userId');

    // Drop table
    await queryRunner.dropTable('workspaces');
  }
}
