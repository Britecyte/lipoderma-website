# Lipoderma

Static site for lipoderma.com.

## Local preview

```bash
python3 serve.py
```

Open http://127.0.0.1:8000/.

## Structure

- `images/`, `data/`, `js/`, `css/` — live site files
- `gallery/` and `science/` — public subpages
- `_archive/` — versioned source and retired assets; excluded from GitHub Pages deployment

Deploys through `.github/workflows/deploy-pages.yml` on pushes to `main`.
