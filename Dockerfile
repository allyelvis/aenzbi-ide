FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache python3 g++ make

COPY package.json package-lock.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
