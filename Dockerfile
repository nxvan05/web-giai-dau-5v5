FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
ARG PORT=5000
ENV PORT=$PORT
EXPOSE $PORT
CMD ["node", "src/server.js"]
