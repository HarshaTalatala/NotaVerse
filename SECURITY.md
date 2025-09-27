Security checklist and cleanup actions

- Removed local sensitive files from the repository index and added templates (.env, api/local.settings.json).
- Ensure you rotate any keys that were committed to the repository (Firebase, Azure Storage, Gemini/API keys).

How to rotate compromised keys

1. For Firebase service account private keys: generate a new service account key from Google Cloud Console and update your local `api/local.settings.json` or environment variables.
2. For Azure Storage: regenerate the account keys in the Azure Portal and update your local `.env` or `api/local.settings.json`.
3. For API keys (Gemini/Google, Supabase, etc.): revoke the compromised key and generate a new one.

Removing secrets from git history (advanced)

If secrets have been committed, follow these steps to remove them from history (this rewrites commits):

- Use the `git filter-repo` tool or the BFG Repo-Cleaner.
- Example with filter-repo:
  1. Install: `pip install git-filter-repo`
  2. Run: `git filter-repo --path .env --path api/local.settings.json --invert-paths`

Note: Rewriting history requires force-pushing to remotes and coordination with collaborators.

After cleaning up

- Add the secret-containing files to `.gitignore`.
- Commit templates (e.g. `.env.example`, `api/local.settings.json.template`) with placeholder values so others know which variables to set.
- Never commit real keys or private credentials to version control.