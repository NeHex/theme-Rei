module.exports = {
  apps: [
    {
      name: "nehex-theme-rei",
      script: "npm",
      args: "run start:pm2",
      env: {
        PORT: 7887,
      },
    },
  ],
};
