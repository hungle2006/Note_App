// Compress Blender's authored solar texture for mobile WebGL without changing artwork.
import fs from "node:fs/promises";
import sharp from "sharp";
const path="public/images/sun-photosphere.jpg";
const original=await fs.readFile(path);
const optimized=await sharp(original).resize(768,384).jpeg({quality:62,mozjpeg:true}).toBuffer();
if(optimized.length<3000 || optimized.length>200000)throw new Error("Unexpected sun texture size.");
await fs.writeFile(path,optimized);
console.log("Sun texture:",original.length,"→",optimized.length,"bytes (768×384).");
