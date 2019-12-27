FROM node:alpine

COPY . /app

WORKDIR /app

RUN npm install

EXPOSE 8088 

CMD ["node", "server.js", "/TeslaCam"]
