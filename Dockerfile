FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY index.html vite.config.js ./
COPY src ./src
COPY backend ./backend
RUN npm run build && cd backend && npm install --omit=dev && npm run init-db
EXPOSE 3000
CMD ["sh", "-c", "cd /app/backend && node src/app.js & nginx -g 'daemon off;'" ]
