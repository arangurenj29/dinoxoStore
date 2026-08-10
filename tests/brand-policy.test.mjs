import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const brandBookUrl = new URL('../brand/brand-book-v1.md', import.meta.url);
const brandReadmeUrl = new URL('../brand/README.md', import.meta.url);
const buildAssetsUrl = new URL(
  '../brand/tools/build_brand_assets.py',
  import.meta.url,
);
const buildPdfUrl = new URL(
  '../brand/tools/build_brand_book_pdf.py',
  import.meta.url,
);
const buildPdfQaUrl = new URL(
  '../brand/tools/build_pdf_qa.py',
  import.meta.url,
);
const primaryLogoUrl = new URL(
  '../brand/assets/logo/dinoxostore-logo-primary.png',
  import.meta.url,
);

test('el Brand Book declara el PNG raster aprobado como única fuente del logo', async () => {
  const brandBook = await readFile(brandBookUrl, 'utf8');

  assert.match(brandBook, /dinoxostore-logo-primary\.png/);
  assert.match(brandBook, /única fuente maestra del logo/i);
  assert.doesNotMatch(
    brandBook,
    /Trabaja siempre desde los SVG de `brand\/assets\/logo\/`/,
  );
});

test('reserva SVG exclusivamente para iconografía funcional', async () => {
  const brandBook = await readFile(brandBookUrl, 'utf8');

  assert.match(
    brandBook,
    /SVG se reserva exclusivamente para iconografía funcional/i,
  );
  assert.doesNotMatch(brandBook, /dinoxostore-(?:logo|symbol)[^`\s]*\.svg/i);
  assert.doesNotMatch(brandBook, /logo SVG|SVG correcto para el contexto/i);
});

test('README y herramientas operativas usan el raster aprobado y no logos SVG', async () => {
  const [readme, buildAssets, buildPdf, buildPdfQa] = await Promise.all([
    readFile(brandReadmeUrl, 'utf8'),
    readFile(buildAssetsUrl, 'utf8'),
    readFile(buildPdfUrl, 'utf8'),
    readFile(buildPdfQaUrl, 'utf8'),
  ]);
  const activeFlow = [readme, buildAssets, buildPdf, buildPdfQa].join('\n');

  assert.match(readme, /dinoxostore-logo-primary\.png/);
  assert.match(readme, /SVG exclusivamente para iconos/i);
  assert.doesNotMatch(readme, /assets\/logo\/[^`\s]*\.svg/i);
  assert.doesNotMatch(buildAssets, /def build_logos|build_logos\(\)/);
  assert.doesNotMatch(buildAssets, /assets" \/ "logo"/);
  assert.match(buildPdf, /dinoxostore-logo-primary\.png/);
  assert.doesNotMatch(buildPdf, /SOURCE_.*SVG|render_svg_source|\.svg["']/i);
  assert.match(buildPdfQa, /dinoxostore-logo-primary\.png/);
  assert.doesNotMatch(activeFlow, /svg-renders|SOURCE SVG CONVERSION/i);
  assert.doesNotMatch(activeFlow, /archive\/legacy-vector-logo\/[^`\s]*\.svg/i);
});

test('el raster maestro conserva exactamente los bytes aprobados', async () => {
  const logo = await readFile(primaryLogoUrl);
  const digest = createHash('sha256').update(logo).digest('hex');

  assert.equal(
    digest,
    '3505157d019c6bc9b843095be28b7326844c6b744645a4604d769fe576b8764d',
  );
});
