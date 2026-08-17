FROM node:22
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
USER node
CMD ["node", "dist/index.js"]
