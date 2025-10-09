import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAgentConfigurationNulls1728494400000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Set default configuration for any agents with null configuration
        await queryRunner.query(`
            UPDATE agents 
            SET configuration = '{
                "llmProvider": "ollama",
                "model": "qwen2.5-coder:7b",
                "temperature": 0.7,
                "maxTokens": 2048,
                "codeStyle": {
                    "indentSize": 2,
                    "indentType": "spaces",
                    "lineLength": 100,
                    "semicolons": true,
                    "quotes": "single",
                    "trailingCommas": true,
                    "bracketSpacing": true,
                    "arrowParens": "always"
                },
                "autoSave": true,
                "autoFormat": true,
                "autoTest": false,
                "workspace": {
                    "enableActions": true,
                    "enableContext": true
                }
            }'::jsonb
            WHERE configuration IS NULL
        `);
        
        // Set default capabilities for any agents with null capabilities
        await queryRunner.query(`
            UPDATE agents 
            SET capabilities = '[]'::jsonb
            WHERE capabilities IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // No need to revert - we don't want to set configurations back to null
    }
}
