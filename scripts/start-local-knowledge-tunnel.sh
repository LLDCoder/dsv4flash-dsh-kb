#!/bin/sh
# The remote knowledge API is deliberately bound to the server loopback.
# Keep this terminal open. SSH may ask for your authorized server password.
exec ssh -N -T -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 -L 127.0.0.1:18002:127.0.0.1:18001 root@10.255.1.157
