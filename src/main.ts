import { parse } from "@vanillaes/csv"

const EntryKeys = ["Bestellnummer", "Kundenname", "Kostenstelle", "Produkt", "Stückzahl", "lfdNr", "Bestelldatum", "Firma", "Vorname_Liefer", "Nachname_Liefer", "Straße_Liefer", "PLZ", "Stadt", "Land"] as const

type EntryKeyUnion = typeof EntryKeys[number]

type Order = { [Key in (EntryKeyUnion)]: string }

type HeaderAssignments = { [Key in (EntryKeyUnion)]: number }

const PACKAGE_AMOUNTS = {
  'Wandkalender': 28,
  '3-Month Desk Calendar': 560,
  '4-Month Wall Calendar': 50,
  'Desktop Calendar': 30,
  'Meeting Calendar': 18,
  'Week Calendar Small': 14,
  'Notebook': 26,
  'Wall Project Planner': 1,
  '3-Month Desk Calendar + bags': 560,
  '4-Month Wall Calendar + bags': 50,
  'Desktop Calendar + bags': 18,
  'Meeting Calendar + bags': 18,
  'Week Calendar Small + bags': 14,
  'Notebook + bags': 26,
  'Wall Project Planner + bags': 1
} as const


const delPreviewElem = document.querySelector<HTMLIFrameElement>("#delPreview")
const labelPreviewElem = document.querySelector<HTMLIFrameElement>("#labelPreview")
const form = document.querySelector("form")
const uploadFile = document.querySelector<HTMLInputElement>("#upload")
const deliveryPrintButton = document.querySelector("#deliveryprint") as HTMLButtonElement;
const labelPrintButton = document.querySelector("#labelprint") as HTMLButtonElement;
const contactNameInput = document.getElementById("contactname") as HTMLInputElement;
const contactPhoneInput = document.getElementById("contactnumber") as HTMLInputElement;
const contactMailInput = document.getElementById("contactmail") as HTMLInputElement;

let entries: string[][]

async function handleCSVupload(event) {
  const uploadElem = event.target as HTMLInputElement
  const file = uploadElem.files[0]
  const csvtext = await file.text()
  const parsed: Array<string[]> = parse(csvtext)
  const headers = parsed[0]
  entries = parsed.slice(1)

  // too make header appear after upload
  const headerElement = document.getElementById("header");
  if (headerElement) {
    headerElement.style.display = "";
  }

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

  renderDeliveryNote();
  renderLabel();
}

uploadFile.addEventListener("change", handleCSVupload)
contactNameInput.addEventListener("change", renderDeliveryNote)
contactPhoneInput.addEventListener("change", renderDeliveryNote)
contactMailInput.addEventListener("change", renderDeliveryNote)
deliveryPrintButton.addEventListener("click", () => delPreviewElem.contentWindow.print())
labelPrintButton.addEventListener("click", () => labelPreviewElem.contentWindow.print())

function handleHeaderAssignmentChange() {
  renderDeliveryNote();
  renderLabel();
}

async function renderDeliveryNote() {
  const newData = format_data(entries, get_header_assignments());
  // @ts-expect-error ts doesn't know about groupBy yet. It exists tho, I swear
  const groupedOrders: Record<string, Order[]> = Object.groupBy(newData, (item: Order) => item.Bestellnummer)


  for (const orders of Object.values(groupedOrders)) {
    const res = await fetch("assets/deliverynote.html");
    const template = await res.text();

    const rows = orders.map(o =>
      '<tr class="c22"><td class="c14" colspan="1" rowspan="1"><ul class="c18 lst-kix_list_1-0 start"><li class="c1 c19"><span class="c2">{{Bezeichnung}}</span></li></ul></td><td class="c13" colspan="1" rowspan="1"><p class="c1"><span class="c2">&nbsp;&nbsp;&nbsp;{{Stueckzahl}}</span></p></td></tr>'
        .replace("{{Bezeichnung}}", o.Produkt)
        .replace("{{Stueckzahl}}", o.Stückzahl)
    )

    delPreviewElem.srcdoc = template
      .replace("{{Ansprechpartner}}", contactNameInput.value)
      .replace("{{Ansprechpartner Nummer}}", contactPhoneInput.value)
      .replace("{{Ansprechpartner Email}}", contactMailInput.value)
      .replace("{{Firmenname Lieferadresse}}", orders[0].Firma)
      .replace("{{Vorname Lieferadresse}}", orders[0].Vorname_Liefer)
      .replace("{{Nachname Lieferadresse}}", orders[0].Nachname_Liefer)
      .replace("{{Strasse Lieferadresse}}", orders[0].Straße_Liefer)
      .replace("{{PLZ Lieferadresse}}", orders[0].PLZ)
      .replace("{{Stadt Lieferadresse}}", orders[0].Stadt)
      .replace("{{Land Lieferadresse}}", orders[0].Land)
      .replace("{{Bestellnummer}}", orders[0].Bestellnummer)
      .replace("{{Kostenstelle}}", orders[0].Kostenstelle)
      .replace("{{Bestelldatum}}", orders[0].Bestelldatum)
      .replace("{{rows}}", rows.join("\n"))
  }
};

async function renderLabel() {
  const newData = format_data(entries, get_header_assignments());
  const gridContainerTemplate = await fetch("assets/grid.html").then(res => res.text());
  const gridCellRes = await fetch("assets/gridCell.html").then(res => res.text());
  const gridCellTemplate = (new DOMParser()).parseFromString(gridCellRes, "text/html").querySelector("template")
  const cells: string[] = []
  for (const label_data_entry of newData) {
    const cell = (gridCellTemplate.content.cloneNode(true) as DocumentFragment).querySelector("article")
    const packmax = PACKAGE_AMOUNTS[label_data_entry.Produkt]
    const fullpack = Math.floor(+label_data_entry.Stückzahl / packmax)
    const leftover = +label_data_entry.Stückzahl % packmax

    // add packing calculation for labels
    cell.querySelector("[data-field=packaging]").textContent = packmax;
    cell.querySelector("[data-field=id]").textContent = label_data_entry.Bestellnummer
    cell.querySelector("[data-field=customer]").textContent = label_data_entry.Kundenname
    cell.querySelector("[data-field=company]").textContent = label_data_entry.Firma
    cell.querySelector("[data-field=product]").textContent = label_data_entry.Produkt
    cell.querySelector("[data-field=num]").textContent = label_data_entry.lfdNr
    // for loop: push full pack cells 
    // if leftover > 0: push extra cells with adjusted package amount
    for (let i = 0; i < fullpack; i++) {
      cells.push(cell.outerHTML)
    }
    if (leftover > 0) {
      cell.querySelector("[data-field=packaging]").textContent = leftover.toString();
      cells.push(cell.outerHTML);
    }
  }

  const cellsHtml = cells.join('\n')

  labelPreviewElem.srcdoc = gridContainerTemplate.replace("{{cells}}", cellsHtml)
}


function format_data(csv_entries: string[][], header_assignments: Partial<HeaderAssignments>): Order[] {
  return csv_entries.map((entry) => {
    const formattedEntry: Order = {} as Order;
    for (const key in header_assignments) {
      if (header_assignments.hasOwnProperty(key)) {
        //entry = row of CSV data | [header_assignments[key]] = column index
        //entry[header_assignments[key]] = retrive value from corrosponding column in CSV data
        //assign retrived value to key in formattedEntry object
        formattedEntry[key] = entry[header_assignments[key]].trim();
      }
    }
    return formattedEntry;
  });
}

function get_header_assignments() {
  const headerassignments: Partial<HeaderAssignments> = {}
  const selectElems = form.querySelectorAll("select")
  selectElems.forEach(selectelem => {
    headerassignments[selectelem.id] = +selectelem.value
  })
  return headerassignments
}
