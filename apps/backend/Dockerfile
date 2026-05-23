FROM node:22-alpine

WORKDIR /app
ENV DATABASE_URL=postgresql://postgres:postgres@localhost:5432/antidtraining?schema=public

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run prisma:generate && npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:generate && npx prisma db push --accept-data-loss && npm run start"]
