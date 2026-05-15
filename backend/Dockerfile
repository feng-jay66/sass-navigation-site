FROM node:20-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN npm run init-db
EXPOSE 3000
CMD ["node", "src/app.js"]
