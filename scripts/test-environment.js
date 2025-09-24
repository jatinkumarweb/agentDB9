#!/usr/bin/env node

/**
 * Environment Testing Script
 * Tests all services and generates a comprehensive report
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class EnvironmentTester {
  constructor() {
    this.services = [
      { name: 'Frontend', url: 'http://localhost:3000' },
      { name: 'Backend', url: 'http://localhost:8000' },
      { name: 'LLM Service', url: 'http://localhost:9000' },
      { name: 'VS Code Server', url: 'http://localhost:8080' },
      { name: 'Ollama', url: 'http://localhost:11434' },
      { name: 'Qdrant', url: 'http://localhost:6333' }
    ];
    
    this.results = {
      services: [],
      models: [],
      databases: [],
      overall: 'unknown',
      timestamp: new Date().toISOString()
    };
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.request(url, {
        method: 'GET',
        timeout: 5000,
        ...options
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  async testService(service) {
    const startTime = Date.now();
    
    try {
      const response = await this.makeRequest(`${service.url}/health`);
      const responseTime = Date.now() - startTime;
      
      return {
        name: service.name,
        url: service.url,
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        details: response.data,
        error: response.status !== 200 ? `HTTP ${response.status}` : null
      };
    } catch (error) {
      return {
        name: service.name,
        url: service.url,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
        details: null
      };
    }
  }

  async testModels() {
    try {
      const response = await this.makeRequest('http://localhost:9000/api/models');
      
      if (response.status === 200 && response.data.models) {
        return response.data.models.map(model => ({
          modelId: model.id,
          provider: model.provider,
          available: model.status === 'available',
          error: model.status !== 'available' ? 'Model not available' : null
        }));
      }
    } catch (error) {
      console.warn('Could not test models:', error.message);
    }
    
    return [];
  }

  async testDatabases() {
    const databases = [
      { name: 'PostgreSQL', endpoint: 'http://localhost:8000/api/test/database' },
      { name: 'Redis', endpoint: 'http://localhost:8000/api/test/redis' },
      { name: 'Qdrant', endpoint: 'http://localhost:6333/collections' }
    ];
    
    const results = [];
    
    for (const db of databases) {
      try {
        const response = await this.makeRequest(db.endpoint);
        results.push({
          type: db.name.toLowerCase(),
          connected: response.status === 200,
          error: response.status !== 200 ? `HTTP ${response.status}` : null,
          details: response.data
        });
      } catch (error) {
        results.push({
          type: db.name.toLowerCase(),
          connected: false,
          error: error.message,
          details: null
        });
      }
    }
    
    return results;
  }

  async runAllTests() {
    console.log('🧪 Running AgentDB9 Environment Tests...\n');
    
    // Test services
    console.log('📡 Testing service connectivity...');
    for (const service of this.services) {
      const result = await this.testService(service);
      this.results.services.push(result);
      
      const status = result.status === 'healthy' ? '✅' : '❌';
      const time = result.responseTime ? `(${result.responseTime}ms)` : '';
      console.log(`  ${status} ${result.name} ${time}`);
      
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    }
    
    console.log('\n🤖 Testing model availability...');
    this.results.models = await this.testModels();
    
    if (this.results.models.length > 0) {
      this.results.models.forEach(model => {
        const status = model.available ? '✅' : '❌';
        console.log(`  ${status} ${model.modelId} (${model.provider})`);
        if (model.error) {
          console.log(`     Error: ${model.error}`);
        }
      });
    } else {
      console.log('  ⚠️  Could not retrieve model information');
    }
    
    console.log('\n💾 Testing database connections...');
    this.results.databases = await this.testDatabases();
    
    this.results.databases.forEach(db => {
      const status = db.connected ? '✅' : '❌';
      console.log(`  ${status} ${db.type.toUpperCase()}`);
      if (db.error) {
        console.log(`     Error: ${db.error}`);
      }
    });
    
    // Calculate overall health
    const healthyServices = this.results.services.filter(s => s.status === 'healthy').length;
    const totalServices = this.results.services.length;
    const connectedDbs = this.results.databases.filter(d => d.connected).length;
    const totalDbs = this.results.databases.length;
    
    const healthPercentage = ((healthyServices + connectedDbs) / (totalServices + totalDbs)) * 100;
    
    if (healthPercentage >= 90) {
      this.results.overall = 'healthy';
    } else if (healthPercentage >= 70) {
      this.results.overall = 'degraded';
    } else {
      this.results.overall = 'unhealthy';
    }
    
    this.printSummary();
    return this.results;
  }

  printSummary() {
    console.log('\n📊 Test Summary');
    console.log('================');
    
    const healthyServices = this.results.services.filter(s => s.status === 'healthy').length;
    const totalServices = this.results.services.length;
    const availableModels = this.results.models.filter(m => m.available).length;
    const totalModels = this.results.models.length;
    const connectedDbs = this.results.databases.filter(d => d.connected).length;
    const totalDbs = this.results.databases.length;
    
    console.log(`Services:  ${healthyServices}/${totalServices} healthy`);
    console.log(`Models:    ${availableModels}/${totalModels} available`);
    console.log(`Databases: ${connectedDbs}/${totalDbs} connected`);
    
    const overallIcon = this.results.overall === 'healthy' ? '✅' : 
                       this.results.overall === 'degraded' ? '⚠️' : '❌';
    
    console.log(`\nOverall Status: ${overallIcon} ${this.results.overall.toUpperCase()}`);
    
    if (this.results.overall !== 'healthy') {
      console.log('\n🔧 Recommendations:');
      
      const failedServices = this.results.services.filter(s => s.status !== 'healthy');
      failedServices.forEach(service => {
        console.log(`  • Check if ${service.name} is running and accessible`);
      });
      
      const disconnectedDbs = this.results.databases.filter(d => !d.connected);
      disconnectedDbs.forEach(db => {
        console.log(`  • Verify ${db.type} connection and ensure service is running`);
      });
      
      const unavailableModels = this.results.models.filter(m => !m.available);
      if (unavailableModels.length > 0) {
        console.log(`  • Check model availability and API key configuration`);
      }
    }
    
    console.log(`\nTest completed at: ${this.results.timestamp}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new EnvironmentTester();
  tester.runAllTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  });
}

module.exports = EnvironmentTester;