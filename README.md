# Labelo - Collaborative Data Annotation Tool  
*Annotate and collaborate across multiple data types with ease.*

![Python](https://img.shields.io/badge/python-3.8%2B-blue) ![Release](https://img.shields.io/github/v/release/LabeloAI/labelo) ![License](https://img.shields.io/badge/license-Apache%202.0-green) ![PyPI](https://img.shields.io/pypi/v/labelo)

[Website](https://www.labelo.ai/) • [Docs](https://docs.labelo.ai/) • [Blogs](https://www.labelo.ai/blog)

## Table of Contents

- [Labelo - Collaborative Data Annotation Tool](#labelo---collaborative-data-annotation-tool)
  - [Table of Contents](#table-of-contents)
  - [What is Labelo](#what-is-labelo)
  - [Features](#features)
  - [Supported Data Types](#supported-data-types)
  - [Quick Start](#quick-start)
  - [Installation](#installation)
    - [Install Locally with pip](#install-locally-with-pip)
    - [Install Locally with Virtual Environment](#install-locally-with-virtual-environment)
    - [Install Locally with Docker](#install-locally-with-docker)
    - [Install with Poetry for Development](#install-with-poetry-for-development)
  - [License](#license)
  - [Contributing to Labelo](#contributing-to-labelo)

## What is Labelo

Labelo is an open-source, scalable platform designed to simplify and accelerate the process of data annotation. Whether you're working with images, video, audio, or text, Labelo provides a comprehensive set of tools to help you label and review data efficiently, all while collaborating seamlessly with your team.

<!-- ![Labelo Gif](images/labelo-app.gif) -->

## Features

- **Workspaces**: Organize and manage multiple projects within dedicated workspaces.
- **Dashboard & Analytics**: Gain insight into project performance with detailed charts and customizable layouts.
- **Team Management**: Invite members, assign roles (Administrator, Manager, Reviewer, Annotator), and track activity.
- **Annotation Tools**: A feature-rich editor supporting multiple data types and formats for efficient labeling.
- **Review System**: Seamless workflow for reviewing annotations with comment and approval systems.
- **Data Management**: Powerful tools for filtering, sorting, and performing bulk actions in grid or list views.

## Supported Data Types

- **Text**: `.txt`
- **Audio**: `.wav`, `.mp3`, `.flac`, `.m4a`, `.ogg`
- **Video**: `.mp4`, `.mpeg4`, `.webp`, `.webm`
- **Images**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.svg`, `.webp`
- **HTML**: `.html`, `.htm`, `.xml`
- **Time Series**: `.csv`, `.tsv`
- **Common Formats**: `.csv`, `.tsv`, `.json`

## Quick Start

To get started with Labelo:

1. **Create a Project:**
   - Run the Labelo server and open your browser at `http://localhost:8080`.
   - Use the Labelo UI to create a new project within a workspace.

2. **Import Data:**
   - Navigate to your project and use the data import tools to upload images, videos, audio files, or text documents.

3. **Annotate Data:**
   - Select an item from your dataset and use the annotation tools to label your data. You can draw bounding boxes, create segments, or add text labels depending on the data type.

4. **Review Annotations:**
   - Once annotations are complete, use the review system to check, comment on, and approve annotations.

5. **Export Data:**
   - After reviewing, you can export annotated data in various formats supported by Labelo.

## Installation

### Install Locally with pip

To install Labelo using `pip`:

```bash
# Requires Python >=3.8
pip install labelo

# Start the server at http://localhost:8080
labelo
```

### Install Locally with Virtual Environment

```bash
# Set up a virtual environment.
python3 -m venv env  
source env/bin/activate  

# Install Labelo.
pip install labelo  

# Run Labelo.
labelo
```

### Install Locally with Docker

```bash
# Pull the latest image
docker pull cybrosystech/labelo:latest

# Run Labelo in a Docker container
docker run -p 8080:8080 -v $(pwd)/mydata:/labelo/data cybrosystech/labelo:latest
```
Access the application at http://localhost:8080. All generated assets, including the SQLite3 database and uploaded files, will be stored in the `./mydata` directory.

### Install with Poetry for Development

You can run the latest version of Labelo locally without installing the package from PyPI. Follow these steps for local development:

```bash
# Install all package dependencies.
pip install poetry
poetry install

# Run database migrations.
poetry run python labelo/manage.py migrate

# Collect static files.
poetry run python labelo/manage.py collectstatic

# Start the server in development mode at http://localhost:8080.
poetry run python labelo/manage.py runserver
```

## License

This software is licensed under the [Apache 2.0 LICENSE](/LICENSE) © [Cybrosys](https://www.cybrosys.com/). 2024

## Contributing to Labelo

We value feedback and contributions from our community. Whether it’s a bug report, new feature, correction, or additional documentation, we welcome your issues and pull requests. Please read through this [CONTRIBUTING](/CONTRIBUTING.md) document before submitting any issues or pull requests to ensure we have all the necessary information to effectively respond to your contribution.