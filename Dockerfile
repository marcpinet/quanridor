FROM node:21-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 4200

EXPOSE 8000

CMD ["npm", "start"]
