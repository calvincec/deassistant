The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

# Revert to a Commit Safely (New Commit) 
If you have already pushed your changes to github, it is safer to use git revert. This creates a new commit that undoes changes back to your target state without rewriting history. 

```sh
git log --oneline
git revert --no-commit 7be586a..HEAD 
git commit -m "..."
```