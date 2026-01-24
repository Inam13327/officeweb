# Deploying to Hostinger (Node.js App)

This guide explains how to deploy this application to Hostinger using the **Setup Node.js App** feature in hPanel/cPanel.

## Prerequisites

1.  **Hostinger Plan**: A hosting plan that supports Node.js (Shared Hosting, Cloud, or VPS).
2.  **Domain**: A domain name connected to your hosting.

## Step 1: Prepare the Files

The project has been modified to serve both the frontend and backend from a single Node.js server.
You need to upload the following files/folders to your hosting (e.g., in `public_html` or a subdirectory):

- `dist/` (This folder contains the built frontend)
- `server/` (This folder contains the backend code and data)
- `package.json`
- `package-lock.json`

**Note**: You do *not* need to upload `node_modules`. You will install dependencies on the server.
**Note**: You do *not* need to upload `src` or `public` if you have the `dist` folder.

## Step 2: Upload Files

1.  Go to **File Manager** in your Hostinger dashboard.
2.  Navigate to `public_html`.
3.  Upload the files listed above.
    *   It is recommended to zip them locally, upload the zip, and extract it on the server.

## Step 3: Setup Node.js App

1.  In your Hostinger Dashboard (hPanel), search for **Node.js** (or "Setup Node.js App").
2.  Click **Create Application** (or Add New).
3.  **Node.js Version**: Select the recommended version (e.g., 18 or 20).
4.  **Application Mode**: `Production`.
5.  **Application Root**: Enter the path where you uploaded files (e.g., `public_html` or empty if it's the root of the domain).
6.  **Application URL**: Select your domain.
7.  **Application Startup File**: `server/index.js`
    *   *Important*: Make sure you type `server/index.js`.
8.  Click **Create**.

## Step 4: Install Dependencies

1.  Once the app is created, you will see a button labeled **Run NPM Install**. Click it.
    *   This will install the dependencies defined in `package.json`.
    *   If the button fails, you can try entering the virtual environment via SSH/Terminal and running `npm install`.

## Step 5: Start the App

1.  Click **Restart** or **Start** App.
2.  Visit your website URL. You should see your application running.

## Troubleshooting

-   **500 Error**: Check the **stderr.log** in the `server` directory or the root logs.
-   **Images not loading**: Ensure the `dist/assets` folder is correctly uploaded.
-   **API Errors**: Check if the `server/data` folder is writable. You might need to check permissions (chmod 755 or 777 for the data folder if necessary, though usually 755 is fine).
-   **Static Files**: If you see "Not Found" for static files, ensure `server/router.js` logic is working and `dist` is in the right place relative to `server`.

## Important Notes

-   **Data Persistence**: The application uses JSON files in `server/data` for database storage. Ensure this folder is not overwritten during future deployments if you want to keep your data.
-   **Environment Variables**: If you need to set secrets (like JWT secrets), you can use a `.env` file (if you install `dotenv`) or set them in the "Environment Variables" section of the Node.js Setup page.
