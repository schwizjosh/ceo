# DEPRECATED - Legacy Server

This directory contains the **old/legacy server** that has been deprecated and replaced.

## ⚠️ DO NOT USE

This server has been replaced by the new multi-agent backend located at:
- **Location**: `/var/www/andora/backend`
- **PM2 Process**: `andora-backend`
- **Port**: 3001

## Why Deprecated?

- Had bcrypt authentication issues
- Missing multi-agent AI capabilities
- Outdated architecture
- Not compatible with latest frontend features

## Current Production Setup

**Active Backend**: `/var/www/andora/backend` (andora-backend in PM2)

This directory is kept for reference only. If you need to run the Andora API, always use the new backend.

---
Deprecated on: 2025-10-30
