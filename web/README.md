# Labelo

Labelo is an open-source, modular project built using NX that supports scalable data annotation. It consists of three main components: the main application, frontend library, and a data exploration tool. These components together provide an efficient solution for managing and annotating datasets.

## [Main App (`apps/labeloapp`)][lso]
The main app serves as the core of the Labelo platform, combining all the frontend components and functionalities into one cohesive application. It manages various annotation tools and workflows, providing a seamless experience for users.

## [Labelo Frontend (`libs/editor`)][lsf]
Developed with React and mobx-state-tree, this frontend library is designed for handling data annotation tasks. It integrates easily into applications and offers extensive customization options, making it highly adaptable to different workflows and projects.

## [Datamanager (`libs/datamanager`)][dm]
Datamanager is a specialized tool within Labelo for exploring and managing datasets. It allows users to interact with large amounts of data in an organized way, offering advanced features for data analysis and management.

## Installation Instructions
Follow these steps to install and set up Labelo:

### 1 **Dependencies Installation:**
- To install all necessary packages, run:
- `yarn install --frozen-lockfile`

### 2 **Configure Environment:**
#### Custom Configuration for DataManager:
If you need to customize the configuration specifically for DataManager, follow these steps:
  - Create a copy of `.env.example` in the Datamanager directory and rename it to `.env`.
  - Make your desired changes in this new `.env` file. The key configurations to consider are:
      - `NX_API_GATEWAY`: Set this to your API root. For example, `https://localhost:8080/api/dm`.
      - `LS_ACCESS_TOKEN`: This is the access token for Labelo, which can be obtained from your Labelo account page.
- This process allows you to have a customized configuration for DataManager, separate from the default settings in the .env.local files.

## Usage Instructions
### Key Development and Build Commands
- **Labelo App:**
    - `yarn ls:watch`: Builds the Labelo app continuously during development.
- **Labelo Frontend (Editor):**
    - `yarn lsf:watch`: Continuously build the frontend editor.
    - `yarn lsf:serve`: Run the frontend editor as a standalone application.
- **Datamanager**
    - `yarn dm:watch`: Continuously build Datamanager.
- **General Build**
    - `yarn build`: Build all apps and libraries in the project.


## Labelo Ecosystem
Labelo integrates with several related tools, offering a wide range of functionality for data annotation and management:

| Project                          | Description |
|----------------------------------|-|
| [labelo][lso]              | Server part, distributed as a pip package |
| [labelo-frontend][lsf]     | Frontend part, written in JavaScript and React, can be embedded into your application |
| [label-studio-converter][lsc]    | Encode labels into the format of your favorite machine learning library |
| [label-studio-transformers][lst] | Transformers library connected and configured for use with labelo |
| [datamanager][dm]                | Tool for advanced data exploration and management |

## License

This software is licensed under the [Apache 2.0 LICENSE](../LICENSE) © [Cybrosys](https://www.cybrosys.com/). 2024

[lsc]: https://github.com/heartexlabs/label-studio-converter
[lst]: https://github.com/heartexlabs/label-studio-transformers

[lsf]: libs/editor/README.md
[dm]: libs/datamanager/README.md
[lso]: apps/labeloapp/README.md

