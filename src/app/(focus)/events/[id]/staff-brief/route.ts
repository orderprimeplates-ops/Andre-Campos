import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getCurrentUser } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";
import { loadStaffBriefSource } from "@/lib/server/staff-brief";
import { buildStaffBrief, parseSections } from "@/lib/staff-brief";
import { StaffBriefDocument } from "@/components/live/staff-brief-pdf";

export const runtime = "nodejs";

/** GET /events/:id/staff-brief?sections=overview,timeline,… → the Staff Event Brief as a PDF. */
export async function GET(req: Request, { params }: RouteContext<"/events/[id]/staff-brief">) {
  if (!(await getCurrentUser())) return new Response("Not found", { status: 404 });
  const { id } = await params;
  const [source, settings] = await Promise.all([loadStaffBriefSource(id), getSettings()]);
  if (!source) return new Response("Not found", { status: 404 });

  const brief = buildStaffBrief(source, parseSections(new URL(req.url).searchParams.get("sections")));
  const generatedAt = new Intl.DateTimeFormat("en-US", { timeZone: settings.timezone, month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date());
  const pdf = await renderToBuffer(createElement(StaffBriefDocument, { brief, generatedAt, businessName: settings.businessName }) as Parameters<typeof renderToBuffer>[0]);
  const filename = `Staff Brief - ${source.name}`.replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim();
  return new Response(await numberPages(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** "Page 2 of 4" in the footer of every page (stamped after layout, once the page count is known). */
async function numberPages(pdf: Uint8Array): Promise<Uint8Array<ArrayBuffer>> {
  const doc = await PDFDocument.load(pdf);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    const label = `Page ${i + 1} of ${pages.length}`;
    const size = 7.5;
    page.drawText(label, { x: page.getWidth() - 44 - font.widthOfTextAtSize(label, size), y: 22 + 1, size, font, color: rgb(0x8f / 255, 0x82 / 255, 0x77 / 255) });
  });
  return new Uint8Array(await doc.save());
}
