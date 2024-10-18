FROM ubuntu:22.04

ENV LO_DIR=/labelo

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_CACHE_DIR=$LO_DIR/.cache \
    POETRY_CACHE_DIR=$LO_DIR/.poetry-cache \
    POETRY_VIRTUALENVS_CREATE=false \
    DJANGO_SETTINGS_MODULE=core.settings.labelo \
    BASE_DATA_DIR=/labelo/data \
    SETUPTOOLS_USE_DISTUTILS=stdlib

WORKDIR $LO_DIR

# Install system packages
RUN set -eux \
 && apt-get update \
 && apt-get install --no-install-recommends --no-install-suggests -y \
    build-essential python3-pip python3-dev \
    git libxml2-dev libxslt-dev zlib1g-dev gnupg curl lsb-release && \
    apt-get purge --assume-yes --auto-remove --option APT::AutoRemove::RecommendsImportant=false \
     --option APT::AutoRemove::SuggestsImportant=false && rm -rf /var/lib/apt/lists/* /tmp/*

RUN --mount=type=cache,target=$PIP_CACHE_DIR,uid=1001,gid=0 \
    pip3 install --upgrade pip setuptools && pip3 install poetry uwsgi uwsgitop

# Copy essential files for installing Labelo and its dependencies
COPY pyproject.toml .
COPY poetry.lock .
COPY README.md .
COPY labelo/__init__.py ./labelo/__init__.py

# Ensure the poetry lockfile is up to date and install dependencies
RUN --mount=type=cache,target=$POETRY_CACHE_DIR \
    poetry check --lock && poetry install

COPY LICENSE LICENSE
COPY licenses licenses
COPY labelo labelo
COPY deploy deploy

COPY web/dist $LO_DIR/web/dist

RUN python3 labelo/manage.py collectstatic --no-input && \
    chmod -R g=u $LO_DIR

ENV HOME=$LO_DIR

EXPOSE 8080

ENTRYPOINT ["./deploy/docker-entrypoint.sh"]
CMD ["labelo"]