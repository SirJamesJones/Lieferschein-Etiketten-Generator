import { parse } from "@vanillaes/csv"
import canvas2pdf from 'canvas2pdf';
import blobStream from "blob-stream";

const EntryKeys = ["Bestellnummer","Firma", "Menge", "Vorname", "Nachname", "Straße", "PLZ", "Stadt", "Land" ] as const

type EntryKeyUnion = typeof EntryKeys[number]

type Entry = { [Key in (EntryKeyUnion)]: string }

type HeaderAssignments = { [Key in (EntryKeyUnion)]: number }

const previewElem = document.querySelector<HTMLCanvasElement>("#preview")
const context = previewElem.getContext('2d')
const pdfPreviewElem = document.querySelector<HTMLIFrameElement>("#pdfPreview")
const form = document.querySelector("form")
const uploadFile = document.querySelector<HTMLInputElement>("#upload")
const renderPDFButton = document.querySelector("#renderPDF") as HTMLButtonElement;

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
        //entry = row of CSV data | [header_assignments[key]] = column index
        //entry[header_assignments[key]] = retrive value from corrosponding column in CSV data
        //assign retrived value to key in formattedEntry object
        formattedEntry[key] = entry[header_assignments[key]]; 
      }                                                       
    }                                                        
    return formattedEntry;
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
  // render prop name(ie. Bestellnummer) followed by corrosponding value from deliver_data
  for (const data in delivery_data) {
    if (delivery_data.hasOwnProperty(data)) {
      ctx.fillText(`${data}: ${delivery_data[data]}`, x, y + 15); //same as: ctx.fillText(`Bestellnummer: ${delivery_data.Bestellnummer}`, x, y + 15);
      y += 30;
    }
  }
  //for contact input fields render in frontend
  ctx.fillText(`Ansprechpartner: ${contactvalues[0]}`, x , y + 15);
  ctx.fillText(`Ansprechpartner Tel.: ${contactvalues[1]}`, x , y + 30);
  ctx.fillText(`Ansprechpartner E-Mail: ${contactvalues[2]}`, x , y + 45);
}

function get_header_assignments() {
  const headerassignments: Partial<HeaderAssignments> = {} 
  const selectElems = form.querySelectorAll("select")
  selectElems.forEach(selectelem => {
    headerassignments[selectelem.id] = +selectelem.value
  })
  return headerassignments
}

// Bad Code Area :^)

// get HTMLCollection turn into Element array and take value of input fields
const contactButton = document.querySelector("#send") as HTMLButtonElement;
const contactinput = document.getElementsByClassName("contact") as HTMLCollectionOf<Element>;
const contactarray = Array.from(contactinput) as Element[];
let contactvalues: string[];

contactarray.forEach((input:HTMLInputElement) => {
  input.addEventListener("keydown", (ev) => {
    if(ev.key == "Enter"){     
      contactButton?.click();
    }
  })
})

// add Eventlistner to all contact input fields
contactButton?.addEventListener("click", () => {
  contactvalues = contactarray.map((input: HTMLInputElement) => input.value.trim());
  contactarray.forEach((input:HTMLInputElement) => {
    input.value = "";
  })
})
let i = 150 / 18;
console.log(Math.ceil(i));

//Packaging (packagingmax)
//'3-Month Desk Calendar' => 560,
//'4-Month Wall Calendar' => 50,
//'Desktop Calendar' => 30,
//'Meeting Calendar' => 18,
//'Week Calendar Small' => 14,
//'Notebook' => 26,
//'Wall Project Planner' => 1,
//'3-Month Desk Calendar + bags' => 560,
//'4-Month Wall Calendar + bags' => 50,
//'Desktop Calendar + bags' => 18,
//'Meeting Calendar + bags' => 18,
//'Week Calendar Small + bags' => 14,
//'Notebook + bags' => 26,
//'Wall Project Planner + bags' => 1

//    calculate how many packages are needed and what the rest in the last package will be.
//    this also calculates how many labels have to be printed for the specific order
// let iterations = orderamount / packaginmax;
// let i = Math.ceil(iterations); 
// while (i >= 1) {
//  productsinp = packagingmax;
//        in the last iteration we calculate how many products fit in the last package
//  if (i == 1){
//    if(iterations%1 == 0){
//      productsinp = packagingmax;
//    }
//    else {
//      productsinp = orderamount % packagingmax
//    }
//  }
//  i--
//
//     add a split counter so we generate only a certain number of labels in one PDF
//
//  split++
//  if (split == 32){
//    generate PDF
//  }
//}
//
//   handle the rest of the split counter after all the iterations have finished and the counter hasnt reached 32
//    
//if (split != 0){
//  genrate PDF with rest amount of split
//}