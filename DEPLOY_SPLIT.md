# 🚀 Split Deployment Guide (Frontend on Hostinger, Backend on Vercel)

This guide explains how to deploy your **Frontend** to Hostinger and your **Backend** to Vercel, ensuring they communicate correctly.

---

## 🟢 Part 1: Deploy Backend to Vercel

The backend will host your API and connect to MongoDB.

1.  **Push your code to GitHub** (if not already done).
2.  **Login to Vercel** and create a **New Project**.
3.  Import your GitHub repository.
4.  **Configuration**:
    *   **Framework Preset**: Select "Other" (or let it detect, but "Other" is safe for Express).
    *   **Root Directory**: `./` (Root).
    *   **Build Command**: Leave empty or `npm install`.
    *   **Output Directory**: Leave empty.
5.  **Environment Variables** (Important!):
    *   Add `MONGODB_URI`: Your MongoDB connection string (e.g., `mongodb+srv://...`).
6.  **Deploy**.
7.  **Get your Backend URL**:
    *   Once deployed, copy the domain (e.g., `https://your-project.vercel.app`).
    *   Visit `https://your-project.vercel.app/api/health` or `.../api/products` to verify it works.

---

## 🔵 Part 2: Prepare Frontend for Hostinger

Now we configure the frontend to talk to your Vercel backend.

1.  **Create/Edit `.env` file** in your project root locally.
2.  Add the following line (replace with your ACTUAL Vercel URL):
    ```env
    VITE_API_URL=https://your-project.vercel.app/api
    ```
    *(Note: Ensure it ends with `/api` if your backend routes expect it, or just the domain if your code appends `/api`. Based on your code, `src/lib/api.ts` appends path to `API_BASE`. If you set `API_BASE` to `https://.../api`, then `request("/products")` becomes `https://.../api/products`. This is correct.)*

3.  **Build the Frontend**:
    Run the following command in your terminal:
    ```bash
    npm run build
    ```
    This will create a `dist` folder.

---

## 🟣 Part 3: Deploy Frontend to Hostinger

1.  **Login to Hostinger hPanel**.
2.  Go to **File Manager**.
3.  Navigate to `public_html`.
4.  **Delete existing files** (like `default.php`).
5.  **Upload the contents of the `dist` folder**:
    *   **Do NOT** upload the `dist` folder itself.
    *   Open `dist` on your computer, select all files (`index.html`, `assets/`, etc.), and upload **THOSE** files to `public_html`.
    *   Your `public_html` should look like this:
        *   `assets/` (folder)
        *   `index.html`
        *   `vite.svg`
        *   ...
6.  **That's it!** (For a static React app on Hostinger, you don't need "Setup Node.js App" if you are only hosting the frontend files. Standard shared hosting works fine for the `dist` files).
    *   *However*, if you want to use the "Setup Node.js App" on Hostinger for some reason (e.g. serving the static files via Express), you can upload `server/` and `app.js` and follow the previous Hostinger guide, but since your API is on Vercel, simple static hosting is easier and faster.

    **Recommended for Hostinger (Frontend Only):**
    *   Just upload `dist` contents to `public_html`.
    *   If you encounter 404 errors on refresh, create a `.htaccess` file in `public_html` with this content:
        ```apache
        <IfModule mod_rewrite.c>
          RewriteEngine On
          RewriteBase /
          RewriteRule ^index\.html$ - [L]
          RewriteCond %{REQUEST_FILENAME} !-f
          RewriteCond %{REQUEST_FILENAME} !-d
          RewriteRule . /index.html [L]
        </IfModule>
        ```

---

## 🛠 Troubleshooting

*   **CORS Errors** (e.g., "Access to fetch has been blocked..."):
    *   Check `server/app.js` on Vercel. Ensure `cors({ origin: true })` is active.
    *   Redeploy Vercel if you changed `app.js`.
*   **"Product added" but not showing**:
    *   Check the Network tab in browser Developer Tools (F12).
    *   Look for the POST request to your Vercel URL.
    *   If it fails, check the response.
*   **Wrong API URL**:
    *   If requests are going to `localhost` or `your-domain.com/api` instead of Vercel, you didn't set `VITE_API_URL` correctly before building.
    *   Update `.env`, run `npm run build` again, and re-upload to Hostinger.
