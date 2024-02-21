import { parse } from "@vanillaes/csv"
import canvas2pdf from 'canvas2pdf';
import blobStream from "blob-stream";

// TODO fill fields for deliverynote
const EntryKeys = ["Bestellnummer", "Adresse", "Firma", "Menge"] as const

type EntryKeyUnion = typeof EntryKeys[number]

type Entry = { [Key in (EntryKeyUnion)]: string }

type HeaderAssignments = { [Key in (EntryKeyUnion)]: number }

const previewElem = document.querySelector<HTMLCanvasElement>("#preview")
const context = previewElem.getContext('2d')
const pdfPreviewElem = document.querySelector<HTMLIFrameElement>("#pdfPreview")
const form = document.querySelector("form")
const uploadFile = document.querySelector<HTMLInputElement>("#upload")
const renderPDFButton = document.querySelector("button")

let entries: string[][]

async function handleCSVupload(event) {
  const uploadElem = event.target as HTMLInputElement
  const file = uploadElem.files[0]
  const csvtext = await file.text()
  const parsed: Array<string[]> = parse(csvtext)
  const headers = parsed[0]
  entries = parsed.slice(1)
  
  const headerOptions = headers.map((header, idx) => `<option value="${idx}">${header}</option>`).join('\n')
  
  const formHtml = EntryKeys.map((header) => `
  <div>
  <label for="${header}">${header}</label>
  <select name="${header}" id="${header}">
  ${headerOptions}
  </select>
  </div>
  `).join('\n')
  form.innerHTML = formHtml
  
  const selectElems = form.querySelectorAll("select")

  selectElems.forEach(elem => elem.addEventListener("change", handleHeaderAssignmentChange))
  
  const data = format_data(entries, get_header_assignments())
  
  render_deliverynote(context, data[0], 0, 0)
}

uploadFile.addEventListener("change", handleCSVupload)
renderPDFButton.addEventListener("click", renderPDF)

function handleHeaderAssignmentChange(ev) {
  const newData = format_data(entries, get_header_assignments())
  render_deliverynote(context, newData[0], 0, 0)
}


function renderPDF() {
  const newData = format_data(entries, get_header_assignments());
  let stream = blobStream();
  let ctx = new canvas2pdf.PdfContext(stream);
  ctx.stream.on('finish', () => {
    pdfPreviewElem.src = ctx.stream.toBlobURL('application/pdf');
  });
  render_page(ctx, newData);
  ctx.end();
};

function format_data(csv_entries: string[][], header_assignments: Partial<HeaderAssignments>): Entry[] {
  return csv_entries.map((entry) => {
    const formattedEntry: Entry = {} as Entry;
    for (const key in header_assignments) {  
      if (header_assignments.hasOwnProperty(key)) {
        //entry = row of CSV data. [header_assignments[key]] = column index
        //entry[header_assignments[key]] = retrive value from corrosponding column in CSV data
        //assign retrived value to key in formattedEntry object
        formattedEntry[key] = entry[header_assignments[key]]; 
      }                                                       
    }                                                        
    return formattedEntry; //return formatted data for row
  });
}

function render_page(context: any, data: any[]) {
  for (const [index, delivery_data_entry] of data.entries()) {
    render_deliverynote(context, delivery_data_entry, 100 * (index % 2), 20 * (index - (index % 2)))
  }
}

function render_deliverynote(ctx: CanvasRenderingContext2D, delivery_data: Entry, x: number, y: number) {
  ctx.reset?.();
  ctx.font = "10px Helvetica";
  ctx.fillStyle = "#FF0000";
  // iterate over each key in delivery_data obj. check if delivery_data properties are defined,
  // render prop name(ie. BEstellnummer) followed by corrosponding value from deliver_data
  for (const prop in delivery_data) {
    if (delivery_data.hasOwnProperty(prop)) {
      ctx.fillText(`${prop}: ${delivery_data[prop]}`, x, y + 15); //same as: ctx.fillText(`Bestellnummer: ${delivery_data.Bestellnummer}`, x, y + 15);
      y += 30;
    }
  }
}

function get_header_assignments() {
  const headerassignments: Partial<HeaderAssignments> = {} 
  const selectElems = form.querySelectorAll("select")
  selectElems.forEach(selectelem => {
    headerassignments[selectelem.id] = +selectelem.value
  })
  return headerassignments
}