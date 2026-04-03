module.exports = {
  apps: [
    {
      name: "nehex-web",
      script: "npm",
      args: "run start:pm2",
      env: {
        PORT: 7887,
      },
    },
  ],
};
