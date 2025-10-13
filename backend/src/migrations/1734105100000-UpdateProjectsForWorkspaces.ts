import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class UpdateProjectsForWorkspaces1734105100000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add workspaceId column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'workspaceId',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // Add workspaceType column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'workspaceType',
        type: 'varchar',
        length: '50',
        isNullable: true,
      }),
    );

    // Add volumePath column
    await queryRunner.addColumn(
      'projects',
      new TableColumn({
        name: 'volumePath',
        type: 'varchar',
        length: '500',
        isNullable: true,
      }),
    );

    // Create index on workspaceId
    await queryRunner.createIndex(
      'projects',
      new TableIndex({
        name: 'IDX_projects_workspaceId',
        columnNames: ['workspaceId'],
      }),
    );

    // Add foreign key to workspaces table
    await queryRunner.createForeignKey(
      'projects',
      new TableForeignKey({
        name: 'FK_projects_workspaceId',
        columnNames: ['workspaceId'],
        referencedTableName: 'workspaces',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    await queryRunner.dropForeignKey('projects', 'FK_projects_workspaceId');

    // Drop index
    await queryRunner.dropIndex('projects', 'IDX_projects_workspaceId');

    // Drop columns
    await queryRunner.dropColumn('projects', 'volumePath');
    await queryRunner.dropColumn('projects', 'workspaceType');
    await queryRunner.dropColumn('projects', 'workspaceId');
  }
}
