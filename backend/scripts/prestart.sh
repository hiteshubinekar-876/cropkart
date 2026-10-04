#! /usr/bin/env bash

set -e
set -x

# Run migrations
alembic upgrade head

# Create initial superuser in DB
python app/initial_data.py
