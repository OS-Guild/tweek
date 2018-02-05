#!/bin/bash
if [ -d "/tweek/repo" ]; then
    cd /tweek/repo
    git fetch origin '+refs/heads/*:refs/heads/*'
    exit $?
fi

echo export GIT_UPSTREAM_URI=$GIT_UPSTREAM_URI >> /home/git/.env
echo export GIT_SSH=/tweek/ssh-helper.sh >> /home/git/.env

# copy the contents of given public key to authorized_keys file to allow it to access the repo
if [[ -f "$GIT_PUBLIC_KEY_PATH" ]]
then
    cat $GIT_PUBLIC_KEY_PATH > /home/git/.ssh/authorized_keys
fi

if [ -n "$GIT_PUBLIC_KEY_INLINE" ]
then 
  echo "$GIT_PUBLIC_KEY_INLINE" | base64 -d > /home/git/.ssh/authorized_keys
fi

if [ -n "$PUBLIC_KEY_PATH" ]; then 
  cat $PUBLIC_KEY_PATH > .ssh/authorized_keys
fi

if [ ! -f /home/git/.ssh/authorized_keys ]; then
    echo You must set either GIT_PUBLIC_KEY_INLINE or PUBLIC_KEY_PATH environment variable
    exit 1
fi


if [[ -f "$GIT_SERVER_PRIVATE_KEY_PATH" ]]
then
    cat $GIT_SERVER_PRIVATE_KEY_PATH > /tmp/ssh_server
fi

if [ -n "$GIT_SERVER_PRIVATE_KEY_INLINE" ]; then 
  echo "$GIT_SERVER_PRIVATE_KEY_INLINE" | base64 -d > /tmp/ssh_server
fi


if [ -f /tmp/ssh_server ]; then
    chown git:git /tmp/ssh_server
    chmod 600 /tmp/ssh_server
else
    echo You must set either GIT_SERVER_PRIVATE_KEY_INLINE or GIT_SERVER_PRIVATE_KEY_PATH environment variable
    exit 1
fi

# clone the source repository and apply hooks
set -e
git clone --bare $GIT_UPSTREAM_URI /tweek/repo
cp /tweek/hooks/* /tweek/repo/hooks/
set +e

# Checking permissions and fixing SGID bit in repos folder
cd /tweek/repo
chown -R git:git .
chmod -R ug+rwX .
chmod g+s .
chmod -R ug+x hooks

chown git:git /home/git/.env