#!/bin/sh
set -e ${DEBUG:+-x}

echo >&3 "=> Run labelo init..."
labelo init -q >&3
echo >&3 "=> labelo init completed."