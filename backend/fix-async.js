const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');
const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js') && !f.endsWith('.bak'));

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix all route handlers to be async
  // Pattern: router.METHOD(path, middlewares..., (req, res) => {
  content = content.replace(/router\.(get|post|put|delete)\(([^)]+)\),\s*\(req,\s*res\)\s*=>\s*{/g, 
    'router.$1($2), async (req, res) => {');
  
  content = content.replace(/router\.(get|post|put|delete)\(([^,]+),\s*\(req,\s*res\)\s*=>\s*{/g, 
    'router.$1($2, async (req, res) => {');
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed ${file}`);
});

console.log('All route handlers are now async');
