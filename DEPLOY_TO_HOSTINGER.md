# 🚀 Step-by-Step Hostinger Deployment Guide

I have analyzed and modified your project code to ensure it works perfectly on Hostinger's Node.js environment.

## 🛑 Crucial First Step: What to Select?

When you are in Hostinger's **"Setup Node.js App"** dashboard:

1.  **Do NOT look for "React" or "Vite" options.**
    *   You are deploying a **Node.js** server (which *serves* your React app).
    *   Hostinger does not know you used Vite. It only cares that you are running Node.js.
2.  **Node.js Version**: Select **18** or **20** (Recommended).
    *   Your project is configured to require at least version 18.
3.  **Application Startup File**: You MUST type **`app.js`**.
    *   Do *not* type `server/index.js` or `vite`.

---

## 📤 Phase 1: Upload Files

1.  **Login to Hostinger hPanel**.
2.  Go to **Files** -> **File Manager**.
3.  Navigate to your domain's folder (usually `public_html`).
4.  **Delete existing files** (like default.php) if this is a fresh site.
5.  **Upload the following files & folders**:

    | File/Folder | Description |
    | :--- | :--- |
    | `dist/` | **Folder**. Contains your website frontend (created by `npm run build`). |
    | `server/` | **Folder**. Contains your backend code. |
    | `app.js` | **File**. The startup file. |
    | `package.json` | **File**. Dependencies list. |
    | `.htaccess` | **File**. Server configuration. |

    **💡 Tip**: Zip these files on your computer, upload the Zip, and then **Extract** it in File Manager.

## ⚙️ Phase 2: Setup Node.js Application (The Settings)

1.  In Hostinger hPanel, search for **Node.js** (or "Setup Node.js App").
2.  Click **Create Application** (or Add New).
3.  **Fill in these EXACT settings**:

    | Setting | Value to Enter/Select |
    | :--- | :--- |
    | **Node.js Version** | **18** or **20** (or latest LTS) |
    | **Application Mode** | **Production** |
    | **Application Root** | `public_html` (or your folder path) |
    | **Application URL** | Select your domain |
    | **Application Startup File** | **app.js** |

    *(Note: If you typed `server/index.js` before, change it to `app.js` and save).*

4.  Click **Create**.

## 📦 Phase 3: Install Dependencies

1.  After the app is created, click the **Run NPM Install** button.
    *   *This will take a minute to install all required libraries.*
2.  If the button fails (sometimes happens), you can ignore it if you uploaded `node_modules` (not recommended), OR try again.

## 🚀 Phase 4: Start & Verify

1.  Click the **Restart** button (or Start).
2.  Open your website URL.
    *   **Frontend**: You should see your React website.
    *   **Backend Check**: Go to `your-site.com/api/health`. You should see `{"status":"ok", ...}`.

## ❓ Troubleshooting

*   **"403 Forbidden" or "404 Not Found"**:
    *   Ensure your `dist` folder is inside `public_html`.
    *   Ensure `app.js` is selected as the startup file.
*   **"App Not Started" / 500 Error**:
    *   Check if you clicked "Run NPM Install".
    *   Check permissions: The `server/data` folder needs to be writable. In File Manager, right-click `server/data`, select **Permissions**, and ensure it is **755** or **777**.
