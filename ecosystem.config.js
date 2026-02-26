module.exports = {
  apps: [
    {
      name: 'bitegit-app',
      script: 'server.js',
      exec_mode: 'fork',
      instances: Number(process.env.PM2_INSTANCES || 1),
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: Number(process.env.PORT || 3000)
      }
    }
  ]
};
