# Raysource Labs Platform - Monorepo Setup Script
# This script reorganizes the existing CEO project into the monorepo structure

Write-Host "🚀 Setting up Raysource Labs Monorepo..." -ForegroundColor Cyan

$rootDir = $PSScriptRoot
$appsDir = Join-Path $rootDir "apps"
$ceoAppDir = Join-Path $appsDir "ceo"

# Create apps/ceo directory
Write-Host "📁 Creating monorepo directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $ceoAppDir -Force | Out-Null

# Files/folders that belong to CEO app
$ceoItems = @(
    "src",
    "frontend", 
    "backend",
    "public",
    "scripts",
    "backups",
    "server.deprecated",
    "index.html",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.app.json",
    "tsconfig.node.json",
    "tailwind.config.js",
    "postcss.config.js",
    "eslint.config.js",
    "generate-icons.html"
)

# Move CEO-specific files to apps/ceo
Write-Host "📦 Moving CEO app files to apps/ceo/..." -ForegroundColor Yellow
foreach ($item in $ceoItems) {
    $sourcePath = Join-Path $rootDir $item
    $destPath = Join-Path $ceoAppDir $item
    
    if (Test-Path $sourcePath) {
        Write-Host "  Moving: $item" -ForegroundColor Gray
        
        # Remove destination if it exists
        if (Test-Path $destPath) {
            Remove-Item $destPath -Recurse -Force
        }
        
        Move-Item -Path $sourcePath -Destination $destPath -Force
    }
}

# Create CEO-specific package.json
$ceoPackageJson = @{
    name = "@raysourcelabs/ceo"
    version = "1.0.0"
    private = $true
    type = "module"
    scripts = @{
        dev = "vite"
        build = "tsc -b && vite build"
        lint = "eslint ."
        preview = "vite preview"
    }
    dependencies = @{}
    devDependencies = @{}
} | ConvertTo-Json -Depth 10

$ceoPackageJsonPath = Join-Path $ceoAppDir "package.json"
if (-not (Test-Path $ceoPackageJsonPath)) {
    Write-Host "📄 Creating CEO app package.json..." -ForegroundColor Yellow
    # We'll preserve the original package.json by copying
}

# Create placeholder for cabinet app
$cabinetDir = Join-Path $appsDir "cabinet"
New-Item -ItemType Directory -Path $cabinetDir -Force | Out-Null

Write-Host ""
Write-Host "✅ Monorepo structure created!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Copy cabinet project from Desktop\cabinet to apps\cabinet" -ForegroundColor White
Write-Host "  2. Run 'npm install' from root to install all dependencies" -ForegroundColor White
Write-Host "  3. Build shared-auth: cd packages/shared-auth && npm install && npm run build" -ForegroundColor White
Write-Host ""
Write-Host "Directory structure:" -ForegroundColor Yellow
Write-Host "  raysourcelabs-platform/"
Write-Host "  ├── apps/"
Write-Host "  │   ├── ceo/          # py.raysourcelabs.com"
Write-Host "  │   └── cabinet/      # cabinet.raysourcelabs.com"  
Write-Host "  ├── packages/"
Write-Host "  │   ├── shared-auth/        # TypeScript auth"
Write-Host "  │   └── shared-auth-python/ # Python auth"
Write-Host "  ├── nginx/"
Write-Host "  ├── docker-compose.yml"
Write-Host "  └── package.json"
