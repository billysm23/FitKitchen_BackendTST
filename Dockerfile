FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY . .

RUN touch .env

EXPOSE 5000

CMD ["npm", "start"]