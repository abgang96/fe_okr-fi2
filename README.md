# OKR Tree - Microsoft Teams App

This is a Microsoft Teams app for visualizing and managing your team's Objectives and Key Results (OKRs) in a tree structure. 

## Features

- Visualize OKRs in a hierarchical tree structure
- Create, edit, and delete objectives
- Add tasks to objectives
- Track progress with circular completion indicators
- View and manage your assigned tasks 
- Automatically adapts to Teams' theme (light, dark, high contrast)

## Local Development

### Prerequisites

- Node.js 16.x or higher
- npm 8.x or higher
- A Microsoft 365 developer tenant (for Teams integration)

### Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_API_URL=http://localhost:8000  # URL to your Django backend
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser to `http://localhost:3000`

## Deploying to Microsoft Teams

### 1. Register your app in Microsoft Entra ID (Azure AD)

1. Go to the [Microsoft Entra ID admin center](https://entra.microsoft.com/)
2. Navigate to **App registrations** > **New registration**
3. Enter a name for your app
4. For Redirect URI, select **Web** and enter `https://your-app-domain/auth`
5. Click **Register**
6. Make note of the **Application (client) ID** and **Directory (tenant) ID**
7. Navigate to **Certificates & secrets** > **New client secret**
8. Create a new secret and copy its value

### 2. Create your Teams app package

1. Modify the `teams/manifest.json` file:
   - Replace the `{yourAppDomain}` placeholders with your app's domain
   - Update the `id` with a new valid GUID 
   - Update the developer details

2. Create two app icons:
   - `teams/color.png` (192x192 pixels) - Full color icon
   - `teams/outline.png` (32x32 pixels) - Outline icon with transparent background

3. Zip the manifest file and icons into a package:

```bash
cd teams
zip -r ../okr-tree.zip manifest.json color.png outline.png
```

### 3. Deploy your Next.js app

#### Option 1: Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

#### Option 2: Deploy to Azure

1. Create an Azure Storage account 
2. Enable the Static Website feature
3. Set the index document name to `index.html` and error document path to `index.html`
4. Build your Next.js app:

```bash
npm run build
npm run export # Creates an out directory with static files
```

5. Upload the contents of the `out` directory to your Azure Storage static website

### 4. Upload to Teams

1. Open Microsoft Teams
2. Go to the Apps section
3. Click "Upload a custom app" (you may need admin permissions)
4. Select your `okr-tree.zip` package
5. Follow the installation wizard

## Publishing to Microsoft Teams Store

To publish your app to the Microsoft Teams Store:

1. Ensure your app meets all [Microsoft Teams app validation guidelines](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish)
2. Submit your app through the [Partner Center](https://partner.microsoft.com/en-us/dashboard/home)
3. Complete the Store listing details, including:
   - App name, description, and icons
   - Privacy policy and terms of use URLs
   - Support contact information
   - Screenshots and videos showcasing your app

For a complete guide, see the [Microsoft documentation on publishing to the Teams app store](https://docs.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/publish).

## License

MIT 