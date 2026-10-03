import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { BriefLine, StaffBrief } from "@/lib/staff-brief";

// Prime Plates palette (globals.css) in print-friendly form.
const C = { ink: "#2a211d", ink2: "#5e534b", ink3: "#8f8277", line: "#e6ddcf", wine: "#7a2e3a", champagne: "#b8955a", clay: "#a4442e", claySoft: "#f6e4dc", sand: "#f1ebe1" };

const s = StyleSheet.create({
  page: { paddingTop: 58, paddingBottom: 54, paddingHorizontal: 44, fontFamily: "Helvetica", fontSize: 10.5, color: C.ink, lineHeight: 1.35 },
  header: { position: "absolute", top: 22, left: 44, right: 44, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 0.75, borderBottomColor: C.line, paddingBottom: 6 },
  brand: { fontFamily: "Times-Bold", fontSize: 12, color: C.wine, letterSpacing: 1.5 },
  headerRight: { fontSize: 8, color: C.ink3, textTransform: "uppercase", letterSpacing: 1 },
  footerRule: { position: "absolute", bottom: 34, left: 44, right: 44, borderTopWidth: 0.75, borderTopColor: C.line },
  footerLeft: { position: "absolute", bottom: 22, left: 44, right: 140, fontSize: 7.5, color: C.ink3 },
  title: { fontFamily: "Times-Bold", fontSize: 24, lineHeight: 1.1, marginTop: 4 },
  date: { fontSize: 11.5, color: C.wine, marginTop: 6, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: C.ink2, marginTop: 2 },
  critical: { marginTop: 14, backgroundColor: C.claySoft, borderLeftWidth: 3, borderLeftColor: C.clay, padding: 9 },
  criticalLabel: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.clay, letterSpacing: 1.2, marginBottom: 3 },
  criticalLine: { fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 1 },
  section: { marginTop: 18 },
  sectionTitle: { fontFamily: "Times-Bold", fontSize: 15, color: C.wine, borderBottomWidth: 0.75, borderBottomColor: C.champagne, paddingBottom: 3, marginBottom: 6 },
  blockHeading: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.ink3, textTransform: "uppercase", letterSpacing: 1.1, marginTop: 7, marginBottom: 3 },
  fact: { flexDirection: "row", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: C.sand },
  factKey: { width: 110, color: C.ink3, fontSize: 9.5 },
  factVal: { flex: 1, fontFamily: "Helvetica-Bold" },
  line: { flexDirection: "row", paddingVertical: 3 },
  box: { width: 9, height: 9, borderWidth: 0.9, borderColor: C.ink2, marginRight: 7, marginTop: 1.5 },
  time: { width: 62, fontFamily: "Helvetica-Bold", color: C.wine },
  lineBody: { flex: 1 },
  lineTitle: { fontFamily: "Helvetica-Bold" },
  detail: { color: C.ink2, fontSize: 9.5, marginTop: 1 },
});

/** Standard PDF fonts only cover Western characters; drop anything else rather than print garbage. */
const CP1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
const safe = (v: string) => [...v].filter((ch) => ch.charCodeAt(0) <= 0xff || CP1252_EXTRA.includes(ch)).join("");

function Line({ l }: { l: BriefLine }) {
  return (
    <View style={s.line} wrap={false}>
      {l.check && <View style={s.box} />}
      {l.time !== undefined && <Text style={s.time}>{safe(l.time)}</Text>}
      <View style={s.lineBody}>
        <Text style={s.lineTitle}>{safe(l.title)}</Text>
        {l.detail?.map((d, i) => <Text key={i} style={s.detail}>{safe(d)}</Text>)}
      </View>
    </View>
  );
}

export function StaffBriefDocument({ brief, generatedAt, businessName }: { brief: StaffBrief; generatedAt: string; businessName: string }) {
  return (
    <Document title={`Staff brief — ${safe(brief.title)}`} author={safe(businessName)} subject="Staff Event Brief" creator="Prime Plates HQ">
      <Page size="LETTER" style={s.page} wrap>
        <View style={s.header} fixed>
          <Text style={s.brand}>{safe(businessName.toUpperCase())}</Text>
          <Text style={s.headerRight}>Staff Event Brief</Text>
        </View>

        <Text style={s.title}>{safe(brief.title)}</Text>
        <Text style={s.date}>{safe(brief.dateLabel)}</Text>
        <Text style={s.subtitle}>{safe(brief.subtitle)}</Text>

        {brief.critical.length > 0 && (
          <View style={s.critical} wrap={false}>
            <Text style={s.criticalLabel}>CRITICAL — READ FIRST</Text>
            {brief.critical.map((c, i) => <Text key={i} style={s.criticalLine}>{safe(c)}</Text>)}
          </View>
        )}

        {brief.sections.map((sec) => (
          <View key={sec.key} style={s.section}>
            <Text style={s.sectionTitle} minPresenceAhead={60}>{safe(sec.title)}</Text>
            {sec.facts?.map(([k, v]) => (
              <View key={k} style={s.fact} wrap={false}>
                <Text style={s.factKey}>{safe(k)}</Text>
                <Text style={s.factVal}>{safe(v)}</Text>
              </View>
            ))}
            {sec.blocks.map((b, i) => (
              <View key={i}>
                {b.heading && <Text style={s.blockHeading} minPresenceAhead={30}>{safe(b.heading)}</Text>}
                {b.lines.map((l, j) => <Line key={j} l={l} />)}
              </View>
            ))}
          </View>
        ))}

        <View style={s.footerRule} fixed />
        <Text style={s.footerLeft} fixed>{safe(`${brief.title} · Generated ${generatedAt}`)}</Text>
      </Page>
    </Document>
  );
}
