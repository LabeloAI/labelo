# Labelo App

The Labelo App is the core frontend module of the Labelo platform, built with React. This app allows developers to design and integrate new pages, leveraging various libraries to craft a seamless user experience. It is a frontend-only module, primarily focused on enhancing user interaction and interface development.

### Usage Instructions

_Important Note: These scripts must be executed within the web folder or its subfolders. This is crucial for the scripts to function correctly, as they are designed to work within the context of the web directory's structure and dependencies._

- **`yarn ls:watch`: Continuous Build for Labelo**
    - Automatically builds Labelo as changes are made, enabling real-time development.
- **`yarn ls:e2e`: Run End-to-End (e2e) Tests**
    - Executes tests simulating full user workflows to verify the app's functionality.
- **`yarn ls:unit`: Run Unit Tests**
    - Runs unit tests on individual components to ensure reliability during development.

### Creating pages

Pages in Labelo can either be Django templates or React components.

#### Django

For pages where no specific React component exists, Django templates serve as a fallback option.

To create a Django page:
- Choose an app in the `labelo/` directory.
- Add a URL and create a view with an HTML template.
- If there is no matching React page, the React app will automatically handle the route.

#### React

_**Important notice:** you still have to add url to `urls.py` under one of the Django apps so the backend won't throw a 404. It's up to you where to add it._

Pages are organized within `labeloapp/src/pages`. Each folder in this directory represents a page set that can contain multiple pages. Here’s how to create a new page:

##### Step 1: Create a Page Set

If starting from scratch, create a directory under `labeloapp/src/pages`, e.g., `labeloapp/src/pages/MyPageSet`.

##### Step 2: Add a React Component

In your new directory, create a React component like this:

```js
export const MyNewPage = () => <div>Page content</div>
```

This would be a legit component and a page

##### Step 3: Define Title and Route

Set the title and path for your new page by adding properties to the component:

```js
MyNewPage.title = "Some title"
MyNewPage.path = "/my_page_path"
```

##### Step 4: Create the Page Set Index

If it's a new page set, you’ll need an `index.js` file in your page set directory:

```js
export { MyNewPage } from './MyNewPage';
```

Optionally, if you want to wrap all pages in a layout, you can modify index.js:

```js
import { MyNewPage } from './MyNewPage';

export const MyLayout = (props) => {
  return (
    <div className="some-extra-class">
      {props.children}
    </div>
  )
}

MyLayout.title = "My Page Set";
MyLayout.path = "/some_root"
```
The `props.children` represents the content of the current page within the layout. Setting a path on the layout will nest all page routes within it. For example, the page defined earlier would now have the full path `/some_root/my_page_path`.

##### Step 5: Add the Page Set to the Router

Finally, integrate your new page set into the application by updating `labeloapp/src/pages/index.js`:

```js
// Import the page set
import * as MyPageSet from './MyPageSet'

export const Pages = {
  /* other page sets */,
  MyPageSet,
}
```

You can now access the page at `/some_root/my_page_path` in your browser.

### Page and Route Properties

* `title` –  Defines the page title and breadcrumb. Can be a string or function.
* `routes` – A nested list of routes.
* `layout` – A layout component to wrap around nested paths.
* `pages` – set of pages
* `routes` – A set of pages.
* `exact` – If true, matches the exact path instead of a substring.
