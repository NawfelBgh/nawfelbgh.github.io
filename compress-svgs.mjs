import { optimize } from "svgo";
import fs from "fs";
import path from "path";

function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function compressSvgsInDirectory(sourceDir, outputDir) {
  if (!fs.existsSync(sourceDir)) {
    console.log(`Source directory ${sourceDir} does not exist, skipping...`);
    return;
  }

  ensureDirectoryExists(outputDir);

  const files = fs.readdirSync(sourceDir);
  
  files.forEach(file => {
    if (path.extname(file) === '.svg') {
      const sourcePath = path.join(sourceDir, file);
      const outputPath = path.join(outputDir, file);
      if (fs.existsSync(outputPath)) {
        const sourceStat = fs.statSync(sourcePath);
        const outputStat = fs.statSync(outputPath);
        
        // If output is more recent than source, skip
        if (outputStat.mtime > sourceStat.mtime) {
          console.log(`Skipping ${file}`);
          return;
        }
      }

      const svgData = fs.readFileSync(sourcePath, 'utf8');
      const result = optimize(svgData, {
        path: sourcePath,
        multipass: true,
      });
      
      fs.writeFileSync(outputPath, result.data);
      console.log(`Compressed ${file}`);
    }
  });
}

console.log('Compressing SVG files...');

compressSvgsInDirectory('assets-src/blog/web-frontend-performance', 'public/blog/web-frontend-performance');
compressSvgsInDirectory('assets-src/blog/bouffe-front-2025-11-18', 'public/blog/bouffe-front-2025-11-18');
compressSvgsInDirectory('assets-src/thumbnails', 'public/thumbnails');

console.log('SVG compression completed!');