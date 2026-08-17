FROM node:22
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
USER node
CMD ["node", "dist/index.js"]
