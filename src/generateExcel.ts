import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

export async function generateExcel(): Promise<void> {
  const inputPath = path.resolve('scraped-observations.json');
  const outputPath = path.resolve('scraped-observations.xlsx');

  if (!fs.existsSync(inputPath)) {
    console.error('❌ scraped-observations.json does not exist.');
    return;
  }

  // Read NDJSON line by line and parse
  const lines = fs.readFileSync(inputPath, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        console.error('❌ Failed to parse line:', line);
        return null;
      }
    })
    .filter(Boolean); // Remove nulls

  if (lines.length === 0) {
    console.warn('⚠️ No data to export.');
    return;
  }

  const workbook = new ExcelJS.Workbook();
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet('Observations');

  const headers = [
    'date',
    'week_number',
    'number',
    'life_stage (database)',
    'life_stage',
    'sex',
    'country',
    'location',
    'province',
    'x (Ea)',
    'y (N)',
    'Latitude',
    'Longitude',
    'activity',
    'host_plants',
    'hasComments',
    'comment',
    'link',
  ];

  sheet.addRow(headers);

  for (const obs of lines) {
    const row = [
      obs.date,
      '',
      obs.numberText || '',
      obs.lifeStage || '',
      '', // life_stage (blank)
      obs.sex || '',
      obs.country || '',
      obs.location || '',
      obs.province || '',
      obs.xEa || '',
      obs.yN || '',
      obs.latitude || '',
      obs.longitude || '',
      obs.activity || '',
      obs.onIn || '',
      obs.hasComments ? 'Yes' : 'No',
      '', // comment (blank)
      obs.url || '',
    ];
    sheet.addRow(row);
  }

  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Excel exported successfully to ${outputPath}`);
}
