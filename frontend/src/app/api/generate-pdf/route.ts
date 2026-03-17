import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/utils/logger';

export const maxDuration = 60; // Vercel: allow up to 60s for PDF generation

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get('studentId');
  const reportId = searchParams.get('reportId');

  if (!studentId || !reportId) {
    return NextResponse.json({ error: 'Missing studentId or reportId' }, { status: 400 });
  }

  // Build the full URL of the print page so Puppeteer can load it
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.get('host')}`;
  const printUrl = `${baseUrl}/dashboard/print-report?studentId=${studentId}&reportId=${reportId}`;

  let browser = null;

  try {
    // Dynamically import puppeteer-core + chromium to keep bundle size manageable.
    // For local dev:  npm install puppeteer
    // For Vercel:     npm install puppeteer-core @sparticuz/chromium
    let puppeteer: any;
    let executablePath: string | undefined;

    if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      const chromium = await import('@sparticuz/chromium');
      puppeteer = await import('puppeteer-core');
      executablePath = await chromium.default.executablePath();
    } else {
      puppeteer = await import('puppeteer');
      executablePath = undefined; // puppeteer bundles its own Chromium in dev
    }

    browser = await puppeteer.default.launch({
      args: process.env.VERCEL
        ? (await import('@sparticuz/chromium')).default.args
        : ['--no-sandbox', '--disable-setuid-sandbox'],
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Pass auth cookies from the incoming request so the print page can
    // authenticate with Supabase and fetch the report data.
    const cookieHeader = req.headers.get('cookie') || '';
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').map((c) => {
        const [name, ...rest] = c.trim().split('=');
        return {
          name: name.trim(),
          value: rest.join('=').trim(),
          domain: new URL(baseUrl).hostname,
        };
      });
      await page.setCookie(...cookies);
    }

    // Set A4 viewport to match the print layout
    await page.setViewport({ width: 794, height: 1123 });

    // Navigate and wait until all network requests settle (data is loaded)
    await page.goto(printUrl, { waitUntil: 'networkidle0', timeout: 45000 });

    // Wait for the report content to be rendered.
    // The print-root div is only present once ready=true.
    await page.waitForSelector('.print-root', { timeout: 30000 });

    // Extra buffer for any React re-renders / image loads
    await new Promise((r) => setTimeout(r, 1500));

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,    // preserve colors, backgrounds, badges
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      displayHeaderFooter: false,
    });

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="competency-report-${reportId}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    logger.error('[generate-pdf] Error generating PDF', { studentId, reportId, detail: String(err) });
    return NextResponse.json(
      { error: 'Failed to generate PDF', detail: String(err) },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close();
  }
}