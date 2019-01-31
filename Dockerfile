FROM node:carbon-alpine

# Create app directory
WORKDIR /usr/src/app

COPY package.json ./
RUN mkdir ./local_modules
COPY local_modules/knx-2.3.1.tgz ./local_modules/

RUN npm install

# Bundle app source
COPY *.js ./

USER node:node

CMD [ "npm", "start" ]
