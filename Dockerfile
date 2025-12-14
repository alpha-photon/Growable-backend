FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN npm install

RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
