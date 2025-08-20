/*
  Run per-file Swagger JSDoc diagnostics to locate YAML parsing issues.

  Usage:
    npx ts-node scripts/swagger-diagnostics.ts
*/
import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import { getSwaggerOptions } from '../src/config/swagger';

const main = async () => {
  const base = getSwaggerOptions() as any;
  const files: string[] = base.apis || [];
  const cwd = process.cwd();

  const results = files.map((file) => {
    const abs = path.isAbsolute(file)
      ? file
      : path.resolve(cwd, file.replace(/^\.\/*/, ''));

    const opts = { ...base, failOnErrors: true, apis: [abs] } as any;

    try {
      const out = swaggerJSDoc(opts) as any;
      const pathCount = out?.paths ? Object.keys(out.paths).length : 0;
      return { file, absolutePath: abs, ok: true, pathCount };
    } catch (err: any) {
      return {
        file,
        absolutePath: abs,
        ok: false,
        error: err?.message || String(err),
        stack: err?.stack,
      };
    }
  });

  const failed = results.filter(r => !r.ok);
  console.log(JSON.stringify({ summary: { total: results.length, failed: failed.length }, results }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

main().catch((e) => {
  console.error('Diagnostics crashed', e);
  process.exit(2);
});
