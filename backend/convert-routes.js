const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace synchronous route handlers with async
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*(?:authenticateToken,\s*)?(?:requireRole\([^)]+\),\s*)?\(req,\s*res\)\s*=>\s*{/g, 
    'router.$1($2, async (req, res) => {');
  
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*authenticateToken,\s*\(req,\s*res\)\s*=>\s*{/g,
    'router.$1($2, authenticateToken, async (req, res) => {');
    
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*authenticateToken,\s*requireRole\(([^)]+)\),\s*\(req,\s*res\)\s*=>\s*{/g,
    'router.$1($2, authenticateToken, requireRole($3), async (req, res) => {');
  
  // Add await to db calls
  content = content.replace(/db\.prepare\(([^)]+)\)\.(get|all|run)\(/g, 'await db.prepare($1).$2(');
  
  fs.writeFileSync(filePath, content);
  console.log(`Converted ${file}`);
});

console.log('All route files converted to async/await');
