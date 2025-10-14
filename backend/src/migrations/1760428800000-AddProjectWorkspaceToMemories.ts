import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddProjectWorkspaceToMemories1760428800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add projectId and workspaceId to long_term_memories table
    await queryRunner.addColumn(
      'long_term_memories',
      new TableColumn({
        name: 'projectId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.addColumn(
      'long_term_memories',
      new TableColumn({
        name: 'workspaceId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX "IDX_long_term_memories_projectId" ON "long_term_memories" ("projectId")`,
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_long_term_memories_workspaceId" ON "long_term_memories" ("workspaceId")`,
    );

    // Add workspaceId to conversations table (projectId already exists)
    await queryRunner.addColumn(
      'conversations',
      new TableColumn({
        name: 'workspaceId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Create index for conversations.workspaceId
    await queryRunner.query(
      `CREATE INDEX "IDX_conversations_workspaceId" ON "conversations" ("workspaceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_conversations_workspaceId"`);
    await queryRunner.query(`DROP INDEX "IDX_long_term_memories_workspaceId"`);
    await queryRunner.query(`DROP INDEX "IDX_long_term_memories_projectId"`);

    // Drop columns
    await queryRunner.dropColumn('conversations', 'workspaceId');
    await queryRunner.dropColumn('long_term_memories', 'workspaceId');
    await queryRunner.dropColumn('long_term_memories', 'projectId');
  }
}
