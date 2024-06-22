# Note: problems using ghost due to sharp dependency issues
FROM ghost:alpine as june07

WORKDIR $GHOST_INSTALL/current

RUN apk update -y && apk install g++ make python3 -y; \
    su-exec node yarn add @667/ghost-storage-github@1.1.3; \
    cd node_modules/@667/ghost-storage-github; \
    rm -fR node_modules/sharp; \
    npm install --cpu=x64 --os=linux --libc=musl sharp --force

FROM ghost:alpine

COPY --chown=node:node --from=june07 $GHOST_INSTALL/current/node_modules $GHOST_INSTALL/node_modules
COPY --chown=node:node --from=june07 $GHOST_INSTALL/current/node_modules/@667/ghost-storage-github $GHOST_INSTALL/content.orig/adapters/storage/github