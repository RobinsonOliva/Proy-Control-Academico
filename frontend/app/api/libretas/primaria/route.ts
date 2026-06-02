import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/db";
import { calcularPromedioBimestre, calcularPromedioGeneral } from "@/lib/utils";
import fs from "fs";
import path from "path";

// Mapeo código de curso → clave en el objeto de datos de la libreta
const CODIGO_A_CLAVE: Record<string, string> = {
  PSO: "PSO",
  EDF: "EDF",
  COM: "COM",
  AYC: "AYC",
  ING: "ING",
  MAT: "MAT",
  CYT: "CYT",
  REL: "REL",
  DAN: "DAN",
  CTR: "CTR",
};

// Áreas de la plantilla en orden; se usan para detectar la fila de cada área
const AREAS_ORDENADAS: [string, string][] = [
  ["PERSONAL SOCIAL", "PSO"],
  ["EDUCACIÓN FÍSICA", "EDF"],
  ["COMUNICACIÓN", "COM"],
  ["ARTE Y CULTURA", "AYC"],
  ["INGLÉS COMO LENGUA", "ING"],
  ["MATEMÁTICA", "MAT"],
  ["CIENCIA Y TECNOLOGÍA", "CYT"],
  ["EDUCACIÓN RELIGIOSA", "REL"],
  ["DANZA", "DAN"],
  ["COMPETENCIAS TRANSVERSALES", "CTR"],
];

function toCalificativo(nota: number | null): string {
  if (nota === null || nota === undefined) return "";
  const n = String(nota);
  if (nota >= 18) return `AD/${n}`;
  if (nota >= 14) return `A/${n}`;
  if (nota >= 11) return `B/${n}`;
  return `C/${n}`;
}

// ─── Helpers de XML ────────────────────────────────────────────────────────────

function findAllRows(xml: string): Array<{ start: number; end: number; text: string }> {
  const rows: Array<{ start: number; end: number; text: string }> = [];
  let pos = 0;
  while (pos < xml.length) {
    const a = xml.indexOf("<w:tr>", pos);
    const b = xml.indexOf("<w:tr ", pos);
    if (a === -1 && b === -1) break;
    let s = a === -1 ? b : b === -1 ? a : Math.min(a, b);
    const e = xml.indexOf("</w:tr>", s) + 7;
    if (e < 7) break;
    rows.push({ start: s, end: e, text: xml.slice(s, e) });
    pos = e;
  }
  return rows;
}

function getNthCellBounds(
  rowXml: string,
  n: number
): { start: number; end: number } | null {
  let pos = 0;
  let count = 0;
  while (pos < rowXml.length) {
    const a = rowXml.indexOf("<w:tc>", pos);
    const b = rowXml.indexOf("<w:tc ", pos);
    if (a === -1 && b === -1) break;
    let s = a === -1 ? b : b === -1 ? a : Math.min(a, b);
    const e = rowXml.indexOf("</w:tc>", s) + 7;
    if (count === n) return { start: s, end: e };
    pos = e;
    count++;
  }
  return null;
}

function getRowCellTexts(rowXml: string): string[] {
  const cells: string[] = [];
  let pos = 0;
  while (pos < rowXml.length) {
    const a = rowXml.indexOf("<w:tc>", pos);
    const b = rowXml.indexOf("<w:tc ", pos);
    if (a === -1 && b === -1) break;
    let s = a === -1 ? b : b === -1 ? a : Math.min(a, b);
    const e = rowXml.indexOf("</w:tc>", s) + 7;
    const cell = rowXml.slice(s, e);
    const texts = Array.from(cell.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)).map(
      (m) => m[1]
    );
    cells.push(texts.join(""));
    pos = e;
  }
  return cells;
}

/** Inserta un run con placeholder en la celda vacía N de una fila.
 *  rPrXml: XML de <w:rPr>...</w:rPr> a incluir en el run (opcional). */
function injectIntoNthCell(
  rowXml: string,
  n: number,
  placeholder: string,
  rPrXml = ""
): string {
  const b = getNthCellBounds(rowXml, n);
  if (!b) return rowXml;
  let cell = rowXml.slice(b.start, b.end);
  cell = cell.replace(
    /(<\/w:pPr>)(<\/w:p>)/,
    `$1<w:r>${rPrXml}<w:t>${placeholder}</w:t></w:r>$2`
  );
  return rowXml.slice(0, b.start) + cell + rowXml.slice(b.end);
}

/** Reemplaza todos los runs de la celda N con un único run de placeholder */
function replaceNthCellContent(rowXml: string, n: number, placeholder: string): string {
  const b = getNthCellBounds(rowXml, n);
  if (!b) return rowXml;
  let cell = rowXml.slice(b.start, b.end);
  cell = cell.replace(/<w:r[ >][\s\S]*?<\/w:r>/g, "");
  cell = cell.replace(
    /(<\/w:pPr>)(<\/w:p>)/,
    `$1<w:r><w:t>${placeholder}</w:t></w:r>$2`
  );
  return rowXml.slice(0, b.start) + cell + rowXml.slice(b.end);
}

// ─── Inyectar placeholders en el XML del template ─────────────────────────────

function addPlaceholders(xml: string): string {
  const rows = findAllRows(xml);
  const replacements: Array<{ start: number; end: number; newText: string }> = [];

  let currentCode: string | null = null;

  for (const row of rows) {
    const cells = getRowCellTexts(row.text);
    const c0 = cells[0] || "";
    const c1 = cells[1] || "";

    // ── Cabecera: institución (cell 1 tiene texto "S"+"anta"+" "+"María")
    if (cells.some((t) => t.includes("nstituci"))) {
      const newRow = replaceNthCellContent(row.text, 1, "{INSTITUCION}");
      replacements.push({ start: row.start, end: row.end, newText: newRow });
      continue;
    }

    // ── Cabecera: Grado (cell 1 vacía) + Sección (cell 3 tiene "Ú"+"nica")
    if (c0.includes("Grado:")) {
      let newRow = injectIntoNthCell(row.text, 1, "{GRADO}");
      newRow = replaceNthCellContent(newRow, 3, "{SECCION}");
      replacements.push({ start: row.start, end: row.end, newText: newRow });
      continue;
    }

    // ── Cabecera: nombre del alumno (cell 1 vacía)
    if (cells.some((t) => t.includes("Apellidos"))) {
      const newRow = injectIntoNthCell(row.text, 1, "{ALUMNO}");
      replacements.push({ start: row.start, end: row.end, newText: newRow });
      continue;
    }

    // ── Cabecera: nombre del docente (cell 1 vacía)
    if (cells.some((t) => t.includes("Nombre del Docente"))) {
      const newRow = injectIntoNthCell(row.text, 1, "{DOCENTE}");
      replacements.push({ start: row.start, end: row.end, newText: newRow });
      continue;
    }

    // ── Detectar área curricular por celda 0
    for (const [areaText, code] of AREAS_ORDENADAS) {
      if (c0.includes(areaText.substring(0, 6))) {
        // Verificar que realmente es esa área (evitar coincidencias parciales)
        const isMatch = AREAS_ORDENADAS.find(
          ([a]) => c0.trim().replace(/\s+/g, " ").startsWith(a.substring(0, a.length))
        );
        if (isMatch) currentCode = isMatch[1];
        else currentCode = code;
        break;
      }
    }

    // ── Fila de competencia: 7 celdas, cell[1] con texto, cells[2-6] vacías
    if (currentCode && cells.length === 7 && c1.trim() && !cells[2]?.trim()) {
      let newRow = row.text;
      const suffixes = ["B1", "B2", "B3", "B4", "ANU"];
      // rPr explícito: Arial 7pt bold, garantiza que "AD/18" entre en la celda angosta
      const noteRPr =
        '<w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>' +
        '<w:b/><w:sz w:val="14"/><w:szCs w:val="14"/></w:rPr>';
      for (let ci = 2; ci <= 6; ci++) {
        newRow = injectIntoNthCell(
          newRow,
          ci,
          `{${currentCode}_${suffixes[ci - 2]}}`,
          noteRPr
        );
      }
      replacements.push({ start: row.start, end: row.end, newText: newRow });
    }
  }

  // Aplicar reemplazos de atrás hacia adelante para preservar offsets
  let result = xml;
  for (const r of replacements.reverse()) {
    result = result.slice(0, r.start) + r.newText + result.slice(r.end);
  }

  // Reemplazar el año en el título (split como " – 20" + "2" + "6")
  result = result.replace(
    /(<w:t[^>]*>) – 20(<\/w:t><\/w:r>)(<w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t>2<\/w:t><\/w:r>)(<w:r[^>]*><w:rPr>[\s\S]*?<\/w:rPr><w:t>6<\/w:t><\/w:r>)/,
    "$1 – {ANIO}$2"
  );

  return result;
}

// ─── Merge de múltiples documentos Word en uno ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeDocuments(buffers: Buffer[]): Buffer {
  if (buffers.length === 0) throw new Error("Sin documentos");
  if (buffers.length === 1) return buffers[0];

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const PizZip = require("pizzip");
  const mainZip = new PizZip(buffers[0]);
  let mainXml: string = mainZip.file("word/document.xml").asText();

  for (let i = 1; i < buffers.length; i++) {
    const nextZip = new PizZip(buffers[i]);
    const nextXml: string = nextZip.file("word/document.xml").asText();

    const bodyMatch = nextXml.match(/<w:body>([\s\S]*)<\/w:body>/);
    if (!bodyMatch) continue;

    let bodyContent = bodyMatch[1];
    bodyContent = bodyContent.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "");

    const pageBreak = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    mainXml = mainXml.replace(/<w:sectPr/, pageBreak + bodyContent + "<w:sectPr");
  }

  mainZip.file("word/document.xml", mainXml);
  return Buffer.from(mainZip.generate({ type: "arraybuffer" }));
}

// ─── GET /api/libretas/primaria ───────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const gradoId = searchParams.get("gradoId");
  const aulaId = searchParams.get("aulaId");
  const anioParam = searchParams.get("anio");

  if (!gradoId || !aulaId || !anioParam) {
    return NextResponse.json({ error: "Parámetros faltantes." }, { status: 400 });
  }
  const anio = parseInt(anioParam);

  try {
    // ── 1. Aula + grado + alumnos ───────────────────────────────────────────
    const aula = await prisma.aula.findUnique({
      where: { id: aulaId },
      include: {
        grado: true,
        alumnos: {
          where: { activo: true },
          orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
        },
      },
    });
    if (!aula) {
      return NextResponse.json({ error: "Aula no encontrada." }, { status: 404 });
    }

    // ── 2. Cursos del grado con bimestres y criterios ───────────────────────
    const cursos = await prisma.curso.findMany({
      where: { gradoId, activo: true },
      include: {
        bimestres: {
          where: { activo: true },
          orderBy: { numero: "asc" },
          include: { criterios: { where: { activo: true } } },
        },
      },
    });

    // ── 3. Docente principal de la sección ─────────────────────────────────
    const cursoAulas = await prisma.cursoAula.findMany({
      where: { aulaId },
      include: { docente: true },
    });

    const teacherCount = new Map<string, { name: string; count: number }>();
    for (const ca of cursoAulas) {
      if (ca.docente && ca.docenteId) {
        const prev = teacherCount.get(ca.docenteId) ?? { name: ca.docente.name, count: 0 };
        teacherCount.set(ca.docenteId, { name: ca.docente.name, count: prev.count + 1 });
      }
    }
    let mainTeacher = "";
    let maxCount = 0;
    for (const v of Array.from(teacherCount.values())) {
      if (v.count > maxCount) { maxCount = v.count; mainTeacher = v.name; }
    }

    // ── 4. Matrículas y calificaciones de todos los alumnos ─────────────────
    const alumnoIds = aula.alumnos.map((a) => a.id);
    const matriculas = await prisma.matricula.findMany({
      where: { alumnoId: { in: alumnoIds }, anio, activo: true },
      include: {
        curso: true,
        calificaciones: {
          include: {
            criterio: { include: { bimestre: true } },
          },
        },
      },
    });

    // Agrupar matrículas por alumno
    const matPorAlumno = new Map<string, typeof matriculas>();
    for (const mat of matriculas) {
      const arr = matPorAlumno.get(mat.alumnoId) ?? [];
      arr.push(mat);
      matPorAlumno.set(mat.alumnoId, arr);
    }

    // ── 5. Preparar template con placeholders ─────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PizZip = require("pizzip");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Docxtemplater = require("docxtemplater");

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "libreta-primaria.docx"
    );
    const templateBuffer = fs.readFileSync(templatePath);

    // Preparar XML con placeholders (una sola vez para todos los alumnos)
    const tempZip = new PizZip(templateBuffer);
    const originalXml: string = tempZip.file("word/document.xml").asText();
    const modifiedXml = addPlaceholders(originalXml);

    const schoolName =
      process.env.NEXT_PUBLIC_SCHOOL_NAME || "Santa María";

    // ── 6. Generar un documento por alumno ────────────────────────────────
    const docBuffers: Buffer[] = [];

    for (const alumno of aula.alumnos) {
      const mats = matPorAlumno.get(alumno.id) ?? [];

      // Construir data object para docxtemplater
      const data: Record<string, string> = {
        INSTITUCION: schoolName,
        GRADO: aula.grado.nombre,
        SECCION: aula.seccion,
        ALUMNO: `${alumno.apellidos} ${alumno.nombres}`,
        DOCENTE: mainTeacher || "—",
        ANIO: String(anio),
      };

      // Inicializar todas las notas en vacío
      for (const clave of Object.values(CODIGO_A_CLAVE)) {
        data[`${clave}_B1`] = "";
        data[`${clave}_B2`] = "";
        data[`${clave}_B3`] = "";
        data[`${clave}_B4`] = "";
        data[`${clave}_ANU`] = "";
      }

      // Calcular promedios por curso y bimestre
      for (const mat of mats) {
        const clave = CODIGO_A_CLAVE[mat.curso.codigo];
        if (!clave) continue;

        const cursoData = cursos.find((c) => c.id === mat.cursoId);
        if (!cursoData) continue;

        const bimestresPromedios: (number | null)[] = [];

        for (const bimestre of cursoData.bimestres) {
          const califs = mat.calificaciones.filter(
            (cal) => cal.criterio.bimestreId === bimestre.id
          );

          if (califs.length === 0) {
            bimestresPromedios.push(null);
            continue;
          }

          const notas = bimestre.criterios.map((crit) => {
            const cal = califs.find((c) => c.criterioId === crit.id);
            return cal?.nota ?? null;
          });
          const pesos = bimestre.criterios.map((c) => c.peso);
          const prom = calcularPromedioBimestre(notas, pesos);
          bimestresPromedios.push(prom);

          const key = `B${bimestre.numero}`;
          data[`${clave}_${key}`] = toCalificativo(prom);
        }

        const promAnual = calcularPromedioGeneral(bimestresPromedios);
        data[`${clave}_ANU`] = toCalificativo(promAnual);
      }

      // Generar documento con docxtemplater
      const zip = new PizZip(templateBuffer);
      zip.file("word/document.xml", modifiedXml);

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => "",
      });
      doc.setData(data);
      doc.render();

      const buf: Buffer = Buffer.from(
        doc.getZip().generate({ type: "arraybuffer" })
      );
      docBuffers.push(buf);
    }

    if (docBuffers.length === 0) {
      return NextResponse.json(
        { error: "No hay alumnos activos en esta sección." },
        { status: 404 }
      );
    }

    // ── 7. Merge y devolver descarga ──────────────────────────────────────
    const merged = mergeDocuments(docBuffers);
    const gradoSlug = aula.grado.nombre.replace(/\s+/g, "_");
    const filename = `Libretas_${gradoSlug}_Sec${aula.seccion}_${anio}.docx`;

    return new NextResponse(new Uint8Array(merged), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Error generando libretas:", err);
    return NextResponse.json({ error: "Error al generar el documento." }, { status: 500 });
  }
}
