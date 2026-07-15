module.exports = {
  apps: [
    {
      name: "nehex-theme-rei",
      script: "npm",
      args: "run start:pm2",
      env: {
        PORT: 7887,
        NODE_ENV: "production",
      },
      env_production: {
        NODE_ENV: "production",
      },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "512M",
      kill_timeout: 5000,
      time: true,
    },
  ],
};
