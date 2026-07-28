#!/bin/bash
(cd mms-backend && npm run dev) & (cd mms-frontend && npm run dev) & wait
