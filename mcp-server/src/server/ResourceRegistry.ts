import { MCPResource } from '@agentdb9/shared';
import { logger } from '../utils/logger';

export type ResourceReader = (uri: string) => Promise<any>;

export class ResourceRegistry {
  private resources = new Map<string, MCPResource>();
  private readers = new Map<string, ResourceReader>();

  public registerResource(resource: MCPResource, reader?: ResourceReader): void {
    this.resources.set(resource.uri, resource);
    
    if (reader) {
      this.readers.set(resource.uri, reader);
    }
    
    logger.info(`Registered resource: ${resource.uri}`);
  }

  public registerReader(uri: string, reader: ResourceReader): void {
    if (!this.resources.has(uri)) {
      throw new Error(`Resource ${uri} not found`);
    }
    
    this.readers.set(uri, reader);
    logger.info(`Registered reader for resource: ${uri}`);
  }

  public async readResource(uri: string): Promise<any> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource ${uri} not found`);
    }

    const reader = this.readers.get(uri);
    if (!reader) {
      throw new Error(`No reader registered for resource ${uri}`);
    }

    logger.info(`Reading resource: ${uri}`);

    try {
      const result = await reader(uri);
      logger.info(`Resource ${uri} read successfully`);
      return result;
    } catch (error) {
      logger.error(`Resource ${uri} read failed:`, error);
      throw error;
    }
  }

  public listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  public getResource(uri: string): MCPResource | undefined {
    return this.resources.get(uri);
  }

  public getResourceCount(): number {
    return this.resources.size;
  }

  public hasReader(uri: string): boolean {
    return this.readers.has(uri);
  }
}