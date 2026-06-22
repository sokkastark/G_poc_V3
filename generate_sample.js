import XLSX from 'xlsx';

// Sample ENS (Event Notification System) report data.
// Phone numbers use the real-world US format: (NXX) NXX-XXXX
// The WorkflowEngine strips all non-digit characters so any format works.
const data = [
  {
    "Patient ID":      "MRN-849",
    "First Name":      "Jonathan",
    "Last Name":       "Miller",
    "DOB":             "1980-04-12",
    "Sex":             "M",
    "Event Type":      "Discharge",
    "Encounter Class": "Inpatient",
    "Discharge Date":  new Date().toISOString().slice(0, 10),
    "Practice Name":   "Valley Health Center",
    "PCP":             "Dr. Sarah Smith",
    "Cell Phone":      "(813) 767-1412",
    "Home Phone":      "(813) 555-9876",
    "Work Phone":      ""
  },
  {
    "Patient ID":      "MRN-391",
    "First Name":      "Sarah",
    "Last Name":       "Connor",
    "DOB":             "1965-11-10",
    "Sex":             "F",
    "Event Type":      "Discharge",
    "Encounter Class": "Inpatient",
    "Discharge Date":  new Date().toISOString().slice(0, 10),
    "Practice Name":   "Apex Medical Group",
    "PCP":             "Dr. Marcus Brown",
    "Cell Phone":      "",
    "Home Phone":      "(727) 800-0143",
    "Work Phone":      ""
  },
  {
    "Patient ID":      "MRN-512",
    "First Name":      "Marcus",
    "Last Name":       "Watney",
    "DOB":             "1975-03-22",
    "Sex":             "M",
    "Event Type":      "Discharge",
    "Encounter Class": "Inpatient",
    "Discharge Date":  new Date().toISOString().slice(0, 10),
    "Practice Name":   "Bay Area Health",
    "PCP":             "Dr. Elena Rostova",
    "Cell Phone":      "(407) 303-4920",
    "Home Phone":      "",
    "Work Phone":      ""
  },
  {
    "Patient ID":      "MRN-774",
    "First Name":      "Diana",
    "Last Name":       "Prince",
    "DOB":             "1990-07-04",
    "Sex":             "F",
    "Event Type":      "End Visit",
    "Encounter Class": "Inpatient",
    "Discharge Date":  new Date().toISOString().slice(0, 10),
    "Practice Name":   "Sunrise Medical Center",
    "PCP":             "Dr. Sarah Smith",
    "Cell Phone":      "(954) 444-5555",
    "Home Phone":      "",
    "Work Phone":      "(954) 444-9900"
  }
];

const worksheet = XLSX.utils.json_to_sheet(data);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "ENS_Report");
XLSX.writeFile(workbook, "sample.xlsx");
console.log("sample.xlsx generated successfully with (NXX) NXX-XXXX phone format.");
