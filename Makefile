# Run Django dev server with Sqlite
run-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.labelo python labelo/manage.py runserver

# Run Django dev migrations with Sqlite
migrate-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.labelo python labelo/manage.py migrate

# Run Django dev make migrations with Sqlite
makemigrations-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.labelo python labelo/manage.py makemigrations

# Run Django dev shell environment with Sqlite
shell-dev:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.labelo python labelo/manage.py shell_plus

docker-run-dev:
	docker-compose up --build

docker-migrate-dev:
	docker-compose run app python3 /labelo/labelo/manage.py migrate


# Install modules
frontend-setup:
	cd web && yarn install --frozen-lockfile;

# Keep it here for potential rollback
## Fetch DM and LSF
#frontend-fetch:
#	cd labelo/frontend && yarn run download:all;

# Build frontend continuously on files changes
frontend-watch:
	cd web && yarn run watch

# Build production-ready optimized bundle
frontend-build: frontend-setup
	cd web && yarn run build

frontend-storybook-serve: frontend-setup
	cd web && yarn run ui:serve

# Run tests
test:
	cd labelo && DJANGO_DB=sqlite pytest -v -m "not integration_tests"

# Build image which includes test dependencies, for unit testing within docker
build-testing-image:
	docker build -t cybrosystech/labelo:latest . && docker build -t cybrosystech/labelo:latest-testing -f Dockerfile.testing .

# Run an interactive shell inside a testing container. Label studio dir will be mounted as a volume
# to avoid need for rebuilds. Run `make build-testing-image` first.
docker-testing-shell:
	docker run --volume ./labelo:/labelo/labelo --volume ./mydata:/labelo/data:rw -it cybrosystech/labelo:latest-testing /bin/bash

# Update urls
update-urls:
	DJANGO_DB=sqlite LOG_DIR=tmp DEBUG=true LOG_LEVEL=DEBUG DJANGO_SETTINGS_MODULE=core.settings.labelo python labelo/manage.py show_urls --format pretty-json > ./labelo/core/all_urls.json

# Format changed files on branch
fmt:
	pre-commit run --config .pre-commit-dev.yaml --hook-stage manual

# Format all files in repo
fmt-all:
	pre-commit run --config .pre-commit-dev.yaml --hook-stage manual --all-files

# Check for lint issues on this branch
fmt-check:
	pre-commit run --hook-stage pre-push

# Check for lint issues in entire repo
fmt-check-all:
	pre-commit run --hook-stage pre-push --all-files

# Configure pre-push hook using pre-commit
configure-hooks:
	pre-commit install --hook-type pre-push
