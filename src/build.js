const handlebars = require('handlebars');
const fs = require('fs-extra');
const markdownHelper = require('./utils/helpers/markdown');
const templateData = require('./metadata/metadata');
const Puppeteer = require('puppeteer');
const getSlug = require('speakingurl');
const dayjs = require('dayjs');
const repoName = require('git-repo-name');
const username = require('git-username');

const srcDir = __dirname;
const outputDir = __dirname + '/../dist';

const buildPdf = async function (inputFile, outputFile) {
  console.log('Launching browser...');
  const browser = await Puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('Browser launched');
  
  const page = await browser.newPage();
  console.log(`Loading file: ${inputFile}`);
  
  await page.goto(`file://${inputFile}`, {
    waitUntil: 'networkidle0'
  });
  console.log('Page loaded');
  
  console.log(`Generating PDF: ${outputFile}`);
  await page.pdf({
    path: outputFile,
    format: 'A4',
    border: 0,
    margin: {
      top: '1.5cm',
      right: '1.5cm',
      bottom: '1.5cm',
      left: '1.5cm',
    },
  });
  console.log('PDF file written');
  
  await browser.close();
  console.log('Browser closed');
};

const main = async () => {
  console.log('Starting build...');
  
  // Clear dist dir
  fs.emptyDirSync(outputDir);
  console.log('✓ Cleared dist directory');

  // Copy assets
  fs.copySync(srcDir + '/assets', outputDir);
  console.log('✓ Copied assets');

  // Build HTML
  handlebars.registerHelper('markdown', markdownHelper);
  const source = fs.readFileSync(srcDir + '/templates/index.html', 'utf-8');
  const template = handlebars.compile(source);
  const pdfFileName = `${getSlug(templateData.name)}.${getSlug(templateData.title)}.pdf`;
  const html = template({
    ...templateData,
    baseUrl: `https://${username()}.github.io/${repoName.sync()}`,
    pdfFileName,
    updated: dayjs().format('MMMM D, YYYY'),
  });
  fs.writeFileSync(outputDir + '/index.html', html);
  console.log('✓ Generated HTML');

  // Build PDF
  console.log('Generating PDF...');
  try {
    await buildPdf(`${outputDir}/index.html`, `${outputDir}/${pdfFileName}`);
    console.log(`✓ PDF generated: ${pdfFileName}`);
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
};

main().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});

