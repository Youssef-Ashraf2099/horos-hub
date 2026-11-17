# HOROS Hub (`horos-hub`)

Portfolio and technical documentation website for the **HOROS Framework** (*Smart Cyber-Defense & Autonomous Safe Recovery for Autonomous Robots*).

- **Live URL:** https://Youssef-Ashraf2099.github.io/horos-hub/
- **Main Framework Repo:** https://github.com/Youssef-Ashraf2099/horos_framework

## Tech Stack
- **Astro 7** (Static site generation, zero-JS default islands, `/horos-hub` base path support)
- **Tailwind CSS v4** (`@tailwindcss/vite`, dark/light mode)
- **KaTeX** (`katex` + `remark-math` + `rehype-katex` for static math rendering)
- **SEO & Sitemap** (`@astrojs/sitemap`, Open Graph, Twitter Card, JSON-LD `SoftwareSourceCode` + `ScholarlyArticle`)

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Deployment (GitHub Pages)
Push to `main`. The included `.github/workflows/deploy.yml` automatically builds `./dist` and deploys it to GitHub Pages. Make sure **Settings → Pages → Source** is set to **GitHub Actions** in your repository.
