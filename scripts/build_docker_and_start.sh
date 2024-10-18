SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

if bash ${SCRIPT_DIR}/../deploy/prebuild.sh; then
  docker build -t cybrosystech/labelo ${SCRIPT_DIR}/..
fi

if [ $? -eq 0 ]; then
    docker run -it -p 8080:8080 -v $(pwd)/mydata:/labelo/data cybrosystech/labelo:latest
else
    echo "Docker build failed."
fi
