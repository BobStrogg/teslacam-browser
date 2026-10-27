# Headless TeslaCam Browser (server mode).
# Adapted from the Dockerfile in pull request #75 by Shaheen Badiyan.
# node:22-bookworm-slim is published for both amd64 and arm64, so this
# builds on x64, Apple Silicon, and a Raspberry Pi without a second Dockerfile.
FROM node:22-bookworm-slim

WORKDIR /usr/src/teslacam-browser

COPY package.json yarn.lock ./
RUN npm install -g yarn@1.22.22 && yarn install --frozen-lockfile

COPY . .

EXPOSE 8088
VOLUME ["/media/TeslaCam"]
ENTRYPOINT ["node", "server.js"]
CMD ["/media/TeslaCam"]
