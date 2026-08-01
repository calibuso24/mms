#!/bin/bash
(cd mms-backend && npm run dev) &
(cd mms-frontend && npm run dev) &
(cd reporting-service && mvn exec:java) &
wait
