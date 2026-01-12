import { useEffect, useState } from 'react';

interface ConfigItem {
  key: string;
  value: string;
  description: string;
  category: string;
}

const SettingsPage = () => {
  const [config, setConfig] = useState<ConfigItem[]>([
    {
      key: 'SERVICE_PORT',
      value: '21000',
      description: 'Main service HTTP port',
      category: 'Service',
    },
    {
      key: 'DATABASE_URL',
      value: 'postgresql://martha_ts_user:***@localhost:21005/martha_ts',
      description: 'PostgreSQL connection string',
      category: 'Database',
    },
    {
      key: 'DATABASE_SCHEMA',
      value: 'ts_martha',
      description: 'Database schema name',
      category: 'Database',
    },
    {
      key: 'REDIS_URL',
      value: 'redis://:***@localhost:20001',
      description: 'Redis connection string',
      category: 'Redis',
    },
    {
      key: 'REDIS_KEY_PREFIX',
      value: 'ts:',
      description: 'Redis key prefix',
      category: 'Redis',
    },
    {
      key: 'CLOUDFLARE_API_TOKEN',
      value: '***',
      description: 'Cloudflare API authentication token',
      category: 'Cloudflare',
    },
    {
      key: 'CLOUDFLARE_ZONE_ID',
      value: '21e4aaa29e6cec61df31d79dec9c0c8f',
      description: 'Cloudflare zone identifier',
      category: 'Cloudflare',
    },
    {
      key: 'CLOUDFLARE_ACCOUNT_ID',
      value: 'ee72e5ac46a753f361af7fe68392716c',
      description: 'Cloudflare account identifier',
      category: 'Cloudflare',
    },
    {
      key: 'NODE_ENV',
      value: 'development',
      description: 'Environment mode',
      category: 'Service',
    },
    {
      key: 'LOG_LEVEL',
      value: 'info',
      description: 'Logging level',
      category: 'Service',
    },
  ]);

  const categories = Array.from(new Set(config.map(c => c.category)));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Settings</h1>
        <p className="mt-2 text-neutral-600">
          Current configuration and environment settings
        </p>
      </div>

      {/* Info Banner */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="text-blue-600 text-2xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-blue-900">Configuration Source</h3>
            <p className="text-sm text-blue-800 mt-1">
              Settings are loaded from <code className="bg-blue-100 px-2 py-0.5 rounded">.env.local</code> and environment variables.
              Sensitive values are masked for security.
            </p>
          </div>
        </div>
      </div>

      {/* Settings by Category */}
      {categories.map((category) => (
        <div key={category}>
          <h2 className="text-2xl font-semibold mb-4">{category}</h2>
          <div className="card">
            <div className="space-y-4">
              {config
                .filter(c => c.category === category)
                .map((item, index, arr) => (
                  <div
                    key={item.key}
                    className={index < arr.length - 1 ? 'pb-4 border-b border-neutral-200' : ''}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-semibold text-primary-600">
                          {item.key}
                        </div>
                        <div className="text-sm text-neutral-600 mt-1">
                          {item.description}
                        </div>
                      </div>
                      <div className="font-mono text-sm text-neutral-900 bg-neutral-100 px-3 py-1 rounded">
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      ))}

      {/* Port Allocation */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Port Allocation</h2>
        <div className="card">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="text-xs text-neutral-500 uppercase font-semibold mb-2">
                Service Port
              </div>
              <div className="text-2xl font-bold text-primary-600">21000</div>
              <div className="text-xs text-neutral-600 mt-1">HTTP & WebSocket</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="text-xs text-neutral-500 uppercase font-semibold mb-2">
                Redis Port
              </div>
              <div className="text-2xl font-bold text-primary-600">20001</div>
              <div className="text-xs text-neutral-600 mt-1">Shared with Python Martha</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="text-xs text-neutral-500 uppercase font-semibold mb-2">
                PostgreSQL Port
              </div>
              <div className="text-2xl font-bold text-primary-600">21005</div>
              <div className="text-xs text-neutral-600 mt-1">Isolated instance</div>
            </div>
            <div className="p-4 bg-neutral-50 rounded-lg">
              <div className="text-xs text-neutral-500 uppercase font-semibold mb-2">
                MCP Server Port
              </div>
              <div className="text-2xl font-bold text-neutral-400">21002</div>
              <div className="text-xs text-neutral-600 mt-1">Not yet implemented</div>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">System Information</h2>
        <div className="card">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-neutral-500">Node.js Version</div>
              <div className="text-lg font-semibold text-neutral-900 mt-1">
                {typeof process !== 'undefined' ? 'v18+' : 'Browser'}
              </div>
            </div>
            <div>
              <div className="text-sm text-neutral-500">TypeScript Version</div>
              <div className="text-lg font-semibold text-neutral-900 mt-1">5.3.3</div>
            </div>
            <div>
              <div className="text-sm text-neutral-500">Framework</div>
              <div className="text-lg font-semibold text-neutral-900 mt-1">Fastify 4.26</div>
            </div>
            <div>
              <div className="text-sm text-neutral-500">Service Version</div>
              <div className="text-lg font-semibold text-neutral-900 mt-1">3.0.0</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
