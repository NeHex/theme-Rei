npm run build
PORT=7887 pm2 start .output/server/index.mjs --name "nehex-web"