FROM node:lts-bullseye-slim

RUN mkdir -p /media/TeslaCam
WORKDIR /usr/src/teslacam-browser
COPY . .

RUN npm install
RUN apt update

ENTRYPOINT node server.js /media/TeslaCam

EXPOSE 8088