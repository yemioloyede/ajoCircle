FROM node:20-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --only=production=false

COPY backend . 
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
