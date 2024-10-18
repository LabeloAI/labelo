# Labelo DataManager

The Labelo DataManager is an essential component of the Labelo ecosystem, designed to facilitate efficient handling and exploration of annotated datasets. It offers users powerful tools to organize, filter, and manage data with ease.


### Key Features

DataManager offers several core features that streamline dataset management within Labelo:

- **Grid and List Views**: Enables users to switch between grid and list formats for better dataset visualization.
- **Customizable Data Representation**: Allows users to adjust how their data is displayed to suit specific needs.
- **Advanced Data Filtering**: Provides robust filtering options to help users focus on relevant data quickly.
- **Seamless Integration with Labelo Frontend**: Ensures smooth collaboration with the broader Labelo frontend for a cohesive user experience.

### Environment Setup:
#### Custom Configuration for DataManager:
To configure DataManager for your specific environment:

  1. Duplicate the `.env.example` file located in the DataManager directory and rename the duplicate to `.env`.
  2. Modify the relevant configuration settings in the newly created `.env` file. Key settings include:
    - `NX_API_GATEWAY`: The base URL for your API, e.g., `https://localhost:8080/api/dm`.
    - `LS_ACCESS_TOKEN`: The Labelo access token, obtainable from your Labelo account page.

This setup allows for environment-specific customization without affecting the default settings in `.env.local`.


### Usage Instructions
DataManager provides several scripts for development and testing purposes.

_Important Note: Ensure that these scripts are executed from within the web folder or its subdirectories, as they depend on the directory's specific structure and dependencies._

- **`yarn dm:watch`: Continuous build for DataManager.**
    - This script rebuilds DataManager in real time as you make changes, making it ideal for active development.
- **`yarn dm:unit`: Run unit tests.**
    - Use this script to execute unit tests, ensuring that individual components function correctly, which is crucial in collaborative development projects.

#### Event Handling

DataManager is tightly integrated with Labelo and supports various events. For example:

```js
dm.on('submitAnnotation', () => {
  // Handle the annotation submission process here
});
```

#### API endpoints

DataManager communicates with the backend via predefined API endpoints. Each endpoint is mapped to a specific method that the DataManager uses internally. The full list of available methods can be found in the [API Reference](#under-the-hood).

Endpoints can be defined as either a simple string or an object. If the API path requires dynamic parameters, you can specify them using :[parameter-name] syntax. For instance:

```js
apiEndpoints: {
  columns: "/api/columns",
}
```

For requests other than **GET** use object notation:

```javascript
apiEndpoints: {
  updateTab: {
    path: "/api/tabs/:id",
    method: "post"
  }
}
```

##### Response Handling
If the API response format does not match the format expected by DataManager, you can convert the response dynamically:

```javascript
apiEndpoints: {
  tabs: {
    path: "/api/tabs",
    convert: (response) => {
      // Modify the response format here
      return response
    }
  }
}
```

##### Mocking API Requests

For development purposes, DataManager supports API request mocking. This can be useful for testing without relying on live data:

```javascript
apiEndpoints: {
  columns: {
    path: "/api/columns",
    mock: (url, requestParams, request) => {
      // Process the mock request and return a response
      // Mocking can be disabled with `apiMockDisabled: true`
    }
  }
}
```


### Under the hood
For a detailed overview of the backend API methods and their functionality, refer to the [API Reference][api_docs]

[api_docs]: docs/api_reference.md
[dm_architecture]: docs/dm_architecture_diagram.pdf
