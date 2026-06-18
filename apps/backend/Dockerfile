FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run prisma:generate && npm run build

EXPOSE 4000

CMD ["sh", "-c", "npm run prisma:generate && npx prisma migrate deploy && npm run start"]
