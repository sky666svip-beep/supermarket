module.exports = {
  apps: [
    {
      name: "supermarket-backend",
      script: "node",
      args: "dist/src/index.js",
      cwd: "./backend",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      name: "supermarket-caddy",
      script: "caddy.exe",
      args: "run",
      cwd: "./"
    },
    {
      name: "supermarket-tunnel",
      script: "cloudflared.exe",
      args: "tunnel run --token eyJhIjoiNDQ1MTU3MDc5NDk4ZTFhN2ZjNDVjMmEzM2JhMGM4OWEiLCJ0IjoiMTg4ZmEwNGYtYTkxMy00YjQ3LTllMmYtNjE1NjVkOTU1N2FlIiwicyI6IlpqSmpOalUyT0dJdFl6aGhZUzAwT1dFMkxUZ3lNVFl0T0dGbU1EQm1PREUxTlRVMCJ9",
      cwd: "./"
    }
  ]
};
