# Labelo Frontend

Labelo Frontend (LSF) is an essential component of the Labelo ecosystem, powering the entire annotation process. It serves as a front-end module, providing an intuitive user interface for creating annotations, while managing a standardized data layer to handle annotation formats. LSF is the backbone of manual annotations in Labelo, making it indispensable for accurate and efficient annotation workflows.

### Usage

LSF provides specific scripts for operation and testing:

_Important Note: These scripts must be executed within the web folder or its subfolders. This is crucial for the scripts to function correctly, as they are designed to work within the context of the web directory's structure and dependencies._

#### Development and Build

- **`yarn lsf:watch`**
  - Continuously builds LSF for development, allowing real-time observation of changes in the Labelo environment.
- **`yarn lsf:serve`**
  - Runs LSF in standalone mode. You can access the standalone application at http://localhost:3000.

#### Testing

- **`yarn lsf:e2e`**
  - Executes end-to-end tests to ensure that LSF functions correctly throughout the entire annotation workflow. Requires the Labelo environment to be running at http://localhost:8080.
- **`yarn lsf:integration`**
  - Runs integration tests using Cypress to verify that different parts of LSF work together as expected. Make sure LSF is running in standalone mode via `yarn lsf:serve`.
- **`yarn lsf:integration:ui`**
  - Runs integration tests in UI mode, allowing for visual debugging. Requires LSF to be running in standalone mode (`yarn lsf:serve`).
- **`yarn lsf:unit`**
  - Runs unit tests, ensuring that individual components of LSF meet quality and functionality standards.
