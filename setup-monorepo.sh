#!/usr/bin/env bash
set -euo pipefail
echo "▶ Scaffolding Black Phoenix monorepo…"

mkdir -p apps/{landing,web,admin,api}/src packages/{ui,contexts,supabase,data}/src

# ---------- workspace + turbo ----------
cat > pnpm-workspace.yaml <<'EOF'
packages:
  - "apps/*"
  - "packages/*"
EOF

cat > turbo.json <<'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":   { "cache": false, "persistent": true },
    "typecheck": {}
  }
}
EOF

cat > tsconfig.base.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020", "module": "ESNext", "moduleResolution": "bundler",
    "jsx": "react-jsx", "strict": true, "skipLibCheck": true,
    "esModuleInterop": true, "resolveJsonModule": true, "baseUrl": ".",
    "paths": {
      "@bpx/ui": ["packages/ui/src"],
      "@bpx/contexts": ["packages/contexts/src"],
      "@bpx/contexts/*": ["packages/contexts/src/*"],
      "@bpx/supabase": ["packages/supabase/src"],
      "@bpx/data": ["packages/data/src"]
    }
  }
}
EOF

# ---------- shared packages ----------
for pkg in ui contexts supabase data; do
  cat > "packages/$pkg/package.json" <<EOF
{
  "name": "@bpx/$pkg",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts", "./*": "./src/*.ts" }
}
EOF
  [ -f "packages/$pkg/src/index.ts" ] || echo "export {};" > "packages/$pkg/src/index.ts"
done

# ---------- apps ----------
make_app () {
  local name="$1" base="$2" pkgname="$3"
  cat > "apps/$name/package.json" <<EOF
{
  "name": "@bpx/$pkgname",
  "private": true,
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": {
    "@bpx/ui": "workspace:*",
    "@bpx/contexts": "workspace:*",
    "@bpx/supabase": "workspace:*",
    "@bpx/data": "workspace:*",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "4.7.0",
    "@tailwindcss/vite": "4.1.12",
    "vite": "6.3.5",
    "typescript": "^5.5.0"
  }
}
EOF
  cat > "apps/$name/vite.config.ts" <<EOF
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ base: "$base", plugins: [react(), tailwindcss()] });
EOF
  cat > "apps/$name/tsconfig.json" <<'EOF'
{ "extends": "../../tsconfig.base.json", "include": ["src"] }
EOF
  cat > "apps/$name/index.html" <<EOF
<!doctype html><html><head><meta charset="UTF-8"/><title>Black Phoenix — $name</title></head>
<body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
EOF
}

make_app landing "/"        landing
make_app web     "/portal/" web
make_app admin   "/admin/"  admin
make_app api     "/"        api

# SPA-fallback vercel.json for the three secondary apps
for a in web admin api; do
  cat > "apps/$a/vercel.json" <<'EOF'
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
EOF
done

# landing owns the apex + proxies the others (EDIT the destination URLs after first deploy)
cat > apps/landing/vercel.json <<'EOF'
{
  "rewrites": [
    { "source": "/portal/:path*", "destination": "https://bpx-web.vercel.app/portal/:path*" },
    { "source": "/admin/:path*",  "destination": "https://bpx-admin.vercel.app/admin/:path*" },
    { "source": "/api/:path*",    "destination": "https://bpx-api.vercel.app/api/:path*" },
    { "source": "/(.*)",          "destination": "/index.html" }
  ]
}
EOF

echo "✅ Skeleton created."
echo ""
echo "NEXT — move your existing code (verify paths against your tree):"
cat <<'EOF'
  git mv src/app/components/ui/*  packages/ui/src/
  git mv src/app/contexts/*       packages/contexts/src/
  git mv src/utils/supabase/*     packages/supabase/src/
  git mv src/app/data/* src/app/config/* packages/data/src/
  # Then drop in the three routes.tsx + crossNav.ts + routeOwnership.ts,
  # move page/portal components into apps/{landing,web,admin}/src/, and run:
  pnpm install && pnpm dev
EOF
