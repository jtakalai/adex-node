FROM node:8
MAINTAINER Shteryana S. Shopova

COPY . /home/node/adex-node
WORKDIR /home/node/adex-node
RUN npm install
