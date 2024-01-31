import { parse } from "@vanillaes/csv"
import canvas2pdf from 'canvas2pdf';
import blobStream from "blob-stream";

const csv = `BestellNr., Menge, Firma, Adresse
1, 70, Demo GmbH, doffmannshausen,
2, 60, Demo AG, ...
`;
let parsed: Array<string[]> = parse(csv)
let [headers, ...entries] = parsed
console.log(headers, entries)

function generate_options_for_headers(headers: Array<string>) {
  return headers.map((header, idx) => `<option value="${idx}">${header}</option>`).join('\n')
}
const uploadFile = document.querySelector<HTMLInputElement>("#upload")
let headerOptions = generate_options_for_headers(headers)
uploadFile.addEventListener("change", (event) => {
  const uploadElem = event.target as HTMLInputElement
  console.dir(uploadElem.files[0]);

}
)
const bestellNrElem = document.getElementById("Bestellnummer")
const previewElem = document.querySelector<HTMLCanvasElement>("#preview")
const pdfPreviewElem = document.getElementById("pdfPreview")
bestellNrElem.innerHTML = headerOptions

function render_deliverynote(ctx, delivery_data, x, y) {
  console.log(delivery_data)
  ctx.reset?.()
  ctx.font = "10px Helvetica"
  // x and y for fillText are in the bottom left corner of the text
  ctx.fillText(`Bestellnummer: ${delivery_data.bestellNr}`, x, y + 15);
}

class Datensatz {
  bestellnummer: number;
  kunde: string;
  adresse: string;
  constructor(bestellnummer: number,
    kunde: string,
    adresse: string) {
    this.bestellnummer = bestellnummer
  }
}

function get_header_assignments() {
  return {
    bestellNr: bestellNrElem.value,
  }
}

function format_data(csv_entries, header_assignments) {
  return csv_entries.map(entry => (
    new Datensatz(
      entry[header_assignments.bestellNr],
      entry[header_assignments.kunde],
      "",
    )
  ))
}

function render_page(context, data) {
  for (const [index, delivery_data_entry] of data.entries()) {
    render_deliverynote(context, delivery_data_entry, 100 * (index % 2), 20 * (index - (index % 2)))
  }
}
const context = previewElem.getContext('2d')
const data = format_data(entries, get_header_assignments())

bestellNrElem.addEventListener("change", (ev) => {
  const newData = format_data(entries, get_header_assignments())
  render_deliverynote(context, newData[0], 0, 0)
})


render_deliverynote(context, data[0], 0, 0)

const renderPDFButton = document.querySelector("button")
renderPDFButton.addEventListener("click", () => {
  const newData = format_data(entries, get_header_assignments())
  let stream = blobStream();
  let ctx = new canvas2pdf.PdfContext(stream);
  ctx.stream.on('finish', () => {
    pdfPreviewElem.src = ctx.stream.toBlobURL('application/pdf');
  });
  render_page(ctx, newData)
  ctx.end()
})
