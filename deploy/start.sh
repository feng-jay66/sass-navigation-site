#!/bin/sh
set -e
cd /app/backend
node src/initData.js
node src/app.js &
nginx -g 'daemon off;'
