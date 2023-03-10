FROM node:lts-bullseye-slim

RUN mkdir -p /usr/src/teslacam-browser
RUN mkdir -p /media/TeslaCam
WORKDIR /usr/src/teslacam-browser
COPY . .

RUN npm install
RUN apt update
RUN apt install bash-completion
RUN apt install -y nano

ENTRYPOINT node server.js /media/TeslaCam

EXPOSE 8088