import XLSX from 'xlsx';

const data = [
  {
    "Patient ID": "MRN-849",
    "First Name": "Jonathan",
    "Last Name": "Miller",
    "DOB": "1980-04-12",
    "Sex": "M",
    "Event Type": "Discharge",
    "Encounter Class": "Inpatient",
    "Discharge Date": new Date().toISOString().slice(0, 10),
    "Practice Name": "Valley Health Center",
    "Cell Phone": "5551234567",
    "Home Phone": "5559876543",
    "Work Phone": ""
  },
  {
    "Patient ID": "MRN-391",
    "First Name": "Sarah",
    "Last Name": "Connor",
    "DOB": "1965-11-10",
    "Sex": "F",
    "Event Type": "Discharge",
    "Encounter Class": "Inpatient",
    "Discharge Date": new Date().toISOString().slice(0, 10),
    "Practice Name": "Apex Medical Group",
    "Cell Phone": "",
    "Home Phone": "5558000143",
    "Work Phone": ""
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "ENS_Report");
XLSX.writeFile(workbook, "sample.xlsx");
console.log("sample.xlsx generated successfully.");
